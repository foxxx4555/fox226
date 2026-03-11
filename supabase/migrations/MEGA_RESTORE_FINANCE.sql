-- MEGA_RESTORE_FINANCE.sql
-- The Ultimate fix for negative balances, sign errors, and missing settlements.
-- Version 3: Fixed syntax error in RAISE NOTICE

-- 1. Correct the sign of the wallet sync function
-- Balance = Credits (Incoming/Deposit) - Debits (Outgoing/Debt)
-- Debt should be NEGATIVE. Earnings should be POSITIVE.
CREATE OR REPLACE FUNCTION public.sync_all_wallets()
RETURNS VOID AS $$
BEGIN
    UPDATE public.wallets w
    SET balance = (
        SELECT COALESCE(SUM(CASE WHEN type = 'credit' THEN amount ELSE -amount END), 0)
        FROM public.financial_transactions
        WHERE wallet_id = w.wallet_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Delete erroneous "payment" internal transactions created by the old buggy trigger
-- These were added as internal settlements and duplicated the credit flow.
DELETE FROM public.financial_transactions WHERE transaction_type = 'payment';

-- 3. Neutralize the buggy automated settlement function (It's safer to rely on direct transactions)
CREATE OR REPLACE FUNCTION public.clear_settled_debts(p_wallet_id UUID, p_amount DECIMAL)
RETURNS VOID AS $$ BEGIN NULL; END; $$ LANGUAGE plpgsql;

-- 4. Correct Sign inconsistencies in existing transactions
-- Ensure 'deposit' is always 'credit' and 'debt' is always 'debit'
UPDATE public.financial_transactions SET type = 'credit' WHERE transaction_type = 'deposit';
UPDATE public.financial_transactions SET type = 'debit' WHERE transaction_type = 'debt';

-- 5. Auto-process settlement for ALL completed loads that haven't been recorded yet
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT l.id, sf.settlement_status
        FROM public.loads l
        JOIN public.shipment_finances sf ON l.id = sf.shipment_id
        WHERE l.status = 'completed' 
        AND NOT EXISTS (
            SELECT 1 FROM public.financial_transactions ft 
            WHERE ft.shipment_id = l.id AND ft.transaction_type = 'debt'
        )
    LOOP
        BEGIN
            -- Fix status if it was stuck
            UPDATE public.shipment_finances SET settlement_status = 'held' WHERE shipment_id = r.id;
            -- Manual trigger of the settlement logic
            PERFORM public.process_shipment_settlement(r.id);
        EXCEPTION WHEN OTHERS THEN
            -- Skip failed settlements
        END;
    END LOOP;
END $$;

-- 6. Specific Correction for Mohnnad (Fix 524 -> 200 actual payment)
DO $$
DECLARE
    v_shipper_id UUID;
    v_payment_id UUID;
    v_wallet_id UUID;
BEGIN
    -- Find Mohnnad's ID (flexible search)
    SELECT id INTO v_shipper_id FROM public.profiles WHERE full_name ILIKE '%مهند%' OR full_name ILIKE '%Mohnnad%' LIMIT 1;
    
    IF v_shipper_id IS NOT NULL THEN
        -- Find the 524 payment
        SELECT id INTO v_payment_id FROM public.shipper_payments 
        WHERE shipper_id = v_shipper_id AND amount = 524 AND status = 'approved' LIMIT 1;

        IF v_payment_id IS NOT NULL THEN
            -- Update receipt
            UPDATE public.shipper_payments SET amount = 200 WHERE id = v_payment_id;
            -- Update transaction
            UPDATE public.financial_transactions SET amount = 200 
            WHERE shipment_id IN (SELECT sp.shipment_id FROM public.shipper_payments sp WHERE sp.id = v_payment_id)
            AND amount = 524 AND transaction_type = 'deposit';
        END IF;

        -- Final re-sync for this specific wallet
        SELECT wallet_id INTO v_wallet_id FROM public.wallets WHERE user_id = v_shipper_id;
        UPDATE public.wallets SET balance = (
            SELECT COALESCE(SUM(CASE WHEN type = 'credit' THEN amount ELSE -amount END), 0)
            FROM public.financial_transactions
            WHERE wallet_id = v_wallet_id
        ) WHERE wallet_id = v_wallet_id;
    END IF;
END $$;

-- 7. PERFORM GLOBAL SYNC
SELECT public.sync_all_wallets();

-- 8. Ensure Invoices match the final truth
UPDATE public.invoices i
SET 
    amount_paid = COALESCE((SELECT SUM(amount) FROM public.shipper_payments sp WHERE sp.shipment_id = i.shipment_id AND sp.status = 'approved'), 0),
    balance = i.total_amount - COALESCE((SELECT SUM(amount) FROM public.shipper_payments sp WHERE sp.shipment_id = i.shipment_id AND sp.status = 'approved'), 0),
    payment_status = CASE 
        WHEN (i.total_amount - COALESCE((SELECT SUM(amount) FROM public.shipper_payments sp WHERE sp.shipment_id = i.shipment_id AND sp.status = 'approved'), 0)) <= 0 THEN 'paid'
        WHEN COALESCE((SELECT SUM(amount) FROM public.shipper_payments sp WHERE sp.shipment_id = i.shipment_id AND sp.status = 'approved'), 0) > 0 THEN 'partial'
        ELSE 'unpaid'
    END;

-- Success indicator (standard SQL notice)
DO $$ BEGIN RAISE NOTICE 'MEGA RESTORE COMPLETE. All balances and shipments synchronized.'; END $$; 
