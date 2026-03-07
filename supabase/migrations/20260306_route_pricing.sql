-- Create route_pricing table for mileage-based pricing system
CREATE TABLE IF NOT EXISTS public.route_pricing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    origin_city TEXT NOT NULL,
    destination_city TEXT NOT NULL,
    distance_km DECIMAL NOT NULL,
    manual_price DECIMAL, -- NULL means use system calculation
    is_active BOOLEAN DEFAULT true,
    origin_lat DOUBLE PRECISION,
    origin_lng DOUBLE PRECISION,
    dest_lat DOUBLE PRECISION,
    dest_lng DOUBLE PRECISION,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.route_pricing ENABLE ROW LEVEL SECURITY;

-- Admin policies for route_pricing
CREATE POLICY "Admins can manage route pricing" ON public.route_pricing
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role::text = 'admin'
        )
    );

-- Anyone authenticated can view (for customer app calculation)
CREATE POLICY "Anyone authenticated can view route pricing" ON public.route_pricing
    FOR SELECT TO authenticated
    USING (true);

-- Trigger for updated_at (route_pricing)
CREATE TRIGGER update_route_pricing_updated_at 
    BEFORE UPDATE ON public.route_pricing 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Ensure system_settings has the pricing_config
CREATE TABLE IF NOT EXISTS public.system_settings (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for system_settings
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Admin policies for system_settings
CREATE POLICY "Admins can manage system settings" ON public.system_settings
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role::text = 'admin'
        )
    );

-- Anyone authenticated can view system settings
CREATE POLICY "Anyone authenticated can view system settings" ON public.system_settings
    FOR SELECT TO authenticated
    USING (true);

-- Insert initial values for system_settings if they don't exist
INSERT INTO public.system_settings (id, data)
VALUES 
    ('pricing_config', '{"price_per_km": 3.00, "base_fee": 100, "min_fare": 500, "commission": 10}'),
    ('content_config', '{"aboutUs": "", "privacyPolicy": ""}'),
    ('notification_config', '{"emailNotifications": true, "smsNotifications": true}')
ON CONFLICT (id) DO NOTHING;
