-- Add missing columns to loads table
ALTER TABLE public.loads 
ADD COLUMN IF NOT EXISTS quantity NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS unit TEXT,
ADD COLUMN IF NOT EXISTS goods_value NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS insurance_value NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS payment_method TEXT;

-- Refresh schema cache
COMMENT ON TABLE public.loads IS 'Table for shipment loads with full shipping details';
