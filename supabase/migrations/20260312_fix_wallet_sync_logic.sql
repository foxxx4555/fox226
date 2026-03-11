-- 20260312_fix_wallet_sync_logic.sql
-- Fixes the wallet balance calculation to properly separate Frozen vs Available funds

-- 1. Unify the handle_shipper_payment_approval function (Safe Version)
CREATE OR REPLACE FUNCTION public.handle_shipper_payment_approval(
    p_payment_id UUID,
    p_status TEXT,
    p_admin_notes TEXT DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
    v_shipper_id UUID;
    v_amount DECIMAL;
    v_shipment_id UUID;
    v_wallet_id UUID;
    v_invoice_id UUID;
BEGIN
    SET search_path = public;

    -- Get payment details
    SELECT shipper_id, amount, shipment_id INTO v_shipper_id, v_amount, v_shipment_id
    FROM public.shipper_payments
    WHERE id = p_payment_id;

    -- Update payment status
    UPDATE public.shipper_payments
    SET status = p_status, 
        admin_notes = p_admin_notes,
        updated_at = NOW()
    WHERE id = p_payment_id;

    -- If approved, credit the shipper's wallet
    IF p_status = 'approved' THEN
        SELECT wallet_id INTO v_wallet_id
        FROM public.wallets
        WHERE user_id = v_shipper_id AND user_type = 'shipper';

        IF v_wallet_id IS NOT NULL THEN
            -- Insert transaction (Automatically updates balance via sync below)
            INSERT INTO public.financial_transactions (wallet_id, shipment_id, amount, type, transaction_type, status, description)
            VALUES (v_wallet_id, v_shipment_id, v_amount, 'credit', 'deposit', 'completed', 'اعتماد حوالة بنكية: ' || COALESCE(p_admin_notes, 'سداد'));
            
            -- Update linked invoice
            IF v_shipment_id IS NOT NULL THEN
                UPDATE public.invoices
                SET amount_paid = (SELECT COALESCE(SUM(amount), 0) FROM public.shipper_payments WHERE shipment_id = v_shipment_id AND status = 'approved'),
                    balance = total_amount - (SELECT COALESCE(SUM(amount), 0) FROM public.shipper_payments WHERE shipment_id = v_shipment_id AND status = 'approved'),
                    payment_status = CASE WHEN (total_amount - (SELECT COALESCE(SUM(amount), 0) FROM public.shipper_payments WHERE shipment_id = v_shipment_id AND status = 'approved')) <= 0 THEN 'paid' ELSE 'pending' END
                WHERE shipment_id = v_shipment_id;
            END IF;
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Correct Universal Balance Sync Logic
-- This is the critical step to separate Frozen from Available
DO $$
DECLARE
    w RECORD;
BEGIN
    FOR w IN SELECT wallet_id, user_type FROM public.wallets LOOP
        -- A. Calculate Available Balance (Only 'completed' transactions)
        UPDATE public.wallets
        SET balance = (
            COALESCE((SELECT SUM(amount) FROM public.financial_transactions WHERE wallet_id = w.wallet_id AND type = 'credit' AND status = 'completed'), 0) -
            COALESCE((SELECT SUM(amount) FROM public.financial_transactions WHERE wallet_id = w.wallet_id AND type = 'debit' AND status = 'completed'), 0)
        )
        WHERE wallet_id = w.wallet_id;

        -- B. Calculate Frozen Balance (Only 'pending' transactions for carriers)
        UPDATE public.wallets
        SET frozen_balance = (
            COALESCE((SELECT SUM(amount) FROM public.financial_transactions WHERE wallet_id = w.wallet_id AND type = 'credit' AND status = 'pending'), 0) -
            COALESCE((SELECT SUM(amount) FROM public.financial_transactions WHERE wallet_id = w.wallet_id AND type = 'debit' AND status = 'pending'), 0)
        )
        WHERE wallet_id = w.wallet_id;
    END LOOP;
END $$;

-- 3. Ensure approve_carrier_earnings uses the same logic
CREATE OR REPLACE FUNCTION public.approve_carrier_earnings(p_shipment_id UUID)
RETURNS VOID AS $$
DECLARE
    v_carrier_id UUID;
    v_carrier_wallet_id UUID;
    v_amount DECIMAL;
BEGIN
    SET search_path = public;

    -- Get carrier and amount
    SELECT carrier_id, carrier_amount INTO v_carrier_id, v_amount
    FROM public.shipment_finances
    WHERE shipment_id = p_shipment_id;

    -- Get wallet
    SELECT wallet_id INTO v_carrier_wallet_id FROM public.wallets WHERE user_id = v_carrier_id AND user_type = 'carrier';

    IF v_carrier_wallet_id IS NOT NULL THEN
        -- Simply mark the transaction as completed
        -- Our sync logic above (or future triggers) will move the balance automatically
        UPDATE public.financial_transactions
        SET status = 'completed'
        WHERE shipment_id = p_shipment_id AND wallet_id = v_carrier_wallet_id AND status = 'pending';

        -- Manually update for immediate effect without waiting for a full sync
        UPDATE public.wallets 
        SET frozen_balance = frozen_balance - v_amount,
            balance = balance + v_amount
        WHERE wallet_id = v_carrier_wallet_id;

        -- Finalize status
        UPDATE public.shipment_finances SET settlement_status = 'settled' WHERE shipment_id = p_shipment_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Reload Schema cache
NOTIFY pgrst, 'reload schema';
