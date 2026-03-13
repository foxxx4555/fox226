-- ======================================================
-- COMPREHENSIVE FINANCIAL & SHIPMENT LOGIC FIX (v2)
-- Fixing: Double Booking, Accept Load RLS, Debt Sync, and Constraints
-- ======================================================

-- 1. Atomic Shipment Acceptance (Bypasses RLS issues for drivers)
CREATE OR REPLACE FUNCTION public.accept_load_atomic(
    p_load_id UUID,
    p_driver_id UUID,
    p_owner_id UUID,
    p_price NUMERIC
)
RETURNS VOID AS $$
BEGIN
    SET search_path = public;

    -- 1. Check if load is still available
    IF NOT EXISTS (SELECT 1 FROM public.loads WHERE id = p_load_id AND status = 'available' FOR UPDATE) THEN
        RAISE EXCEPTION 'This load is no longer available';
    END IF;

    -- 2. Update load status and driver
    UPDATE public.loads
    SET 
        status = 'in_progress',
        driver_id = p_driver_id,
        price = p_price,
        updated_at = NOW()
    WHERE id = p_load_id;

    -- 3. Create initial financial record if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM public.shipment_finances WHERE shipment_id = p_load_id) THEN
        INSERT INTO public.shipment_finances (
            shipment_id, 
            shipper_id, 
            carrier_id, 
            shipment_price, 
            carrier_amount, 
            platform_commission,
            payment_status,
            settlement_status
        ) VALUES (
            p_load_id,
            p_owner_id,
            p_driver_id,
            p_price,
            p_price * 0.90, -- 10% commission
            p_price * 0.10,
            'pending',
            'pending'
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Atomic Settlement (Double-Booking Prevention)
CREATE OR REPLACE FUNCTION public.approve_carrier_earnings(p_shipment_id UUID)
RETURNS VOID AS $$
DECLARE
    v_carrier_id UUID;
    v_carrier_wallet_id UUID;
    v_amount DECIMAL;
    v_status TEXT;
BEGIN
    SET search_path = public;

    -- Lock and check status
    SELECT carrier_id, carrier_amount, settlement_status 
    INTO v_carrier_id, v_amount, v_status
    FROM public.shipment_finances
    WHERE shipment_id = p_shipment_id
    FOR UPDATE;

    IF v_carrier_id IS NULL THEN
        RAISE EXCEPTION 'Finance record not found';
    END IF;

    IF v_status = 'settled' THEN
        RETURN; 
    END IF;

    SELECT wallet_id INTO v_carrier_wallet_id FROM public.wallets WHERE user_id = v_carrier_id AND user_type = 'carrier';

    IF v_carrier_wallet_id IS NOT NULL THEN
        -- Atomic status update (Trigger handles the balance)
        UPDATE public.financial_transactions
        SET status = 'completed'
        WHERE shipment_id = p_shipment_id 
          AND wallet_id = v_carrier_wallet_id 
          AND status = 'pending';

        UPDATE public.shipment_finances SET settlement_status = 'settled' WHERE shipment_id = p_shipment_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Unified Shipper Financial Summary (Debt Sync)
CREATE OR REPLACE FUNCTION public.get_shipper_financial_summary(p_shipper_ids UUID[])
RETURNS TABLE (
    shipper_id UUID,
    total_paid NUMERIC,
    total_debt NUMERIC,
    net_balance NUMERIC,
    remaining_debt NUMERIC
) AS $$
DECLARE
    sid UUID;
    v_wallet_id UUID;
BEGIN
    FOR sid IN SELECT unnest(p_shipper_ids) LOOP
        SELECT wallet_id INTO v_wallet_id FROM public.wallets WHERE user_id = sid AND user_type = 'shipper' LIMIT 1;

        RETURN QUERY
        WITH 
        credit_sum AS (
            SELECT COALESCE(SUM(amount), 0) as val 
            FROM public.financial_transactions 
            WHERE wallet_id = v_wallet_id AND type = 'credit' AND status = 'completed'
        ),
        debit_sum AS (
            SELECT COALESCE(SUM(amount), 0) as val 
            FROM public.financial_transactions 
            WHERE wallet_id = v_wallet_id AND type = 'debit' AND status = 'completed'
        )
        SELECT 
            sid as shipper_id,
            credit_sum.val::NUMERIC as total_paid,
            debit_sum.val::NUMERIC as total_debt,
            (credit_sum.val - debit_sum.val)::NUMERIC as net_balance,
            GREATEST(0, debit_sum.val - credit_sum.val)::NUMERIC as remaining_debt
        FROM credit_sum, debit_sum;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Server-side Withdrawal Validation (Point #2)
-- Adding a trigger to validate amount before insert
CREATE OR REPLACE FUNCTION public.validate_withdrawal_amount()
RETURNS TRIGGER AS $$
DECLARE
    v_balance NUMERIC;
BEGIN
    SELECT balance INTO v_balance FROM public.wallets WHERE wallet_id = NEW.wallet_id;
    
    IF v_balance < NEW.amount THEN
        RAISE EXCEPTION 'Insufficient balance for withdrawal';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_withdrawal ON public.withdrawal_requests;
CREATE TRIGGER trg_validate_withdrawal
BEFORE INSERT ON public.withdrawal_requests
FOR EACH ROW EXECUTE FUNCTION public.validate_withdrawal_amount();

-- 5. Permissions
GRANT EXECUTE ON FUNCTION public.accept_load_atomic(UUID, UUID, UUID, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_carrier_earnings(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_shipper_financial_summary(UUID[]) TO authenticated;
