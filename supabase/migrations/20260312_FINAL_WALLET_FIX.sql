-- 20260312_FINAL_WALLET_FIX.sql
-- الحل النهائي: احسب الرصيد الصح من مدفوعات الشاحنين مباشرة
-- شغّل هذا الملف على Supabase SQL Editor

-- 1. حذف كل النسخ المتعارضة من الدالة
DROP FUNCTION IF EXISTS public.handle_shipper_payment_approval(TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.handle_shipper_payment_approval(UUID, TEXT, TEXT);

-- 2. الدالة النهائية - بسيطة وموثوقة
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
    v_payment        RECORD;
    v_wallet_id      UUID;
    v_total_price    NUMERIC := 0;
    v_total_paid     NUMERIC := 0;
    v_remaining      NUMERIC := 0;
BEGIN
    -- جلب بيانات الدفعة
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

    -- عند الاعتماد: تحديث رصيد المحفظة مباشرة
    IF p_status = 'approved' THEN

        -- جلب أو إنشاء المحفظة
        SELECT wallet_id INTO v_wallet_id
        FROM public.wallets
        WHERE user_id = v_payment.shipper_id AND user_type = 'shipper'
        LIMIT 1;

        IF v_wallet_id IS NULL THEN
            INSERT INTO public.wallets (user_id, user_type, balance)
            VALUES (v_payment.shipper_id, 'shipper', 0)
            RETURNING wallet_id INTO v_wallet_id;
        END IF;

        -- احسب إجمالي الديون لهذا الشاحن (من الشحنات)
        SELECT COALESCE(SUM(l.price), 0) INTO v_total_price
        FROM public.loads l
        WHERE l.owner_id = v_payment.shipper_id
          AND l.status = 'completed';

        -- احسب إجمالي المبالغ المسددة (المعتمدة فقط)
        SELECT COALESCE(SUM(sp.amount), 0) INTO v_total_paid
        FROM public.shipper_payments sp
        WHERE sp.shipper_id = v_payment.shipper_id
          AND sp.status = 'approved';

        -- الرصيد = المسدد - الديون (سالب = مديون)
        v_remaining := v_total_paid - v_total_price;

        -- تحديث رصيد المحفظة مباشرة
        UPDATE public.wallets
        SET balance = v_remaining
        WHERE wallet_id = v_wallet_id;

        -- أضف سجل في financial_transactions (بدون status, بدون shipment_id FK)
        BEGIN
            INSERT INTO public.financial_transactions
                (wallet_id, shipment_id, amount, type, transaction_type, description)
            VALUES (
                v_wallet_id,
                v_payment.shipment_id,
                v_payment.amount,
                'credit',
                'payment',
                COALESCE(p_admin_notes, 'اعتماد دفعة') || ' - شحنة #' || LEFT(v_payment.shipment_id::TEXT, 8)
            );
        EXCEPTION WHEN OTHERS THEN
            -- فشل INSERT لا يوقف العملية، الرصيد تحدث مباشرة أعلاه
            NULL;
        END;

    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.handle_shipper_payment_approval(TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_shipper_payment_approval(TEXT, TEXT, TEXT) TO service_role;

-- 3. مزامنة فورية لكل المحافظ الحالية
-- يحسب الرصيد الصح لكل شاحن من الشحنات والمدفوعات الفعلية
DO $$
DECLARE
    v_shipper RECORD;
    v_wallet_id UUID;
    v_total_price NUMERIC;
    v_total_paid NUMERIC;
BEGIN
    FOR v_shipper IN
        SELECT DISTINCT shipper_id FROM public.shipper_payments
    LOOP
        SELECT wallet_id INTO v_wallet_id
        FROM public.wallets
        WHERE user_id = v_shipper.shipper_id AND user_type = 'shipper'
        LIMIT 1;

        IF v_wallet_id IS NOT NULL THEN
            SELECT COALESCE(SUM(price), 0) INTO v_total_price
            FROM public.loads
            WHERE owner_id = v_shipper.shipper_id AND status = 'completed';

            SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
            FROM public.shipper_payments
            WHERE shipper_id = v_shipper.shipper_id AND status = 'approved';

            UPDATE public.wallets
            SET balance = v_total_paid - v_total_price
            WHERE wallet_id = v_wallet_id;
        END IF;
    END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
