-- 20260312_manual_payment_safety.sql
-- Strengthening manual payment oversight with audit logs and mandatory metadata

-- 1. Add new columns to shipper_payments table
ALTER TABLE public.shipper_payments 
ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'bank_transfer',
ADD COLUMN IF NOT EXISTS processed_by UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS admin_ip TEXT;

-- 2. Update existing entries to mark them as 'bank_transfer' if null
UPDATE public.shipper_payments 
SET payment_method = 'bank_transfer' 
WHERE payment_method IS NULL;

-- 3. Add comment for clarity
COMMENT ON COLUMN public.shipper_payments.processed_by IS 'The admin user who processed or manually entered this payment';
COMMENT ON COLUMN public.shipper_payments.payment_method IS 'Method of payment: cash, bank_transfer, check, stripe';

-- 4. Trigger for auditing processed_by automatically if not provided (optional but good)
-- For now we will handle it in the application logic for better control.

-- 5. Force schema cache reload
NOTIFY pgrst, 'reload schema';
