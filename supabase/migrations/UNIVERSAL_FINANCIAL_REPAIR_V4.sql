-- UNIVERSAL_FINANCIAL_REPAIR_V4.sql
-- This script performs a deep-clean and re-sync for all shipper finances.
-- It fixes sign errors, missing debt transactions, and corrects the specific 524->200 error.

DO $$ 
DECLARE
    v_shipper_id UUID;
    v_wallet_id UUID;
    v_r RECORD;
BEGIN
    -- 1. Identify Mohnnad specifically (Fixing the reported case)
    SELECT id INTO v_shipper_id FROM public.profiles 
    WHERE full_name ILIKE '%مهند%' OR full_name ILIKE '%Mohnnad%' 
    ORDER BY created_at DESC LIMIT 1;

    RAISE NOTICE 'Targeting Shipper ID: %', v_shipper_id;

    -- 2. Ensure every shipper has a wallet
    INSERT INTO public.wallets (user_id, user_type, balance, currency)
    SELECT id, 'shipper', 0, 'SAR'
    FROM public.profiles p
    WHERE NOT EXISTS (SELECT 1 FROM public.wallets w WHERE w.user_id = p.id)
    AND EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id AND ur.role = 'shipper');

    -- 3. Delete ANY transaction that is not 'deposit' or 'debt' to avoid noise
    DELETE FROM public.financial_transactions 
    WHERE transaction_type NOT IN ('deposit', 'debt', 'earnings', 'commission')
    AND shipment_id IS NOT NULL;

    -- 4. Correct the 524 -> 200 payment for Mohnnad
    IF v_shipper_id IS NOT NULL THEN
        -- Fix the payment receipt
        UPDATE public.shipper_payments 
        SET amount = 200 
        WHERE shipper_id = v_shipper_id AND amount = 524;

        -- Fix the deposit transaction
        UPDATE public.financial_transactions ft
        SET amount = 200
        FROM public.wallets w
        WHERE ft.wallet_id = w.wallet_id 
        AND w.user_id = v_shipper_id 
        AND ft.amount = 524 
        AND ft.transaction_type = 'deposit';
        
        RAISE NOTICE 'Corrected Mohnnad payment from 524 to 200.';
    END IF;

    -- 5. RE-SETTLE ALL COMPLETED SHIPMENTS
    -- This ensures debt is created for EVERYTHING that is 'completed'
    FOR v_r IN 
        SELECT l.id, l.owner_id, l.price, sf.settlement_status
        FROM public.loads l
        LEFT JOIN public.shipment_finances sf ON l.id = sf.shipment_id
        WHERE l.status = 'completed'
    LOOP
        -- a. Ensure shipment_finances exists
        IF NOT EXISTS (SELECT 1 FROM public.shipment_finances WHERE shipment_id = v_r.id) THEN
            INSERT INTO public.shipment_finances (shipment_id, shipper_id, carrier_id, shipment_price, carrier_amount, platform_commission)
            SELECT l.id, l.owner_id, l.driver_id, l.price, l.price * 0.9, l.price * 0.1
            FROM public.loads l WHERE l.id = v_r.id;
        END IF;

        -- b. Force Debt Transaction if missing
        IF NOT EXISTS (SELECT 1 FROM public.financial_transactions WHERE shipment_id = v_r.id AND transaction_type = 'debt') THEN
            INSERT INTO public.financial_transactions (wallet_id, shipment_id, amount, type, transaction_type, description)
            SELECT w.wallet_id, v_r.id, v_r.price, 'debit', 'debt', 'Shipment Debt: ' || v_r.id
            FROM public.wallets w WHERE w.user_id = v_r.owner_id AND w.user_type = 'shipper';
            
            RAISE NOTICE 'Created missing debt for load %', v_r.id;
        END IF;
    END LOOP;

    -- 6. GLOBAL WALLET SYNC (The "Truth")
    -- Balance = Credits (Incoming/Paid) - Debits (Outgoing/Debt/Usage)
    UPDATE public.wallets w
    SET balance = (
        SELECT COALESCE(SUM(CASE WHEN type = 'credit' THEN amount ELSE -amount END), 0)
        FROM public.financial_transactions
        WHERE wallet_id = w.wallet_id
    );

    RAISE NOTICE 'Global wallet balance sync completed.';

    -- 7. GLOBAL INVOICE SYNC
    UPDATE public.invoices i
    SET 
        amount_paid = (SELECT COALESCE(SUM(amount), 0) FROM public.shipper_payments sp WHERE sp.shipment_id = i.shipment_id AND sp.status = 'approved'),
        balance = total_amount - (SELECT COALESCE(SUM(amount), 0) FROM public.shipper_payments sp WHERE sp.shipment_id = i.shipment_id AND sp.status = 'approved'),
        payment_status = CASE 
            WHEN (total_amount - (SELECT COALESCE(SUM(amount), 0) FROM public.shipper_payments sp WHERE sp.shipment_id = i.shipment_id AND sp.status = 'approved')) <= 0 THEN 'paid'
            WHEN (SELECT COALESCE(SUM(amount), 0) FROM public.shipper_payments sp WHERE sp.shipment_id = i.shipment_id AND sp.status = 'approved') > 0 THEN 'partial'
            ELSE 'unpaid'
        END;

    RAISE NOTICE 'Global invoice sync completed.';

END $$;
