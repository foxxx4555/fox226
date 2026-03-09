-- [1] TRUCK PRICING & CONSTRAINTS
-- Add rent_price to trucks
ALTER TABLE public.trucks ADD COLUMN IF NOT EXISTS rent_price NUMERIC(15, 2) DEFAULT 0.00;

-- [2] FINANCIAL TABLES (The blockers)
-- shipment_finances
ALTER TABLE public.shipment_finances DROP CONSTRAINT IF EXISTS shipment_finances_shipper_id_fkey;
ALTER TABLE public.shipment_finances ADD CONSTRAINT shipment_finances_shipper_id_fkey 
FOREIGN KEY (shipper_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.shipment_finances DROP CONSTRAINT IF EXISTS shipment_finances_carrier_id_fkey;
ALTER TABLE public.shipment_finances ADD CONSTRAINT shipment_finances_carrier_id_fkey 
FOREIGN KEY (carrier_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- invoices
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_shipper_id_fkey;
ALTER TABLE public.invoices ADD CONSTRAINT invoices_shipper_id_fkey 
FOREIGN KEY (shipper_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- shipper_payments
ALTER TABLE public.shipper_payments DROP CONSTRAINT IF EXISTS shipper_payments_shipper_id_fkey;
ALTER TABLE public.shipper_payments ADD CONSTRAINT shipper_payments_shipper_id_fkey 
FOREIGN KEY (shipper_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- withdrawal_requests
ALTER TABLE public.withdrawal_requests DROP CONSTRAINT IF EXISTS withdrawal_requests_user_id_fkey;
ALTER TABLE public.withdrawal_requests ADD CONSTRAINT withdrawal_requests_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- [2] OPERATIONAL TABLES
-- ratings
ALTER TABLE public.ratings DROP CONSTRAINT IF EXISTS ratings_rated_id_fkey;
ALTER TABLE public.ratings ADD CONSTRAINT ratings_rated_id_fkey 
FOREIGN KEY (rated_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.ratings DROP CONSTRAINT IF EXISTS ratings_rater_id_fkey;
ALTER TABLE public.ratings ADD CONSTRAINT ratings_rater_id_fkey 
FOREIGN KEY (rater_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- receivers
ALTER TABLE public.receivers DROP CONSTRAINT IF EXISTS receivers_owner_id_fkey;
ALTER TABLE public.receivers ADD CONSTRAINT receivers_owner_id_fkey 
FOREIGN KEY (owner_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- [3] PREVIOUSLY DEFINED (Re-confirming and unifying)
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_fkey;
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.wallets DROP CONSTRAINT IF EXISTS wallets_user_id_fkey;
ALTER TABLE public.wallets ADD CONSTRAINT wallets_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- [4] FINAL DELETE PROCESS
CREATE OR REPLACE FUNCTION delete_user_entirely(p_target_user_id UUID)
RETURNS void AS $$
DECLARE
    v_role text;
BEGIN
    -- Check permissions
    SELECT role INTO v_role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1;
    IF v_role != 'super_admin' OR v_role IS NULL THEN
        RAISE EXCEPTION 'أنت لا تملك صلاحية سوبر أدمن لتنفيذ هذا الإجراء.';
    END IF;

    -- Delete from profiles triggers CASCADE for ALL linked data above
    DELETE FROM public.profiles WHERE id = p_target_user_id;
    -- Delete from auth system
    DELETE FROM auth.users WHERE id = p_target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- [5] TRUCK PRICING UPDATE FUNCTION
CREATE OR REPLACE FUNCTION admin_update_truck_price(p_truck_id UUID, p_new_price NUMERIC)
RETURNS void AS $$
DECLARE
    v_role text;
BEGIN
    -- Check if requester is admin/super_admin
    SELECT role INTO v_role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1;
    
    IF v_role NOT IN ('admin', 'super_admin') OR v_role IS NULL THEN
        RAISE EXCEPTION 'غير مصرح لك بتعديل أسعار الشاحنات.';
    END IF;

    UPDATE public.trucks SET rent_price = p_new_price WHERE id = p_truck_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- [6] DYNAMIC SHIPMENT CATEGORIES & PRICING
-- 1. Truck Categories (Treila, Sex, etc.)
CREATE TABLE IF NOT EXISTS public.truck_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name_ar TEXT NOT NULL UNIQUE,
    name_en TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Load Body Types (Refrigerator, Sides, etc.)
CREATE TABLE IF NOT EXISTS public.load_body_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name_ar TEXT NOT NULL UNIQUE,
    name_en TEXT,
    category_id UUID REFERENCES public.truck_categories(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Dynamic Pricing Table (Intersection of Truck + Body)
CREATE TABLE IF NOT EXISTS public.shipment_type_pricing (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    truck_category_id UUID REFERENCES public.truck_categories(id) ON DELETE CASCADE,
    body_type_id UUID REFERENCES public.load_body_types(id) ON DELETE CASCADE,
    base_price NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(truck_category_id, body_type_id)
);

-- Enable RLS
ALTER TABLE public.truck_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.load_body_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipment_type_pricing ENABLE ROW LEVEL SECURITY;

-- Policies: Everyone can view, only Admin can edit
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Public can view active truck categories" ON public.truck_categories;
    DROP POLICY IF EXISTS "Public can view active body types" ON public.load_body_types;
    DROP POLICY IF EXISTS "Public can view pricing" ON public.shipment_type_pricing;
    DROP POLICY IF EXISTS "Admin can manage categories" ON public.truck_categories;
    DROP POLICY IF EXISTS "Admin can manage body types" ON public.load_body_types;
    DROP POLICY IF EXISTS "Admin can manage pricing" ON public.shipment_type_pricing;
END $$;

CREATE POLICY "Public can view active truck categories" ON public.truck_categories FOR SELECT USING (is_active = true);
CREATE POLICY "Public can view active body types" ON public.load_body_types FOR SELECT USING (is_active = true);
CREATE POLICY "Public can view pricing" ON public.shipment_type_pricing FOR SELECT USING (true);

-- Admin full access
CREATE POLICY "Admin can manage categories" ON public.truck_categories FOR ALL USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')));
CREATE POLICY "Admin can manage body types" ON public.load_body_types FOR ALL USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')));
CREATE POLICY "Admin can manage pricing" ON public.shipment_type_pricing FOR ALL USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')));

-- [7] SEEDING INITIAL DATA FROM IMAGES
INSERT INTO public.truck_categories (name_ar) VALUES 
('تريلا'), ('سكس'), ('لوري'), 
('دينا'), ('بيك اب'), ('فان'), 
('ناقلة سيارات'), ('معدات الثقيل')
ON CONFLICT (name_ar) DO NOTHING;

INSERT INTO public.load_body_types (name_ar) VALUES 
('عادي'), ('صندوق مغلق'), ('برادة (ثلاجة)'), ('ثلاجة'), ('برادة'),
('جوانب'), ('جوانب عالية'), ('جوانب ألماني'), ('ستارة'), ('سطحه'), 
('سطحة سحب (ونش ريكفري)'), ('مغلقة (مقفل)'), ('مفتوحة ذات طابقين'),
('معدات تحريك التربة'), ('معدات النقل ومناولة المواد'), ('آلات بناء الطرق'), 
('معدات الرفع وأعمال الأساسات'), ('معدات الخرسانة والخلط'),
('قلابة'), ('لوبد'), ('مقطورة حاوية'), 
('صهريج'), ('شبك'), ('بونش'), ('تانكي'), 
('جامبو')
ON CONFLICT (name_ar) DO NOTHING;

ALTER TABLE public.trucks 
ADD COLUMN IF NOT EXISTS truck_category_id UUID REFERENCES public.truck_categories(id),
ADD COLUMN IF NOT EXISTS body_type_id UUID REFERENCES public.load_body_types(id),
ADD COLUMN IF NOT EXISTS commodity_id UUID REFERENCES public.shipment_commodities(id);

-- [8.1] ADD MISSING COLUMN TO LOAD_BODY_TYPES
ALTER TABLE public.load_body_types 
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.truck_categories(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS capacity_tons NUMERIC,
ADD COLUMN IF NOT EXISTS length_meters NUMERIC;

-- [9] ASSOCIATE BODY TYPES WITH CATEGORIES
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
    SELECT id INTO trella_id FROM public.truck_categories WHERE name_ar = 'تريلا' LIMIT 1;
    SELECT id INTO sex_id FROM public.truck_categories WHERE name_ar = 'سكس' LIMIT 1;
    SELECT id INTO lorry_id FROM public.truck_categories WHERE name_ar = 'لوري' LIMIT 1;
    SELECT id INTO dyna_id FROM public.truck_categories WHERE name_ar = 'دينا' LIMIT 1;
    SELECT id INTO pickup_id FROM public.truck_categories WHERE name_ar = 'بيك اب' LIMIT 1;
    SELECT id INTO van_id FROM public.truck_categories WHERE name_ar = 'فان' LIMIT 1;
    SELECT id INTO car_carrier_id FROM public.truck_categories WHERE name_ar = 'ناقلة سيارات' LIMIT 1;
    SELECT id INTO heavy_equip_id FROM public.truck_categories WHERE name_ar = 'معدات الثقيل' LIMIT 1;

    -- 1. Trella associations
    UPDATE public.load_body_types SET category_id = trella_id, capacity_tons = 25, length_meters = 13
    WHERE name_ar IN ('جوانب', 'جوانب عالية', 'جوانب ألماني', 'ستارة', 'سطحه', 'لوبد', 'مقطورة حاوية', 'صهريج', 'جامبو', 'برادة');
    
    -- 2. Sex & Lorry (Shared types but need individual entries due to 1:M schema)
    -- We'll link the existing ones to Lorry first
    UPDATE public.load_body_types SET category_id = lorry_id, capacity_tons = 8, length_meters = 6
    WHERE name_ar IN ('عادي', 'برادة (ثلاجة)', 'شبك', 'قلابة', 'تانكي');
    
    -- Now create duplicates for Sex (13 ton) so it also has data
    INSERT INTO public.load_body_types (name_ar, category_id, capacity_tons, length_meters) VALUES 
    ('سكس عادي', sex_id, 13, 8), 
    ('سكس شبك', sex_id, 13, 8), 
    ('سكس قلابة', sex_id, 13, 6), 
    ('سكس تانكي', sex_id, 13, 8),
    ('سكس جوانب', sex_id, 11, 9),
    ('سكس ثلاجة مجمد', sex_id, 11, 9)
    ON CONFLICT DO NOTHING;

    -- 3. Dyna associations
    UPDATE public.load_body_types SET category_id = dyna_id 
    WHERE name_ar IN ('صندوق مغلق', 'ثلاجة');
    -- Some were already used, let's ensure unique entries if needed or just update
    -- Note: 'برادة (ثلاجة)' and 'ستارة' were mapped to Lorry/Trella, we need new ones for Dyna
    INSERT INTO public.load_body_types (name_ar, category_id) VALUES 
    ('ستارة (دينا)', dyna_id), ('برادة (دينا)', dyna_id)
    ON CONFLICT DO NOTHING;

    -- 4. Pickup associations
    UPDATE public.load_body_types SET category_id = pickup_id 
    WHERE name_ar IN ('بونش');
    INSERT INTO public.load_body_types (name_ar, category_id) VALUES 
    ('عادي (بيك اب)', pickup_id), ('صندوق مغلق (بيك اب)', pickup_id)
    ON CONFLICT DO NOTHING;

    -- 5. Van associations
    UPDATE public.load_body_types SET category_id = van_id 
    WHERE name_ar IN ('مغلقة (مقفل)');
    -- Add shared 'برادة' for Van
    INSERT INTO public.load_body_types (name_ar, category_id) VALUES 
    ('برادة (فان)', van_id)
    ON CONFLICT DO NOTHING;

    -- 6. Car Carrier
    INSERT INTO public.load_body_types (name_ar, category_id) VALUES 
    ('مفتوحة ذات طابقين', car_carrier_id), ('سطحة سحب (ونش ريكفري)', car_carrier_id)
    ON CONFLICT DO NOTHING;

    -- 7. Heavy Equipment
    INSERT INTO public.load_body_types (name_ar, category_id) VALUES 
    ('معدات تحريك التربة', heavy_equip_id), ('معدات النقل ومناولة المواد', heavy_equip_id), 
    ('آلات بناء الطرق', heavy_equip_id), ('معدات الرفع وأعمال الأساسات', heavy_equip_id), 
    ('معدات الخرسانة والخلط', heavy_equip_id)
    ON CONFLICT DO NOTHING;

END $$;

-- [10] SHIPMENT COMMODITIES (New Level of Selection)
CREATE TABLE IF NOT EXISTS public.shipment_commodities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name_ar TEXT NOT NULL UNIQUE,
    name_en TEXT,
    icon TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.shipment_commodities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view active commodities" ON public.shipment_commodities FOR SELECT USING (is_active = true);
CREATE POLICY "Admin can manage commodities" ON public.shipment_commodities FOR ALL USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')));

-- Seed data
INSERT INTO public.shipment_commodities (name_ar, icon) VALUES 
('بضائع عامة', '📦'),
('مواد غذائية', '🍱'),
('مواد بناء', '🏗️'),
('أثاث ومفروشات', '🛋️'),
('إلكترونيات', '💻'),
('مواد بلاستيكية', '🥤'),
('ملابس ومنسوجات', '👕'),
('مواد كيميائية', '🧪'),
('آلات ومعدات', '⚙️'),
('أخرى', '➕')
ON CONFLICT (name_ar) DO NOTHING;
