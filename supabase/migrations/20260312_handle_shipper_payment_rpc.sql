-- 20260312_handle_shipper_payment_rpc.sql
-- Creates the RPC that approves a shipper payment and syncs wallet via financial_transactions

CREATE OR REPLACE FUNCTION public.handle_shipper_payment_approval(
    p_payment_id TEXT,
    p_status TEXT,
    p_admin_notes TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_payment   RECORD;
    v_wallet_id UUID;
BEGIN
    -- 1. Fetch the payment
    SELECT * INTO v_payment
    FROM public.shipper_payments
    WHERE id::TEXT = p_payment_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Payment not found: %', p_payment_id;
    END IF;

    -- 2. Update payment status
    UPDATE public.shipper_payments
    SET
        status      = p_status,
        admin_notes = COALESCE(p_admin_notes, admin_notes),
        updated_at  = NOW()
    WHERE id::TEXT = p_payment_id;

    -- 3. Only on approval → record a credit transaction
    IF p_status = 'approved' THEN

        -- Get shipper wallet_id
        SELECT wallet_id INTO v_wallet_id
        FROM public.wallets
        WHERE user_id   = v_payment.shipper_id
          AND user_type = 'shipper'
        LIMIT 1;

        -- Create wallet if missing
        IF v_wallet_id IS NULL THEN
            INSERT INTO public.wallets (user_id, user_type, balance)
            VALUES (v_payment.shipper_id, 'shipper', 0)
            RETURNING wallet_id INTO v_wallet_id;
        END IF;

        -- Insert a credit transaction (wallet trigger handles balance update automatically)
        INSERT INTO public.financial_transactions
            (wallet_id, shipment_id, amount, type, transaction_type, description)
        VALUES (
            v_wallet_id,
            v_payment.shipment_id,
            v_payment.amount,
            'credit',
            'payment',
            COALESCE(p_admin_notes, 'اعتماد دفعة يدوية') || ' - شحنة #' || LEFT(v_payment.shipment_id::TEXT, 8)
        );

        -- Update invoice amount_paid
        UPDATE public.invoices
        SET
            amount_paid = COALESCE(amount_paid, 0) + v_payment.amount,
            updated_at  = NOW()
        WHERE id = (
            SELECT id FROM public.invoices
            WHERE shipment_id = v_payment.shipment_id
            ORDER BY created_at DESC
            LIMIT 1
        );

    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.handle_shipper_payment_approval(TEXT, TEXT, TEXT) TO authenticated;

-- One-time sync: create missing credit transactions for already-approved payments
DO $$
DECLARE
    v_rec       RECORD;
    v_wallet_id UUID;
BEGIN
    FOR v_rec IN
        SELECT sp.*
        FROM public.shipper_payments sp
        WHERE sp.status = 'approved'
          AND NOT EXISTS (
              SELECT 1
              FROM public.financial_transactions ft
              JOIN public.wallets w ON w.wallet_id = ft.wallet_id
              WHERE w.user_id          = sp.shipper_id
                AND ft.transaction_type = 'payment'
                AND ft.shipment_id      = sp.shipment_id
          )
    LOOP
        SELECT wallet_id INTO v_wallet_id
        FROM public.wallets
        WHERE user_id = v_rec.shipper_id AND user_type = 'shipper'
        LIMIT 1;

        IF v_wallet_id IS NOT NULL THEN
            INSERT INTO public.financial_transactions
                (wallet_id, shipment_id, amount, type, transaction_type, description)
            VALUES (
                v_wallet_id,
                v_rec.shipment_id,
                v_rec.amount,
                'credit',
                'payment',
                'مزامنة دفعة معتمدة - شحنة #' || LEFT(v_rec.shipment_id::TEXT, 8)
            );
        END IF;
    END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
