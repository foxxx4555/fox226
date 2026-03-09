-- Add truck_id to maintenance_requests
ALTER TABLE public.maintenance_requests 
ADD COLUMN IF NOT EXISTS truck_id UUID REFERENCES public.trucks(id) ON DELETE SET NULL;

-- Update RLS policies to ensure carriers can see requests for their trucks
CREATE POLICY "Carriers can view maintenance requests for their trucks"
    ON public.maintenance_requests FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.trucks
            WHERE trucks.id = maintenance_requests.truck_id
            AND trucks.owner_id = auth.uid()
        )
    );
