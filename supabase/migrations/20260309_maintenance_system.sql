
-- Create maintenance_requests table
CREATE TABLE IF NOT EXISTS public.maintenance_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    load_id UUID REFERENCES public.loads(id) ON DELETE SET NULL,
    category TEXT NOT NULL CHECK (category IN ('fuel', 'tire', 'mechanical', 'oil', 'other')),
    description TEXT,
    images TEXT[] DEFAULT '{}', -- Array of image URLs (live shots)
    repair_cost NUMERIC(10, 2) DEFAULT 0,
    invoice_image TEXT, -- Invoice photo
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    payment_status TEXT DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid')),
    admin_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.maintenance_requests ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Drivers can view their own maintenance requests"
    ON public.maintenance_requests FOR SELECT
    USING (auth.uid() = driver_id);

CREATE POLICY "Drivers can create their own maintenance requests"
    ON public.maintenance_requests FOR INSERT
    WITH CHECK (auth.uid() = driver_id);

CREATE POLICY "Admins can view all maintenance requests"
    ON public.maintenance_requests FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND status = 'admin'
        )
    );

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_maintenance_requests_updated_at
    BEFORE UPDATE ON public.maintenance_requests
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();
