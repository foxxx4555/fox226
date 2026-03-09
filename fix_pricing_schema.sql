-- Migration to fix shipment_type_pricing table columns and constraints
-- This script ensures the table has all required fields: base_price, price_per_km, capacity_text, min_price, and is_active

DO $$ 
BEGIN
    -- [1] Ensure columns exist in public.shipment_type_pricing
    -- Add base_price if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shipment_type_pricing' AND column_name = 'base_price') THEN
        ALTER TABLE public.shipment_type_pricing ADD COLUMN base_price NUMERIC(15, 2) DEFAULT 0.00;
    END IF;

    -- Add price_per_km if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shipment_type_pricing' AND column_name = 'price_per_km') THEN
        ALTER TABLE public.shipment_type_pricing ADD COLUMN price_per_km NUMERIC(15, 2) DEFAULT 0.00;
    END IF;

    -- Add capacity_text if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shipment_type_pricing' AND column_name = 'capacity_text') THEN
        ALTER TABLE public.shipment_type_pricing ADD COLUMN capacity_text TEXT;
    END IF;

    -- Add min_price if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shipment_type_pricing' AND column_name = 'min_price') THEN
        ALTER TABLE public.shipment_type_pricing ADD COLUMN min_price NUMERIC(15, 2) DEFAULT 0.00;
    END IF;

    -- Add is_active if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shipment_type_pricing' AND column_name = 'is_active') THEN
        ALTER TABLE public.shipment_type_pricing ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;

    -- [2] Refresh the PostgREST schema cache (triggers automatically with DDL, but explicitly here)
    NOTIFY pgrst, 'reload schema';
END $$;
