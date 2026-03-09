-- سكريبت تأكيد الصلاحيات (RLS & Grants) لضمان ظهور البيانات للشاحن
-- تاريخ: 2026-03-09

-- 1. التأكد من تفعيل RLS
ALTER TABLE public.truck_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.load_body_types ENABLE ROW LEVEL SECURITY;

-- 2. إعادة إنشاء السياسات لضمان الوصول للجميع (المسجلين وغير المسجلين حسب الحاجة)
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Public can view active truck categories" ON public.truck_categories;
    DROP POLICY IF EXISTS "Public can view active body types" ON public.load_body_types;
    DROP POLICY IF EXISTS "Allow authenticated select on truck_categories" ON public.truck_categories;
    DROP POLICY IF EXISTS "Allow authenticated select on load_body_types" ON public.load_body_types;
END $$;

-- سياسة تسمح لأي مستخدم مسجل بقراءة الفئات النشطة
CREATE POLICY "Allow authenticated select on truck_categories" 
ON public.truck_categories 
FOR SELECT 
TO authenticated 
USING (is_active = true);

-- سياسة تسمح لأي مستخدم مسجل بقراءة أنواع المقطورات النشطة
CREATE POLICY "Allow authenticated select on load_body_types" 
ON public.load_body_types 
FOR SELECT 
TO authenticated 
USING (is_active = true);

-- 3. منح صلاحيات SELECT صريحة للدور authenticated
GRANT SELECT ON public.truck_categories TO authenticated;
GRANT SELECT ON public.load_body_types TO authenticated;
GRANT SELECT ON public.shipment_type_pricing TO authenticated;
GRANT SELECT ON public.shipment_commodities TO authenticated;

-- 4. التأكد من أن جميع البيانات نشطة حالياً
UPDATE public.truck_categories SET is_active = true WHERE is_active IS NOT TRUE;
UPDATE public.load_body_types SET is_active = true WHERE is_active IS NOT TRUE;
