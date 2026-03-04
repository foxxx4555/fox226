-- إصلاح نهائي وشامل لجدول مدفوعات الشاحنين وقواعد الحماية
-- التاريخ: 2026-03-04

-- 1. التأكد من وجود الأعمدة المطلوبة وتصحيح الأنواع إذا لزم الأمر
DO $$ 
BEGIN
    -- إضافة عمود ملاحظات الشاحن إذا لم يكن موجوداً
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='shipper_payments' AND column_name='shipper_notes') THEN
        ALTER TABLE shipper_payments ADD COLUMN shipper_notes TEXT;
    END IF;

    -- التأكد من أن shipper_id من نوع uuid ويشير للجدول الصحيح
    -- ملاحظة: نفترض أن الجدول تم إنشاؤه مسبقاً، هنا نقوم فقط بالتحقق من الحقول
END $$;

-- 2. إعادة ضبط قواعد الحماية (RLS)
ALTER TABLE shipper_payments ENABLE ROW LEVEL SECURITY;

-- تنظيف شامل لجميع السياسات القديمة لتجنب أي تداخل
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN (SELECT policyname FROM pg_policies WHERE tablename = 'shipper_payments') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON shipper_payments', pol.policyname);
    END LOOP;
END $$;

-- القاعدة 1: الشاحن يمكنه رؤية وإضافة مدفوعاته الخاصة
-- نستخدم التحقق من auth.uid() بشكل مباشر
CREATE POLICY "shipper_manage_own_payments" ON shipper_payments
    FOR ALL 
    TO authenticated 
    USING (auth.uid() = shipper_id)
    WITH CHECK (auth.uid() = shipper_id);

-- القاعدة 2: المسؤولين بجميع أنواعهم يمكنهم رؤية وإدارة كافة المدفوعات
-- تشمل: admin, super_admin, finance, operations وغيرهم
CREATE POLICY "admin_manage_all_payments" ON shipper_payments
    FOR ALL 
    TO authenticated 
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_roles.user_id = auth.uid()
            AND (
                user_roles.role::text ILIKE '%admin%' OR 
                user_roles.role::text ILIKE '%finance%' OR
                user_roles.role::text ILIKE '%operation%'
            )
        )
    );

-- القاعدة 3: سياسة احتياطية للقراءة فقط للمسؤولين (لضمان عمل .select() بعد .insert())
-- هذه القاعدة تغطي الحالات التي يكون فيها المستخدم مسؤولاً ولكن يحاول إدراج سجل لشاحن آخر
CREATE POLICY "admin_select_all" ON shipper_payments
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_roles.user_id = auth.uid()
            AND (
                user_roles.role::text ILIKE '%admin%' OR 
                user_roles.role::text ILIKE '%finance%'
            )
        )
    );
