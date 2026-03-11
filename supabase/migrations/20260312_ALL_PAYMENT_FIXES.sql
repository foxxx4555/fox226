-- 20260312_ALL_PAYMENT_FIXES.sql (v4 - drops duplicate functions)
-- شغّل هذا الملف الوحيد على Supabase SQL Editor

-- حذف النسختين المتعارضتين من الدالة
DROP FUNCTION IF EXISTS public.handle_shipper_payment_approval(TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.handle_shipper_payment_approval(UUID, TEXT, TEXT);

-- ═══════════════════════════════════════════════════
-- الجزء 1: إضافة أعمدة الأمان
-- ═══════════════════════════════════════════════════
ALTER TABLE public.shipper_payments 
ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'bank_transfer',
ADD COLUMN IF NOT EXISTS processed_by UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS admin_ip TEXT;

UPDATE public.shipper_payments 
SET payment_method = 'bank_transfer' 
WHERE payment_method IS NULL;

-- ═══════════════════════════════════════════════════
-- الجزء 2: إصلاح RLS Policies
-- ═══════════════════════════════════════════════════
DROP POLICY IF EXISTS "admin_manage_all_payments"      ON public.shipper_payments;
DROP POLICY IF EXISTS "admin_select_all"               ON public.shipper_payments;
DROP POLICY IF EXISTS "admin_select_all_payments"      ON public.shipper_payments;
DROP POLICY IF EXISTS "admin_insert_payments"          ON public.shipper_payments;
DROP POLICY IF EXISTS "admin_update_payments"          ON public.shipper_payments;

CREATE POLICY "admin_select_all_payments" ON public.shipper_payments
    FOR SELECT TO authenticated
    USING (
        auth.uid() = shipper_id
        OR EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid()
            AND role::text IN ('super_admin','admin','Admin','finance','Finance','operations','Operations','carrier_manager','support')
        )
    );

CREATE POLICY "admin_insert_payments" ON public.shipper_payments
    FOR INSERT TO authenticated
    WITH CHECK (
        auth.uid() = shipper_id
        OR EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid()
            AND role::text IN ('super_admin','admin','Admin','finance','Finance','operations','Operations')
        )
    );

CREATE POLICY "admin_update_payments" ON public.shipper_payments
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid()
            AND role::text IN ('super_admin','admin','Admin','finance','Finance','operations','Operations')
        )
    );

-- ═══════════════════════════════════════════════════
-- الجزء 3: الدالة الآمنة (SECURITY DEFINER + exception handling)
-- ═══════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.handle_shipper_payment_approval(
    p_payment_id TEXT,
    p_status TEXT,
    p_admin_notes TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER  -- تعمل بصلاحيات المالك، تتجاوز RLS
SET search_path = public
AS $$
DECLARE
    v_payment   RECORD;
    v_wallet_id UUID;
BEGIN
    -- 1. جلب بيانات الدفعة
    SELECT * INTO v_payment
    FROM public.shipper_payments
    WHERE id::TEXT = p_payment_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'الدفعة غير موجودة: %', p_payment_id;
    END IF;

    -- 2. تحديث حالة الدفعة
    UPDATE public.shipper_payments
    SET status      = p_status,
        admin_notes = COALESCE(p_admin_notes, admin_notes),
        updated_at  = NOW()
    WHERE id::TEXT = p_payment_id;

    -- 3. عند الاعتماد فقط
    IF p_status = 'approved' THEN

        -- الحصول على محفظة الشاحن
        SELECT wallet_id INTO v_wallet_id
        FROM public.wallets
        WHERE user_id = v_payment.shipper_id AND user_type = 'shipper'
        LIMIT 1;

        -- إنشاء المحفظة إذا لم تكن موجودة
        IF v_wallet_id IS NULL THEN
            INSERT INTO public.wallets (user_id, user_type, balance)
            VALUES (v_payment.shipper_id, 'shipper', 0)
            RETURNING wallet_id INTO v_wallet_id;
        END IF;

        -- تسجيل معاملة ائتمانية (يحدّث الرصيد عبر التريجر)
        BEGIN
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
        EXCEPTION WHEN OTHERS THEN
            -- في حالة فشل التسجيل، حدّث الرصيد مباشرة
            UPDATE public.wallets
            SET balance    = COALESCE(balance, 0) + v_payment.amount,
                updated_at = NOW()
            WHERE wallet_id = v_wallet_id;
        END;

        -- تحديث الفاتورة (non-fatal)
        BEGIN
            UPDATE public.invoices
            SET amount_paid = COALESCE(amount_paid, 0) + v_payment.amount
            WHERE id = (
                SELECT id FROM public.invoices
                WHERE shipment_id = v_payment.shipment_id
                ORDER BY created_at DESC
                LIMIT 1
            );
        EXCEPTION WHEN OTHERS THEN
            NULL; -- فشل تحديث الفاتورة لا يوقف العملية
        END;

    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.handle_shipper_payment_approval(TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_shipper_payment_approval(TEXT, TEXT, TEXT) TO service_role;

-- ═══════════════════════════════════════════════════
-- الجزء 4: مزامنة البيانات القديمة
-- ═══════════════════════════════════════════════════
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
              WHERE w.user_id           = sp.shipper_id
                AND ft.transaction_type = 'payment'
                AND ft.shipment_id      = sp.shipment_id
          )
    LOOP
        SELECT wallet_id INTO v_wallet_id
        FROM public.wallets
        WHERE user_id = v_rec.shipper_id AND user_type = 'shipper'
        LIMIT 1;

        IF v_wallet_id IS NOT NULL THEN
            BEGIN
                INSERT INTO public.financial_transactions
                    (wallet_id, shipment_id, amount, type, transaction_type, description)
                VALUES (
                    v_wallet_id, v_rec.shipment_id, v_rec.amount,
                    'credit', 'payment',
                    'مزامنة دفعة معتمدة سابقاً - شحنة #' || LEFT(v_rec.shipment_id::TEXT, 8)
                );
            EXCEPTION WHEN OTHERS THEN
                UPDATE public.wallets
                SET balance = COALESCE(balance, 0) + v_rec.amount
                WHERE wallet_id = v_wallet_id;
            END;
        END IF;
    END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
