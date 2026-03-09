
-- تفعيل الأعمدة الجديدة في جدول الشاحنات trucks
-- لضمان التوافق مع الكود الجديد ومنع خطأ 400

ALTER TABLE public.trucks 
ADD COLUMN IF NOT EXISTS truck_category_id UUID REFERENCES public.truck_categories(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS body_type_id UUID REFERENCES public.load_body_types(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS commodity_id UUID REFERENCES public.shipment_commodities(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS operation_card_number TEXT;

-- إصلاح علاقة جدول الصيانة بالشحنات لتمكين الـ Join
ALTER TABLE public.maintenance_requests
DROP CONSTRAINT IF EXISTS maintenance_requests_load_id_fkey,
ADD CONSTRAINT maintenance_requests_load_id_fkey 
FOREIGN KEY (load_id) REFERENCES public.loads(id) ON DELETE SET NULL;

-- تحديث السياسات
ALTER TABLE public.trucks ENABLE ROW LEVEL SECURITY;

-- السياسة الحالية عادة تسمح للمالك بالتحكم
-- CREATE POLICY "Owners can manage their own trucks" ON public.trucks FOR ALL USING (auth.uid() = owner_id);
