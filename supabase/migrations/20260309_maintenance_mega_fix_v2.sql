-- MEGA FIX V2: Ensure all columns and constraints exist with correct role checking

-- 1. Correct Trucks table
ALTER TABLE public.trucks 
ADD COLUMN IF NOT EXISTS truck_category_id UUID REFERENCES public.truck_categories(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS body_type_id UUID REFERENCES public.load_body_types(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS commodity_id UUID REFERENCES public.shipment_commodities(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS operation_card_number TEXT;

-- 2. Correct Maintenance Requests table
-- First, ensure columns exist
ALTER TABLE public.maintenance_requests 
ADD COLUMN IF NOT EXISTS load_id UUID,
ADD COLUMN IF NOT EXISTS truck_id UUID;

-- Second, apply foreign keys safely
ALTER TABLE public.maintenance_requests
DROP CONSTRAINT IF EXISTS maintenance_requests_load_id_fkey,
ADD CONSTRAINT maintenance_requests_load_id_fkey 
FOREIGN KEY (load_id) REFERENCES public.loads(id) ON DELETE SET NULL;

ALTER TABLE public.maintenance_requests
DROP CONSTRAINT IF EXISTS maintenance_requests_truck_id_fkey,
ADD CONSTRAINT maintenance_requests_truck_id_fkey 
FOREIGN KEY (truck_id) REFERENCES public.trucks(id) ON DELETE SET NULL;

-- 3. RLS Policies
ALTER TABLE public.maintenance_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Drivers can view their own maintenance requests" ON public.maintenance_requests;
CREATE POLICY "Drivers can view their own maintenance requests"
    ON public.maintenance_requests FOR SELECT
    USING (auth.uid() = driver_id);

DROP POLICY IF EXISTS "Drivers can create their own maintenance requests" ON public.maintenance_requests;
CREATE POLICY "Drivers can create their own maintenance requests"
    ON public.maintenance_requests FOR INSERT
    WITH CHECK (auth.uid() = driver_id);

-- Updated Admin Policy to check user_roles table instead of profiles.role
DROP POLICY IF EXISTS "Admins can view all maintenance requests" ON public.maintenance_requests;
CREATE POLICY "Admins can view all maintenance requests"
    ON public.maintenance_requests FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'super_admin', 'Admin', 'super_admin')
        )
        OR 
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND status = 'admin'
        )
    );

DROP POLICY IF EXISTS "Carriers can view maintenance requests for their trucks" ON public.maintenance_requests;
CREATE POLICY "Carriers can view maintenance requests for their trucks"
    ON public.maintenance_requests FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.trucks
            WHERE trucks.id = maintenance_requests.truck_id
            AND trucks.owner_id = auth.uid()
        )
    );
