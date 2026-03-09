-- سكريبت إعادة بناء شامل لكافة بيانات الشاحنات والمقطورات
-- تم بناء هذا السكريبت بناءً على الصور الـ 17 المرفوعة من قبل المستخدم

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
    -- 0. تنظيف البيانات القديمة (اختياري ولكن لضمان النظافة بناءً على طلب المستخدم)
    DELETE FROM public.load_body_types;
    DELETE FROM public.truck_categories;

    -- 1. إدخال فئات الشاحنات (Truck Categories)
    INSERT INTO public.truck_categories (name_ar) VALUES 
    ('تريلا (+20 طن)'), 
    ('سكس (13 طن)'), 
    ('لوري (5-8 طن)'), 
    ('دينا (3.5-4 طن)'), 
    ('بيك اب (1 طن)'), 
    ('فان - هايس'), 
    ('ناقلة سيارات'), 
    ('معدات الثقيل')
    ON CONFLICT (name_ar) DO NOTHING;

    -- جلب المعرفات للربط
    SELECT id INTO trella_id FROM public.truck_categories WHERE name_ar = 'تريلا (+20 طن)' LIMIT 1;
    SELECT id INTO sex_id FROM public.truck_categories WHERE name_ar = 'سكس (13 طن)' LIMIT 1;
    SELECT id INTO lorry_id FROM public.truck_categories WHERE name_ar = 'لوري (5-8 طن)' LIMIT 1;
    SELECT id INTO dyna_id FROM public.truck_categories WHERE name_ar = 'دينا (3.5-4 طن)' LIMIT 1;
    SELECT id INTO pickup_id FROM public.truck_categories WHERE name_ar = 'بيك اب (1 طن)' LIMIT 1;
    SELECT id INTO van_id FROM public.truck_categories WHERE name_ar = 'فان - هايس' LIMIT 1;
    SELECT id INTO car_carrier_id FROM public.truck_categories WHERE name_ar = 'ناقلة سيارات' LIMIT 1;
    SELECT id INTO heavy_equip_id FROM public.truck_categories WHERE name_ar = 'معدات الثقيل' LIMIT 1;

    -- 2. إدخال أنواع المقطورات (Body Types) والربط

    -- [تريلا]
    INSERT INTO public.load_body_types (name_ar, category_id) VALUES 
    ('جوانب عالية', trella_id), 
    ('جوانب ألماني', trella_id), 
    ('ستارة', trella_id), 
    ('سطحه', trella_id), 
    ('برادة', trella_id), 
    ('قلابة', trella_id), 
    ('لوبد', trella_id), 
    ('مقطورة حاوية', trella_id), 
    ('صهريج', trella_id);

    -- [سكس]
    INSERT INTO public.load_body_types (name_ar, category_id) VALUES 
    ('جوانب (سكس)', sex_id), 
    ('برادة (سكس)', sex_id), 
    ('قلابة (سكس)', sex_id), 
    ('صندوق مغلق (سكس)', sex_id), 
    ('تانكي (سكس)', sex_id), 
    ('لوبد (سكس)', sex_id);

    -- [لوري]
    INSERT INTO public.load_body_types (name_ar, category_id) VALUES 
    ('برادة (لوري)', lorry_id), 
    ('جوانب (لوري)', lorry_id), 
    ('شبك', lorry_id), 
    ('صندوق مغلق (لوري)', lorry_id), 
    ('بونش', lorry_id), 
    ('قلابة (لوري)', lorry_id), 
    ('تانكي (لوري)', lorry_id);

    -- [دينا]
    INSERT INTO public.load_body_types (name_ar, category_id) VALUES 
    ('صندوق مغلق (دينا)', dyna_id), 
    ('برادة (دينا)', dyna_id), 
    ('ستارة (دينا)', dyna_id);

    -- [بيك اب]
    INSERT INTO public.load_body_types (name_ar, category_id) VALUES 
    ('بونش (بيك اب)', pickup_id), 
    ('عادي (بيك اب)', pickup_id), 
    ('صندوق مغلق (بيك اب)', pickup_id);

    -- [فان]
    INSERT INTO public.load_body_types (name_ar, category_id) VALUES 
    ('مغلقة (مقفل)', van_id), 
    ('برادة (فان)', van_id);

    -- [ناقلة سيارات]
    INSERT INTO public.load_body_types (name_ar, category_id) VALUES 
    ('مفتوحة ذات طابقين', car_carrier_id), 
    ('سطحة سحب (ونش ريكفري)', car_carrier_id);

    -- [معدات ثقيلة]
    INSERT INTO public.load_body_types (name_ar, category_id) VALUES 
    ('معدات تحريك التربة', heavy_equip_id), 
    ('معدات النقل ومناولة المواد', heavy_equip_id), 
    ('آلات بناء الطرق', heavy_equip_id), 
    ('معدات الرفع وأعمال الأساسات', heavy_equip_id), 
    ('معدات الخرسانة والخلط', heavy_equip_id);

    -- التأكد من تفعيل الجميع
    UPDATE public.truck_categories SET is_active = true;
    UPDATE public.load_body_types SET is_active = true;

END $$;
