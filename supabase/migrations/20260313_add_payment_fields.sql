-- Migration to add missing columns to shipper_payments
-- Date: 2026-03-13

DO $$ 
BEGIN
    -- Add invoice_ids column as an array of TEXT/UUID
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='shipper_payments' AND column_name='invoice_ids') THEN
        ALTER TABLE shipper_payments ADD COLUMN invoice_ids TEXT[];
    END IF;

    -- Add reference_number column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='shipper_payments' AND column_name='reference_number') THEN
        ALTER TABLE shipper_payments ADD COLUMN reference_number TEXT;
    END IF;
END $$;
