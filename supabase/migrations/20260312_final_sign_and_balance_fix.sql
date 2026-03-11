-- 20260312_final_sign_and_balance_fix.sql
-- CRITICAL FIX: Correcting the sign of wallet balance calculations and fixing debt settlement logic.

-- 1. Fix the wallet balance calculation logic
-- For Shippers: Balance = Total Debts (debit) - Total Payments (credit)
-- A positive balance means the shipper OWES money.
CREATE OR REPLACE FUNCTION public.sync_all_wallets()
RETURNS VOID AS $$
BEGIN
    UPDATE public.wallets w
    SET balance = (
        SELECT COALESCE(SUM(CASE WHEN type = 'debit' THEN amount ELSE -amount END), 0)
        FROM public.financial_transactions
        WHERE wallet_id = w.wallet_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Fix the handle_shipper_payment_approval function
-- Ensure it correctly updates the invoice and triggers a wallet sync.
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

    -- If approved, process the credit
    IF p_status = 'approved' THEN
        SELECT wallet_id INTO v_wallet_id
        FROM public.wallets
        WHERE user_id = v_shipper_id AND user_type = 'shipper';

        IF v_wallet_id IS NOT NULL THEN
            -- Add CREDIT (reduces debt)
            INSERT INTO public.financial_transactions (
                wallet_id, shipment_id, amount, type, transaction_type, status, description
            ) VALUES (
                v_wallet_id, v_shipment_id, v_amount, 'credit', 'deposit', 'completed', 
                'اعتماد سداد: ' || COALESCE(p_admin_notes, 'حوالة بنكية')
            );
            
            -- Update Invoices
            IF v_shipment_id IS NOT NULL THEN
                SELECT invoice_id INTO v_invoice_id FROM public.invoices WHERE shipment_id = v_shipment_id LIMIT 1;
                IF v_invoice_id IS NULL THEN
                    SELECT invoice_id INTO v_invoice_id FROM public.invoice_items WHERE shipment_id = v_shipment_id LIMIT 1;
                END IF;

                IF v_invoice_id IS NOT NULL THEN
                    UPDATE public.invoices
                    SET amount_paid = (SELECT COALESCE(SUM(amount), 0) FROM public.shipper_payments WHERE shipment_id = v_shipment_id AND status = 'approved'),
                        balance = total_amount - (SELECT COALESCE(SUM(amount) , 0) FROM public.shipper_payments WHERE shipment_id = v_shipment_id AND status = 'approved'),
                        payment_status = CASE 
                            WHEN (total_amount - (SELECT COALESCE(SUM(amount), 0) FROM public.shipper_payments WHERE shipment_id = v_shipment_id AND status = 'approved')) <= 0 THEN 'paid' 
                            ELSE 'pending' 
                        END
                    WHERE invoice_id = v_invoice_id;
                END IF;
            END IF;

            -- Trigger global wallet sync
            PERFORM public.sync_all_wallets();
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Correct the clear_settled_debts function (STOP it from adding credits)
CREATE OR REPLACE FUNCTION public.clear_settled_debts(p_wallet_id UUID, p_amount DECIMAL)
RETURNS VOID AS $$
BEGIN
    -- This function was potentially duplicating credits. 
    -- Wallet balance is now derived directly from transactions.
    -- We just need to ensure transactions are correct.
    NULL; 
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Initial Global Sync (Perform this once)
SELECT public.sync_all_wallets();

-- 5. Fix any NULL types in transactions
UPDATE public.financial_transactions SET type = 'credit' WHERE type IS NULL AND transaction_type = 'deposit';
UPDATE public.financial_transactions SET type = 'debit' WHERE type IS NULL AND transaction_type = 'debt';

-- Re-sync everything one last time
SELECT public.sync_all_wallets();
