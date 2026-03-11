-- 20260312_FIX_SHIPPER_READ_POLICY.sql
-- يضمن قدرة الشاحن على قراءة إيصالاته في جدول shipper_payments

-- أولاً: تأكد إن RLS مفعّل
ALTER TABLE public.shipper_payments ENABLE ROW LEVEL SECURITY;

-- ثانياً: نظّف أي policy قديمة قد تمنع القراءة
DROP POLICY IF EXISTS "shipper_manage_own_payments" ON public.shipper_payments;
DROP POLICY IF EXISTS "shipper_read_own_payments"   ON public.shipper_payments;

-- ثالثاً: policy صريحة للقراءة (SELECT فقط) للشاحن
CREATE POLICY "shipper_read_own_payments" ON public.shipper_payments
    FOR SELECT
    TO authenticated
    USING (auth.uid() = shipper_id);

-- رابعاً: policy للإضافة (INSERT) للشاحن
CREATE POLICY "shipper_insert_own_payments" ON public.shipper_payments
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = shipper_id);

-- خامساً: policy للأدمن (كل العمليات)
DROP POLICY IF EXISTS "admin_manage_all_payments"  ON public.shipper_payments;
DROP POLICY IF EXISTS "admin_select_all_payments"  ON public.shipper_payments;
DROP POLICY IF EXISTS "admin_insert_payments"      ON public.shipper_payments;
DROP POLICY IF EXISTS "admin_update_payments"      ON public.shipper_payments;
DROP POLICY IF EXISTS "admin_select_all"           ON public.shipper_payments;

CREATE POLICY "admin_all_payments" ON public.shipper_payments
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid()
            AND role::text IN (
                'super_admin','admin','Admin','finance','Finance',
                'operations','Operations','carrier_manager','support'
            )
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid()
            AND role::text IN (
                'super_admin','admin','Admin','finance','Finance',
                'operations','Operations','carrier_manager','support'
            )
        )
    );

NOTIFY pgrst, 'reload schema';
