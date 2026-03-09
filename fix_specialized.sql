DO $$ 
DECLARE 
    car_carrier_id UUID;
    heavy_equip_id UUID;
    trella_id UUID;
BEGIN
    SELECT id INTO car_carrier_id FROM public.truck_categories WHERE name_ar = 'ناقلة سيارات' LIMIT 1;
    SELECT id INTO heavy_equip_id FROM public.truck_categories WHERE name_ar = 'معدات الثقيل' LIMIT 1;
    SELECT id INTO trella_id FROM public.truck_categories WHERE name_ar = 'تريلا' LIMIT 1;

    -- Fix Car Carrier
    UPDATE public.load_body_types SET category_id = car_carrier_id, capacity_tons = 15, length_meters = 18 WHERE name_ar = 'مفتوحة ذات طابقين';
    UPDATE public.load_body_types SET category_id = car_carrier_id, capacity_tons = 5, length_meters = 9 WHERE name_ar = 'سطحة سحب (ونش ريكفري)';

    -- Fix Heavy Equipment
    UPDATE public.load_body_types SET category_id = heavy_equip_id, capacity_tons = 30, length_meters = 12 
    WHERE name_ar IN ('معدات تحريك التربة', 'معدات النقل ومناولة المواد', 'آلات بناء الطرق', 'معدات الرفع وأعمال الأساسات', 'معدات الخرسانة والخلط');

    -- Ensure 'لوبد' is also linked to something meaningful or both
    UPDATE public.load_body_types SET category_id = heavy_equip_id, capacity_tons = 50, length_meters = 15 WHERE name_ar = 'لوبد';
END $$;
