-- 20260312_auto_frozen_earnings.sql
-- Automate shipment settlement and frozen earnings for drivers

-- 1. Create the Trigger Function
CREATE OR REPLACE FUNCTION public.trg_auto_settle_on_complete()
RETURNS TRIGGER AS $$
BEGIN
    -- Only trigger when status changes to 'completed'
    IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
        -- Call the settlement process
        -- This function handles creating shipment_finances, updating wallets, and transactions
        PERFORM public.process_shipment_settlement(NEW.id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Attach the Trigger to the loads table
DROP TRIGGER IF EXISTS trg_auto_settle_on_complete ON public.loads;
CREATE TRIGGER trg_auto_settle_on_complete
    AFTER UPDATE ON public.loads
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_auto_settle_on_complete();

-- 3. Retrospective Sync
-- This ensures any currently 'completed' shipments that weren't settled are processed now.
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT l.id 
        FROM public.loads l
        LEFT JOIN public.shipment_finances sf ON l.id = sf.shipment_id
        WHERE l.status = 'completed' 
        AND (sf.settlement_status IS NULL OR sf.settlement_status = 'pending')
    LOOP
        BEGIN
            PERFORM public.process_shipment_settlement(r.id);
        EXCEPTION WHEN OTHERS THEN
            -- Skip if error (e.g. missing driver details)
            RAISE NOTICE 'Skipping settlement for load %: %', r.id, SQLERRM;
        END;
    END LOOP;
END $$;

-- Reload Schema cache
NOTIFY pgrst, 'reload schema';
