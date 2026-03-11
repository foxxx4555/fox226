-- 20260312_FORCE_WALLET_SYNC.sql
-- يصلح رصيد محفظة الشاحن مباشرة بعد الاعتماد
-- شغّله على Supabase SQL Editor بعد الاعتماد

-- 1. حذف كل النسخ القديمة من الدالة
DROP FUNCTION IF EXISTS public.handle_shipper_payment_approval(TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.handle_shipper_payment_approval(UUID, TEXT, TEXT);

-- 2. نسخة نهائية آمنة وبسيطة
CREATE OR REPLACE FUNCTION public.handle_shipper_payment_approval(
    p_payment_id TEXT,
    p_status TEXT,
    p_admin_notes TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_payment     RECORD;
    v_wallet_id   UUID;
    v_new_balance NUMERIC;
BEGIN
    -- جلب الدفعة
    SELECT * INTO v_payment
    FROM public.shipper_payments
    WHERE id::TEXT = p_payment_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'الدفعة غير موجودة: %', p_payment_id;
    END IF;

    -- تحديث حالة الدفعة
    UPDATE public.shipper_payments
    SET status      = p_status,
        admin_notes = COALESCE(p_admin_notes, admin_notes),
        updated_at  = NOW()
    WHERE id::TEXT = p_payment_id;

    -- عند الاعتماد فقط → تحديث الرصيد مباشرة
    IF p_status = 'approved' THEN

        -- جلب محفظة الشاحن
        SELECT wallet_id INTO v_wallet_id
        FROM public.wallets
        WHERE user_id = v_payment.shipper_id AND user_type = 'shipper'
        LIMIT 1;

        -- إنشاء المحفظة لو مش موجودة
        IF v_wallet_id IS NULL THEN
            INSERT INTO public.wallets (user_id, user_type, balance)
            VALUES (v_payment.shipper_id, 'shipper', 0)
            RETURNING wallet_id INTO v_wallet_id;
        END IF;

        -- تسجيل معاملة ائتمانية
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

        -- احسب الرصيد الجديد من جديد من كل المعاملات (طريقة مضمونة)
        SELECT
            COALESCE(SUM(CASE WHEN type='credit' THEN amount ELSE 0 END), 0) -
            COALESCE(SUM(CASE WHEN type='debit'  THEN amount ELSE 0 END), 0)
        INTO v_new_balance
        FROM public.financial_transactions
        WHERE wallet_id = v_wallet_id;

        -- تحديث الرصيد مباشرة
        UPDATE public.wallets
        SET balance    = v_new_balance,
            updated_at = NOW()
        WHERE wallet_id = v_wallet_id;

        -- تحديث الفاتورة
        UPDATE public.invoices
        SET amount_paid = COALESCE(amount_paid, 0) + v_payment.amount
        WHERE id = (
            SELECT id FROM public.invoices
            WHERE shipment_id = v_payment.shipment_id
            ORDER BY created_at DESC LIMIT 1
        );

    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.handle_shipper_payment_approval(TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_shipper_payment_approval(TEXT, TEXT, TEXT) TO service_role;

-- 3. مزامنة فورية لكل المحافظ دلوقتي
UPDATE public.wallets w
SET balance = (
    COALESCE((SELECT SUM(amount) FROM public.financial_transactions WHERE wallet_id = w.wallet_id AND type = 'credit'), 0) -
    COALESCE((SELECT SUM(amount) FROM public.financial_transactions WHERE wallet_id = w.wallet_id AND type = 'debit'),  0)
);

NOTIFY pgrst, 'reload schema';
