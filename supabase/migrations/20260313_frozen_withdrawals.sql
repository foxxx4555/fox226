-- ======================================================
-- FROZEN WITHDRAWALS: Prevent double-spending of pending payouts
-- ======================================================

-- 1. Function to handle withdrawal REQUEST (Freeze funds)
CREATE OR REPLACE FUNCTION public.handle_withdrawal_request_freeze()
RETURNS TRIGGER AS $$
DECLARE
    v_wallet_id UUID;
    v_available_balance NUMERIC;
BEGIN
    SET search_path = public;

    -- Get carrier wallet and lock it
    SELECT wallet_id, balance INTO v_wallet_id, v_available_balance
    FROM public.wallets
    WHERE user_id = NEW.user_id AND user_type = 'carrier'
    FOR UPDATE;

    IF v_wallet_id IS NULL THEN
        RAISE EXCEPTION 'Carrier wallet not found';
    END IF;

    -- Check if balance is sufficient
    IF v_available_balance < NEW.amount THEN
        RAISE EXCEPTION 'Insufficient balance for withdrawal request';
    END IF;

    -- Move from balance to frozen_balance
    UPDATE public.wallets
    SET 
        balance = balance - NEW.amount,
        frozen_balance = frozen_balance + NEW.amount
    WHERE wallet_id = v_wallet_id;

    -- Log the FREEZE transaction (Status: pending)
    INSERT INTO public.financial_transactions (
        wallet_id, 
        amount, 
        type, 
        transaction_type, 
        status,
        description
    )
    VALUES (
        v_wallet_id, 
        NEW.amount, 
        'debit', 
        'withdrawal', 
        'pending',
        'تجميد سحب رصيد - طلب رقم ' || NEW.id
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Function to handle withdrawal APPROVAL/REJECTION (Clear freeze)
CREATE OR REPLACE FUNCTION public.handle_withdrawal_status_change()
RETURNS TRIGGER AS $$
DECLARE
    v_wallet_id UUID;
BEGIN
    SET search_path = public;

    -- Only proceed if status changed from pending
    IF (OLD.status = 'pending' AND NEW.status != 'pending') THEN
        
        -- Get carrier wallet
        SELECT wallet_id INTO v_wallet_id
        FROM public.wallets
        WHERE user_id = NEW.user_id AND user_type = 'carrier'
        LIMIT 1;

        IF NEW.status = 'approved' THEN
            -- Deduction already happened from balance at request time.
            -- Now just clear it from frozen_balance.
            UPDATE public.wallets
            SET frozen_balance = frozen_balance - NEW.amount
            WHERE wallet_id = v_wallet_id;

            -- Update transaction log to completed
            UPDATE public.financial_transactions
            SET status = 'completed',
                description = 'سحب رصيد مكتمل - طلب رقم ' || NEW.id
            WHERE wallet_id = v_wallet_id 
              AND amount = NEW.amount 
              AND transaction_type = 'withdrawal' 
              AND status = 'pending';

        ELSIF NEW.status = 'rejected' THEN
            -- Give the money back to the available balance
            UPDATE public.wallets
            SET 
                balance = balance + NEW.amount,
                frozen_balance = frozen_balance - NEW.amount
            WHERE wallet_id = v_wallet_id;

            -- Update transaction log to cancelled/rejected
            UPDATE public.financial_transactions
            SET status = 'cancelled',
                description = 'طلب سحب مرفوض - تم استرداد المبلغ - طلب رقم ' || NEW.id
            WHERE wallet_id = v_wallet_id 
              AND amount = NEW.amount 
              AND transaction_type = 'withdrawal' 
              AND status = 'pending';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Setup Triggers
DROP TRIGGER IF EXISTS trg_withdrawal_request_freeze ON public.withdrawal_requests;
CREATE TRIGGER trg_withdrawal_request_freeze
    BEFORE INSERT ON public.withdrawal_requests
    FOR EACH ROW EXECUTE FUNCTION public.handle_withdrawal_request_freeze();

DROP TRIGGER IF EXISTS on_withdrawal_approved ON public.withdrawal_requests; -- Remove the old one from 20260312_automatic_withdrawal_deduction.sql
DROP TRIGGER IF EXISTS trg_withdrawal_status_change ON public.withdrawal_requests;
CREATE TRIGGER trg_withdrawal_status_change
    AFTER UPDATE OF status ON public.withdrawal_requests
    FOR EACH ROW EXECUTE FUNCTION public.handle_withdrawal_status_change();

-- 4. Sync balances one last time (Safe repair)
DO $$
DECLARE
    w RECORD;
BEGIN
    FOR w IN SELECT wallet_id, user_id FROM public.wallets LOOP
        UPDATE public.wallets 
        SET balance = (
            COALESCE((SELECT SUM(amount) FROM public.financial_transactions WHERE wallet_id = w.wallet_id AND type = 'credit' AND status = 'completed'), 0) -
            COALESCE((SELECT SUM(amount) FROM public.financial_transactions WHERE wallet_id = w.wallet_id AND type = 'debit' AND status = 'completed'), 0)
        ),
        frozen_balance = (
            COALESCE((SELECT SUM(amount) FROM public.financial_transactions WHERE wallet_id = w.wallet_id AND transaction_type = 'earnings' AND status = 'pending'), 0) +
            COALESCE((SELECT SUM(amount) FROM public.financial_transactions WHERE wallet_id = w.wallet_id AND transaction_type = 'withdrawal' AND status = 'pending'), 0)
        )
        WHERE wallet_id = w.wallet_id;
    END LOOP;
END $$;
