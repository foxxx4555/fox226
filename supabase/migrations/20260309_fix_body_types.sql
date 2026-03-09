-- سكريبت نهائي وشامل لإصلاح ربط فئات الشاحنات بأنواع المقطورات
-- تم التصميم لمنع أخطاء التعارض (Unique Constraint) نهائياً وتفعيل البيانات

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
    -- 1. جلب المعرفات الحالية للفئات
    SELECT id INTO trella_id FROM public.truck_categories WHERE name_ar = 'تريلا' LIMIT 1;
    SELECT id INTO sex_id FROM public.truck_categories WHERE name_ar = 'سكس' LIMIT 1;
    SELECT id INTO lorry_id FROM public.truck_categories WHERE name_ar = 'لوري' LIMIT 1;
    SELECT id INTO dyna_id FROM public.truck_categories WHERE name_ar = 'دينا' LIMIT 1;
    SELECT id INTO pickup_id FROM public.truck_categories WHERE name_ar = 'بيك اب' LIMIT 1;
    SELECT id INTO van_id FROM public.truck_categories WHERE name_ar = 'فان' LIMIT 1;
    SELECT id INTO car_carrier_id FROM public.truck_categories WHERE name_ar = 'ناقلة سيارات' LIMIT 1;
    SELECT id INTO heavy_equip_id FROM public.truck_categories WHERE name_ar = 'معدات الثقيل' LIMIT 1;

    -- 2. تنظيف شامل للتكرارات قبل البدء
    -- حذف السجلات المكررة التي تحمل نفس الاسم لضمان وجود سجل واحد فقط لكل اسم مقطورة
    DELETE FROM public.load_body_types a USING public.load_body_types b
    WHERE a.id > b.id AND a.name_ar = b.name_ar;

    -- 3. تفعيل كافة الفئات والمقطورات
    UPDATE public.truck_categories SET is_active = true;
    UPDATE public.load_body_types SET is_active = true;

    -- 4. تحديث الفئات (Mapping)
    
    -- تريلا
    UPDATE public.load_body_types SET category_id = trella_id 
    WHERE name_ar IN ('جوانب', 'جوانب عالية', 'جوانب ألماني', 'ستارة', 'سطحه', 'لوبد', 'مقطورة حاوية', 'صهريج', 'جامبو', 'برادة', 'صندوق مغلق');
    
    -- لوري
    UPDATE public.load_body_types SET category_id = lorry_id 
    WHERE name_ar IN ('عادي', 'برادة (ثلاجة)', 'شبك', 'قلابة', 'تانكي', 'ثلاجة');
    
    -- سكس
    UPDATE public.load_body_types SET category_id = sex_id 
    WHERE name_ar LIKE 'سكس%';

    -- دينا
    UPDATE public.load_body_types SET category_id = dyna_id 
    WHERE name_ar LIKE 'دينا%' OR name_ar LIKE '%(دينا)%';

    -- بيك اب
    UPDATE public.load_body_types SET category_id = pickup_id 
    WHERE name_ar IN ('بونش') OR name_ar LIKE '%(بيك اب)%';

    -- فان
    UPDATE public.load_body_types SET category_id = van_id 
    WHERE name_ar IN ('مغلقة (مقفل)') OR name_ar LIKE '%(فان)%';

    -- ناقلة سيارات
    UPDATE public.load_body_types SET category_id = car_carrier_id 
    WHERE name_ar IN ('مفتوحة ذات طابقين', 'سطحة سحب (ونش ريكفري)', 'ناقلة سيارات');

    -- معدات ثقيلة
    UPDATE public.load_body_types SET category_id = heavy_equip_id 
    WHERE name_ar IN ('معدات تحريك التربة', 'معدات النقل ومناولة المواد', 'آلات بناء الطرق', 'معدات الرفع وأعمال الأساسات', 'معدات الخرسانة والخلط');

END $$;
