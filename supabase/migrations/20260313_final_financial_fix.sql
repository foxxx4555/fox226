-- ======================================================
-- FINAL FINANCIAL FIX: Commission, VAT, and Double-Booking Prevention
-- ======================================================

-- 1. Ensure platform wallet exists
DO $$
DECLARE
    v_admin_id UUID;
BEGIN
    SELECT user_id INTO v_admin_id FROM public.user_roles WHERE role IN ('admin', 'super_admin', 'super_admin') LIMIT 1;
    
    IF v_admin_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.wallets WHERE user_type = 'platform') THEN
        INSERT INTO public.wallets (user_id, user_type, balance, frozen_balance)
        VALUES (v_admin_id, 'platform', 0, 0);
    END IF;
END $$;

-- 2. Fixed accept_load_atomic: Correctly calculate commission from Gross Price
CREATE OR REPLACE FUNCTION public.accept_load_atomic(
    p_load_id UUID,
    p_driver_id UUID,
    p_owner_id UUID,
    p_price NUMERIC
)
RETURNS VOID AS $$
DECLARE
    v_pricing_config JSONB;
    v_commission_rate NUMERIC;
    v_vat_rate NUMERIC;
    v_subtotal NUMERIC;
    v_base_price NUMERIC;
    v_platform_comm NUMERIC;
    v_carrier_amount NUMERIC;
BEGIN
    SET search_path = public;

    -- 1. Check if load is still available
    IF NOT EXISTS (SELECT 1 FROM public.loads WHERE id = p_load_id AND status = 'available' FOR UPDATE) THEN
        RAISE EXCEPTION 'This load is no longer available';
    END IF;

    -- 2. Get Pricing Config from system_settings
    SELECT data INTO v_pricing_config FROM public.system_settings WHERE id = 'pricing_config';
    
    v_commission_rate := COALESCE((v_pricing_config->>'commission')::NUMERIC, 10);
    v_vat_rate := COALESCE((v_pricing_config->>'vat_rate')::NUMERIC, 15);
    
    IF v_commission_rate = 0 THEN v_commission_rate := 10; END IF;
    IF v_vat_rate = 0 THEN v_vat_rate := 15; END IF;

    -- 3. Back-calculate from Gross Price (p_price includes VAT)
    -- Total = Base * (1 + Comm/100) * (1 + VAT/100)
    v_subtotal := p_price / (1 + v_vat_rate / 100);
    v_base_price := v_subtotal / (1 + v_commission_rate / 100);
    
    v_carrier_amount := ROUND(v_base_price, 2);
    v_platform_comm := ROUND(p_price - v_carrier_amount, 2);

    -- 4. Update load status and driver
    UPDATE public.loads
    SET 
        status = 'in_progress',
        driver_id = p_driver_id,
        price = p_price,
        updated_at = NOW()
    WHERE id = p_load_id;

    -- 5. Create/Update financial record
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
        v_carrier_amount,
        v_platform_comm,
        'pending',
        'pending'
    )
    ON CONFLICT (shipment_id) DO UPDATE SET
        carrier_id = EXCLUDED.carrier_id,
        shipment_price = EXCLUDED.shipment_price,
        carrier_amount = EXCLUDED.carrier_amount,
        platform_commission = EXCLUDED.platform_commission,
        settlement_status = 'pending';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Clean approve_carrier_earnings: REMOVE manual balance updates (rely on trigger)
CREATE OR REPLACE FUNCTION public.approve_carrier_earnings(p_shipment_id UUID)
RETURNS VOID AS $$
DECLARE
    v_carrier_id UUID;
    v_carrier_wallet_id UUID;
    v_status TEXT;
BEGIN
    SET search_path = public;

    -- Lock the finance record
    SELECT carrier_id, settlement_status 
    INTO v_carrier_id, v_status
    FROM public.shipment_finances
    WHERE shipment_id = p_shipment_id
    FOR UPDATE;

    IF v_carrier_id IS NULL THEN
        RAISE EXCEPTION 'Finance record not found for this shipment';
    END IF;

    -- If already settled, do nothing to avoid double triggers
    IF v_status = 'settled' THEN
        RETURN;
    END IF;

    -- Get carrier wallet
    SELECT wallet_id INTO v_carrier_wallet_id FROM public.wallets WHERE user_id = v_carrier_id AND user_type = 'carrier' LIMIT 1;

    IF v_carrier_wallet_id IS NULL THEN
        RAISE EXCEPTION 'Carrier wallet not found';
    END IF;

    -- Update TRANSACTION status - This triggers the wallet balance update via update_wallet_balance_v2
    UPDATE public.financial_transactions
    SET status = 'completed'
    WHERE shipment_id = p_shipment_id 
      AND wallet_id = v_carrier_wallet_id 
      AND status = 'pending';

    -- Update shipment finance status
    UPDATE public.shipment_finances 
    SET settlement_status = 'settled' 
    WHERE shipment_id = p_shipment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Fix total_commissions calculation in get_admin_stats (Optional but helpful)
-- If needed, can be done later.

-- 5. Ensure the trigger is active and correct (Redundant but safe)
DROP TRIGGER IF EXISTS on_financial_transaction_v2 ON public.financial_transactions;
CREATE TRIGGER on_financial_transaction_v2
    AFTER INSERT OR UPDATE ON public.financial_transactions
    FOR EACH ROW EXECUTE FUNCTION public.update_wallet_balance_v2();

NOTIFY pgrst, 'reload schema';
