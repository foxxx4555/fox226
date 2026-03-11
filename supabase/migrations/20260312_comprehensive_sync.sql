-- ======================================================

-- 0. Ensure unique constraint on shipment_id for invoices
-- This is required for the ON CONFLICT clause to work.
-- First, clean up any existing duplicates (keep only one per shipment)
DELETE FROM public.invoices a USING public.invoices b
WHERE a.invoice_id < b.invoice_id AND a.shipment_id = b.shipment_id;

ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_shipment_id_key;
ALTER TABLE public.invoices ADD CONSTRAINT invoices_shipment_id_key UNIQUE (shipment_id);

-- 1. Enhanced Invoice Generation Trigger
-- This ensures that whenever a shipment is settled (debt created), an invoice is also created if it doesn't exist.
CREATE OR REPLACE FUNCTION public.sync_invoice_on_debt()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if it's a debt transaction for a shipment
    IF NEW.transaction_type = 'debt' AND NEW.shipment_id IS NOT NULL THEN
        -- Insert invoice if it doesn't exist
        INSERT INTO public.invoices (shipment_id, shipper_id, amount, vat, total_amount, payment_status, balance)
        SELECT 
            NEW.shipment_id, 
            w.user_id, 
            NEW.amount / 1.15, 
            NEW.amount - (NEW.amount / 1.15), 
            NEW.amount, 
            'unpaid',
            NEW.amount
        FROM public.wallets w
        WHERE w.wallet_id = NEW.wallet_id
        ON CONFLICT (shipment_id) DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_invoice_on_debt ON public.financial_transactions;
CREATE TRIGGER trg_sync_invoice_on_debt
    AFTER INSERT ON public.financial_transactions
    FOR EACH ROW EXECUTE FUNCTION public.sync_invoice_on_debt();

-- 2. Retrospective Fix: Create missing invoices for all existing debts
INSERT INTO public.invoices (shipment_id, shipper_id, amount, vat, total_amount, payment_status, balance)
SELECT 
    ft.shipment_id, 
    w.user_id, 
    ft.amount / 1.15, 
    ft.amount - (ft.amount / 1.15), 
    ft.amount, 
    'unpaid',
    ft.amount
FROM public.financial_transactions ft
JOIN public.wallets w ON ft.wallet_id = w.wallet_id
WHERE ft.transaction_type = 'debt' 
AND ft.shipment_id IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM public.invoices i WHERE i.shipment_id = ft.shipment_id)
ON CONFLICT (shipment_id) DO NOTHING;

-- 3. Enhanced Approval RPC
-- Now handle the case where multiple payments might apply to the same invoice/shipment
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
    -- 1. Get payment details
    SELECT shipper_id, amount, shipment_id INTO v_shipper_id, v_amount, v_shipment_id
    FROM public.shipper_payments
    WHERE id = p_payment_id;

    -- 2. Update payment receipt status
    UPDATE public.shipper_payments
    SET status = p_status, 
        admin_notes = p_admin_notes,
        updated_at = NOW(),
        processed_at = NOW()
    WHERE id = p_payment_id;

    -- 3. If approved, process financial flows
    IF p_status = 'approved' THEN
        -- Get Wallet
        SELECT wallet_id INTO v_wallet_id
        FROM public.wallets
        WHERE user_id = v_shipper_id AND user_type = 'shipper';

        IF v_wallet_id IS NOT NULL THEN
            -- Add Credit Transaction (this updates wallet balance automatically via trigger)
            INSERT INTO public.financial_transactions (wallet_id, shipment_id, amount, type, transaction_type, status, description)
            VALUES (v_wallet_id, v_shipment_id, v_amount, 'credit', 'deposit', 'completed', 'Approved Receipt Payment: ' || COALESCE(p_admin_notes, 'Payment'));
            
            -- Update linked invoice if shipment_id is provided
            IF v_shipment_id IS NOT NULL THEN
                -- Try to find invoice
                SELECT invoice_id INTO v_invoice_id FROM public.invoices WHERE shipment_id = v_shipment_id LIMIT 1;
                
                -- If found, update it
                IF v_invoice_id IS NOT NULL THEN
                    UPDATE public.invoices
                    SET amount_paid = amount_paid + v_amount,
                        balance = total_amount - (amount_paid + v_amount),
                        payment_status = CASE 
                            WHEN (total_amount - (amount_paid + v_amount)) <= 0 THEN 'paid' 
                            ELSE 'partial' 
                        END
                    WHERE invoice_id = v_invoice_id;
                END IF;
            END IF;
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Sync Existing Paid Amounts
-- Recalculate amount_paid for all invoices based on approved payments
UPDATE public.invoices i
SET 
    amount_paid = COALESCE((
        SELECT SUM(amount) 
        FROM public.shipper_payments sp 
        WHERE sp.shipment_id = i.shipment_id 
        AND sp.status = 'approved'
    ), 0),
    balance = i.total_amount - COALESCE((
        SELECT SUM(amount) 
        FROM public.shipper_payments sp 
        WHERE sp.shipment_id = i.shipment_id 
        AND sp.status = 'approved'
    ), 0),
    payment_status = CASE 
        WHEN (i.total_amount - COALESCE((SELECT SUM(amount) FROM public.shipper_payments sp WHERE sp.shipment_id = i.shipment_id AND sp.status = 'approved'), 0)) <= 0 THEN 'paid'
        WHEN COALESCE((SELECT SUM(amount) FROM public.shipper_payments sp WHERE sp.shipment_id = i.shipment_id AND sp.status = 'approved'), 0) > 0 THEN 'partial'
        ELSE 'unpaid'
    END;

-- Reload Schema
NOTIFY pgrst, 'reload schema';
