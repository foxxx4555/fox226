-- 20260312_master_reset.sql
-- Safely clear all financial and shipment data for a fresh start

CREATE OR REPLACE FUNCTION public.master_reset_financial_data()
RETURNS VOID AS $$
BEGIN
    -- 1. Disable triggers temporarily if needed (optional but safer)
    -- SET session_replication_role = 'replica';

-- 2. Add missing columns if they were skipped in previous migrations
ALTER TABLE public.wallets ADD COLUMN IF NOT EXISTS frozen_balance DECIMAL(20, 2) DEFAULT 0.00 CHECK (frozen_balance >= 0);

-- 3. Truncate tables with CASCADE to handle foreign keys
    TRUNCATE TABLE 
        public.payout_receipts,
        public.withdrawal_requests,
        public.shipper_payments,
        public.financial_transactions,
        public.invoices,
        public.shipment_finances,
        public.loads,
        public.notifications,
        public.audit_logs,
        public.ratings
    RESTART IDENTITY CASCADE;

    -- 3. Reset Wallet Balances
    -- We don't truncate wallets because they are tied to profiles, 
    -- but we must reset their balances to 0.
    UPDATE public.wallets 
    SET balance = 0.00, 
        frozen_balance = 0.00
    WHERE true;

    -- 4. Re-insert Platform Wallet (if it was somehow removed, though wallets weren't truncated)
    INSERT INTO public.wallets (user_type, balance, frozen_balance, currency) 
    SELECT 'platform', 0.00, 0.00, 'SAR'
    WHERE NOT EXISTS (SELECT 1 FROM public.wallets WHERE user_type = 'platform');

    -- Restore session role
    -- SET session_replication_role = 'origin';

    RAISE NOTICE 'MASTER RESET COMPLETE. All financial data, shipments, and balances have been cleared.';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Reload Schema
NOTIFY pgrst, 'reload schema';
