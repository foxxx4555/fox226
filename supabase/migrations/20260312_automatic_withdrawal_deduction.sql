-- وظيفة لخصم المبلغ من المحفظة عند الموافقة على طلب السحب
CREATE OR REPLACE FUNCTION public.handle_withdrawal_deduction()
RETURNS TRIGGER AS $$
DECLARE
    v_wallet_id UUID;
BEGIN
    -- التحقق إذا كانت الحالة تغيرت من 'pending' إلى 'approved'
    IF (OLD.status = 'pending' AND NEW.status = 'approved') THEN
        -- 1. جلب محفظة السائق
        SELECT wallet_id INTO v_wallet_id
        FROM public.wallets
        WHERE user_id = NEW.user_id AND user_type = 'carrier'
        LIMIT 1;

        IF v_wallet_id IS NULL THEN
            -- إذا لم تكن هناك محفظة، ننشئها للناقل
            INSERT INTO public.wallets (user_id, user_type, balance)
            VALUES (NEW.user_id, 'carrier', 0)
            RETURNING wallet_id INTO v_wallet_id;
        END IF;

        -- 2. خصم المبلغ من رصيد المحفظة
        UPDATE public.wallets
        SET balance = balance - NEW.amount
        WHERE wallet_id = v_wallet_id;
        
        -- 3. إدراج سجل في جدول العمليات المالية (financial_transactions) لتوثيق الخصم
        INSERT INTO public.financial_transactions (
            wallet_id, 
            amount, 
            type, 
            transaction_type, 
            description
        )
        VALUES (
            v_wallet_id, 
            NEW.amount, 
            'debit', 
            'withdrawal', 
            'سحب رصيد - طلب رقم ' || NEW.id
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إنشاء التريجر (Trigger)
DROP TRIGGER IF EXISTS on_withdrawal_approved ON public.withdrawal_requests;
CREATE TRIGGER on_withdrawal_approved
AFTER UPDATE ON public.withdrawal_requests
FOR EACH ROW
EXECUTE FUNCTION public.handle_withdrawal_deduction();
