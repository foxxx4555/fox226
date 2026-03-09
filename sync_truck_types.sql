-- 0. Ensure columns exist before adding data
ALTER TABLE public.load_body_types 
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.truck_categories(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS capacity_tons NUMERIC,
ADD COLUMN IF NOT EXISTS length_meters NUMERIC;

-- 1. Remove the old unique constraint on name_ar alone (to allow "برادة" in multiple categories)
ALTER TABLE public.load_body_types DROP CONSTRAINT IF EXISTS load_body_types_name_ar_key;

-- 2. Add a new composite unique constraint
ALTER TABLE public.load_body_types DROP CONSTRAINT IF EXISTS load_body_types_name_ar_category_id_key;
ALTER TABLE public.load_body_types ADD CONSTRAINT load_body_types_name_ar_category_id_key UNIQUE (name_ar, category_id);

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
    -- Fetch category IDs
    SELECT id INTO trella_id FROM public.truck_categories WHERE name_ar LIKE 'تريلا%' LIMIT 1;
    SELECT id INTO sex_id FROM public.truck_categories WHERE name_ar LIKE 'سكس%' LIMIT 1;
    SELECT id INTO lorry_id FROM public.truck_categories WHERE name_ar LIKE 'لوري%' LIMIT 1;
    SELECT id INTO dyna_id FROM public.truck_categories WHERE name_ar LIKE 'دينا%' LIMIT 1;
    SELECT id INTO pickup_id FROM public.truck_categories WHERE name_ar LIKE 'بيك اب%' LIMIT 1;
    SELECT id INTO van_id FROM public.truck_categories WHERE name_ar LIKE 'فان%' LIMIT 1;
    SELECT id INTO car_carrier_id FROM public.truck_categories WHERE name_ar LIKE 'ناقلة سيارات%' LIMIT 1;
    SELECT id INTO heavy_equip_id FROM public.truck_categories WHERE name_ar LIKE 'معدات الثقيل%' LIMIT 1;

    -- Deactivate all first to ensure clean UI
    UPDATE public.load_body_types SET is_active = false;

    -- 1. تريلا (25 طن، 13 متر)
    INSERT INTO public.load_body_types (category_id, name_ar, capacity_tons, length_meters, is_active) VALUES
    (trella_id, 'جوانب', 25, 13, true), (trella_id, 'برادة', 25, 13, true),
    (trella_id, 'قلابة', 25, 13, true), (trella_id, 'صندوق مغلق', 25, 13, true),
    (trella_id, 'تانكي', 25, 13, true), (trella_id, 'لوبد', 25, 13, true)
    ON CONFLICT (name_ar, category_id) DO UPDATE SET capacity_tons = EXCLUDED.capacity_tons, length_meters = EXCLUDED.length_meters, is_active = true;

    -- 2. سكس (13 طن، 8 متر)
    INSERT INTO public.load_body_types (category_id, name_ar, capacity_tons, length_meters, is_active) VALUES
    (sex_id, 'سطحة', 13, 8, true), (sex_id, 'ستارة', 13, 8, true),
    (sex_id, 'جوانب عالية', 13, 8, true), (sex_id, 'جوانب ألماني', 13, 8, true),
    (sex_id, 'برادة', 13, 8, true), (sex_id, 'جامبو', 13, 8, true),
    (sex_id, 'قلابة', 13, 8, true), (sex_id, 'صهريج', 13, 8, true),
    (sex_id, 'لوبد', 13, 8, true), (sex_id, 'مقطورة حاوية', 13, 8, true),
    (sex_id, 'مغلق', 13, 8, true)
    ON CONFLICT (name_ar, category_id) DO UPDATE SET capacity_tons = EXCLUDED.capacity_tons, length_meters = EXCLUDED.length_meters, is_active = true;

    -- 3. لوري (8 طن، 6 متر)
    INSERT INTO public.load_body_types (category_id, name_ar, capacity_tons, length_meters, is_active) VALUES
    (lorry_id, 'برادة', 8, 6, true), (lorry_id, 'جوانب', 8, 6, true),
    (lorry_id, 'شبك', 8, 6, true), (lorry_id, 'صندوق مغلق', 8, 6, true),
    (lorry_id, 'بونش', 8, 6, true), (lorry_id, 'قلابة', 8, 6, true),
    (lorry_id, 'تانكي', 8, 6, true)
    ON CONFLICT (name_ar, category_id) DO UPDATE SET capacity_tons = EXCLUDED.capacity_tons, length_meters = EXCLUDED.length_meters, is_active = true;

    -- 4. دينا (4 طن، 4 متر)
    INSERT INTO public.load_body_types (category_id, name_ar, capacity_tons, length_meters, is_active) VALUES
    (dyna_id, 'برادة - ثلاجة', 4, 4, true), (dyna_id, 'صندوق مغلق', 4, 4, true),
    (dyna_id, 'جوانب', 4, 4, true), (dyna_id, 'شبك', 4, 4, true),
    (dyna_id, 'سطحة', 4, 4, true), (dyna_id, 'بونش', 4, 4, true),
    (dyna_id, 'قلابة', 4, 4, true), (dyna_id, 'تانكي', 4, 4, true)
    ON CONFLICT (name_ar, category_id) DO UPDATE SET capacity_tons = EXCLUDED.capacity_tons, length_meters = EXCLUDED.length_meters, is_active = true;

    -- 5. بيك اب (1 طن، 2.5 متر)
    INSERT INTO public.load_body_types (category_id, name_ar, capacity_tons, length_meters, is_active) VALUES
    (pickup_id, 'عادي', 1, 2.5, true), (pickup_id, 'صندوق مغلق', 1, 2.5, true),
    (pickup_id, 'ثلاجة', 1, 2.5, true)
    ON CONFLICT (name_ar, category_id) DO UPDATE SET capacity_tons = EXCLUDED.capacity_tons, length_meters = EXCLUDED.length_meters, is_active = true;

    -- 6. فان (1 طن، 3 متر)
    INSERT INTO public.load_body_types (category_id, name_ar, capacity_tons, length_meters, is_active) VALUES
    (van_id, 'صندوق مغلق', 1, 3, true), (van_id, 'ثلاجة', 1, 3, true)
    ON CONFLICT (name_ar, category_id) DO UPDATE SET capacity_tons = EXCLUDED.capacity_tons, length_meters = EXCLUDED.length_meters, is_active = true;

    -- 7. ناقلة سيارات (15 طن، 18 متر)
    INSERT INTO public.load_body_types (category_id, name_ar, capacity_tons, length_meters, is_active) VALUES
    (car_carrier_id, 'سطحة سحب - ونش ريكفري', 15, 18, true), 
    (car_carrier_id, 'مغلقة - مقفل', 15, 18, true),
    (car_carrier_id, 'مفتوحة ذات طابقين', 15, 18, true)
    ON CONFLICT (name_ar, category_id) DO UPDATE SET capacity_tons = EXCLUDED.capacity_tons, length_meters = EXCLUDED.length_meters, is_active = true;

    -- 8. معدات الثقيل (30 طن، 12 متر)
    INSERT INTO public.load_body_types (category_id, name_ar, capacity_tons, length_meters, is_active) VALUES
    (heavy_equip_id, 'معدات تحريك التربة', 30, 12, true), 
    (heavy_equip_id, 'معدات النقل ومناولة المواد', 30, 12, true),
    (heavy_equip_id, 'آلات بناء الطرق', 30, 12, true), 
    (heavy_equip_id, 'معدات الرفع وأعمال الأساسات', 30, 12, true),
    (heavy_equip_id, 'معدات الخرسانة والخلط', 30, 12, true)
    ON CONFLICT (name_ar, category_id) DO UPDATE SET capacity_tons = EXCLUDED.capacity_tons, length_meters = EXCLUDED.length_meters, is_active = true;

END $$;
