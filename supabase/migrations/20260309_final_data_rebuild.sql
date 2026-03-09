-- سكريبت إعادة البناء النهائي والشامل (Final Data Rebuild 17 Images - V2)
-- تم التحديث بناءً على الصور الأخيرة لضمان مطابقة قوائم المقطورات لكل فئة

DO $$ 
DECLARE 
    trella_id UUID;
    sex_id UUID;
    lorry_id UUID;
    dyna_id UUID;
    pickup_id UUID;
    van_id UUID;
    car_carrier_id UUID;
    heavy_equip_id UUID;
BEGIN
    -- 0. تنظيف شامل
    DELETE FROM public.load_body_types;
    DELETE FROM public.truck_categories;

    -- 1. إدخال فئات الشاحنات
    INSERT INTO public.truck_categories (name_ar, is_active) VALUES 
    ('تريلا (+20 طن)', true), 
    ('سكس (13 طن)', true), 
    ('لوري (5-8 طن)', true), 
    ('دينا (3.5-4 طن)', true), 
    ('بيك اب (1 طن)', true), 
    ('فان - هايس', true), 
    ('ناقلة سيارات', true), 
    ('معدات الثقيل', true);

    -- جلب المعرفات
    SELECT id INTO trella_id FROM public.truck_categories WHERE name_ar = 'تريلا (+20 طن)' LIMIT 1;
    SELECT id INTO sex_id FROM public.truck_categories WHERE name_ar = 'سكس (13 طن)' LIMIT 1;
    SELECT id INTO lorry_id FROM public.truck_categories WHERE name_ar = 'لوري (5-8 طن)' LIMIT 1;
    SELECT id INTO dyna_id FROM public.truck_categories WHERE name_ar = 'دينا (3.5-4 طن)' LIMIT 1;
    SELECT id INTO pickup_id FROM public.truck_categories WHERE name_ar = 'بيك اب (1 طن)' LIMIT 1;
    SELECT id INTO van_id FROM public.truck_categories WHERE name_ar = 'فان - هايس' LIMIT 1;
    SELECT id INTO car_carrier_id FROM public.truck_categories WHERE name_ar = 'ناقلة سيارات' LIMIT 1;
    SELECT id INTO heavy_equip_id FROM public.truck_categories WHERE name_ar = 'معدات الثقيل' LIMIT 1;

    -- 2. إدخال أنواع المقطورات (مطابق تماماً للصور)

    -- [تريلا]
    INSERT INTO public.load_body_types (name_ar, category_id, is_active) VALUES 
    ('جوانب عالية', trella_id, true), ('جوانب ألماني', trella_id, true), ('ستارة', trella_id, true), 
    ('سطحه', trella_id, true), ('برادة', trella_id, true), ('قلابة', trella_id, true), 
    ('لوبد', trella_id, true), ('مقطورة حاوية', trella_id, true), ('صهريج', trella_id, true),
    ('جامبو', trella_id, true), ('مغلق', trella_id, true);

    -- [سكس]
    INSERT INTO public.load_body_types (name_ar, category_id, is_active) VALUES 
    ('عادي', sex_id, true), ('صندوق مغلق', sex_id, true), ('جوانب', sex_id, true), 
    ('برادة', sex_id, true), ('قلابة', sex_id, true), ('لوبد', sex_id, true), ('تانكي', sex_id, true);

    -- [لوري]
    INSERT INTO public.load_body_types (name_ar, category_id, is_active) VALUES 
    ('برادة (ثلاجة)', lorry_id, true), ('بونش', lorry_id, true), ('صندوق مغلق', lorry_id, true), 
    ('جوانب', lorry_id, true), ('شبك', lorry_id, true), ('قلابة', lorry_id, true), 
    ('سطحة', lorry_id, true), ('تانكي', lorry_id, true);

    -- [دينا]
    INSERT INTO public.load_body_types (name_ar, category_id, is_active) VALUES 
    ('صندوق مقفل', dyna_id, true), ('ثلاجة', dyna_id, true);

    -- [بيك اب]
    INSERT INTO public.load_body_types (name_ar, category_id, is_active) VALUES 
    ('بونش', pickup_id, true), ('عادي', pickup_id, true), ('صندوق مغلق', pickup_id, true);

    -- [فان - هايس]
    INSERT INTO public.load_body_types (name_ar, category_id, is_active) VALUES 
    ('مغلقة (مقفل)', van_id, true), ('برادة', van_id, true);

    -- [ناقلة سيارات]
    INSERT INTO public.load_body_types (name_ar, category_id, is_active) VALUES 
    ('سطحة سحب (ونش ريكفري)', car_carrier_id, true), 
    ('مغلقة (مقفل)', car_carrier_id, true), 
    ('مفتوحة ذات طابقين', car_carrier_id, true);

    -- [معدات الثقيل]
    INSERT INTO public.load_body_types (name_ar, category_id, is_active) VALUES 
    ('معدات تحريك التربة', heavy_equip_id, true), 
    ('معدات النقل ومناولة المواد', heavy_equip_id, true), 
    ('آلات بناء الطرق', heavy_equip_id, true), 
    ('معدات الرفع وأعمال الأساسات', heavy_equip_id, true), 
    ('معدات الخرسانة والخلط', heavy_equip_id, true);

    -- 3. تفعيل الحماية والوصول للجميع
    ALTER TABLE public.truck_categories ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.load_body_types ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Public view truck categories" ON public.truck_categories;
    CREATE POLICY "Public view truck categories" ON public.truck_categories FOR SELECT USING (true);

    DROP POLICY IF EXISTS "Public view body types" ON public.load_body_types;
    CREATE POLICY "Public view body types" ON public.load_body_types FOR SELECT USING (true);

    GRANT SELECT ON public.truck_categories TO authenticated, anon;
    GRANT SELECT ON public.load_body_types TO authenticated, anon;

END $$;
