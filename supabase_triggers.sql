-- ============================================================
-- SQL Trigger System: Auto-Calculate Platform Commission
-- ============================================================

-- 1. Create the function that automatically handles the logic whenever a load is updated
CREATE OR REPLACE FUNCTION platform_commission_trigger_func()
RETURNS TRIGGER AS $$
DECLARE
    platform_fee_percent NUMERIC := 0.05; -- 5% commission, can be adjusted
    fee_amount DECIMAL(12,2);
BEGIN
    -- Only trigger when a load transitions to 'completed' status and price exists
    IF NEW.status = 'completed' AND OLD.status != 'completed' AND NEW.price IS NOT NULL THEN
        -- Calculate the 5% fee based on load price
        fee_amount := NEW.price * platform_fee_percent;
        
        -- Insert the commission into the transactions table
        -- We assign it to the owner (merchant) or we can leave user_id as system/null depending on tracking
        INSERT INTO public.transactions (
            user_id, 
            amount, 
            type, 
            status, 
            description
        ) VALUES (
            NEW.owner_id, 
            fee_amount, 
            'commission', 
            'completed', 
            'Platform commission (5%) for load: ' || NEW.id
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Attach the trigger to the 'loads' table
DROP TRIGGER IF EXISTS auto_commission_on_completion ON public.loads;

CREATE TRIGGER auto_commission_on_completion
AFTER UPDATE ON public.loads
FOR EACH ROW
EXECUTE FUNCTION platform_commission_trigger_func();
