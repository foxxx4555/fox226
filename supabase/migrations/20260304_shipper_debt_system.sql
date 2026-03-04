-- ------------------------------------------------------
-- التحويل إلى نظام المديونية والتصفية المالية للشاحن
-- ------------------------------------------------------

-- 1. تحديث تريجر تعيين الشحنة ليشمل تسجيل الدين في سجل المعاملات
CREATE OR REPLACE FUNCTION public.handle_load_assignment()
RETURNS TRIGGER AS $$
DECLARE
    v_wallet_id UUID;
BEGIN
    -- ضبط مسار البحث للأمان
    SET search_path = public;

    -- إذا تم تعيين سائق جديد للشحنة
    IF (NEW.driver_id IS NOT NULL AND (OLD.driver_id IS NULL OR OLD.driver_id != NEW.driver_id)) THEN
        -- أولاً: تحديث البيانات المالية العامة (shipment_finances)
        INSERT INTO public.shipment_finances (
            shipment_id, shipper_id, carrier_id, 
            shipment_price, carrier_amount, platform_commission
        ) VALUES (
            NEW.id, NEW.owner_id, NEW.driver_id,
            NEW.price, NEW.price * 0.9, NEW.price * 0.1
        ) ON CONFLICT (shipment_id) DO UPDATE SET
            carrier_id = EXCLUDED.carrier_id,
            shipment_price = EXCLUDED.shipment_price,
            carrier_amount = EXCLUDED.carrier_amount,
            platform_commission = EXCLUDED.platform_commission;

        -- ثانياً: تسجيل "مديونية" (Debt) في محفظة الشاحن
        SELECT wallet_id INTO v_wallet_id FROM public.wallets WHERE user_id = NEW.owner_id LIMIT 1;
        
        IF v_wallet_id IS NOT NULL THEN
            -- إذا كان هناك سجل سابق لنفس الشحنة، نحذفه لتجنب التكرار (عند إعادة التعيين مثلاً)
            DELETE FROM public.financial_transactions WHERE shipment_id = NEW.id AND transaction_type = 'debt';
            
            INSERT INTO public.financial_transactions (
                wallet_id,
                amount,
                type,
                transaction_type,
                description,
                shipment_id,
                status
            ) VALUES (
                v_wallet_id,
                NEW.price,
                'debit', -- الخصم في المحاسبة يزيد المديونية في حالة الخصوم
                'debt',
                'رسوم شحنة من ' || COALESCE(NEW.origin, 'غير معروف'),
                NEW.id,
                'completed'
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. تحديث تريجر المحفظة ليعامل الديون (Debit) كزيادة في المبالغ المطلوبة للشاحن
-- وكزيادة في الرصيد للسائق عند الربح (Credit)
CREATE OR REPLACE FUNCTION public.update_wallet_balance()
RETURNS TRIGGER AS $$
DECLARE
    v_user_role TEXT;
BEGIN
    SET search_path = public;
    
    -- جلب دور المستخدم المرتبط بالمحفظة
    SELECT p.role INTO v_user_role 
    FROM public.profiles p 
    JOIN public.wallets w ON p.id = w.user_id 
    WHERE w.wallet_id = NEW.wallet_id;

    IF (TG_OP = 'INSERT') THEN
        IF v_user_role = 'shipper' THEN
            -- للشاحن: الرصيد يمثل "مديونية"
            -- Debit (دين) يزيد المديونية، Credit (سداد) ينقصها
            IF (NEW.type = 'credit') THEN
                UPDATE public.wallets SET balance = balance - NEW.amount WHERE wallet_id = NEW.wallet_id;
            ELSIF (NEW.type = 'debit') THEN
                UPDATE public.wallets SET balance = balance + NEW.amount WHERE wallet_id = NEW.wallet_id;
            END IF;
        ELSE
            -- للسائق أو غيره: الرصيد يمثل "أرباح/كاش"
            -- Credit (ربح) يزيد الرصيد، Debit (سحب) ينقصه
            IF (NEW.type = 'credit') THEN
                UPDATE public.wallets SET balance = balance + NEW.amount WHERE wallet_id = NEW.wallet_id;
            ELSIF (NEW.type = 'debit') THEN
                UPDATE public.wallets SET balance = balance - NEW.amount WHERE wallet_id = NEW.wallet_id;
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. تصفية الديون ومسح سجلات الحركة (Clear & Settlement)
-- تحديث الوظيفة لتنسجم مع المنطق الجديد
CREATE OR REPLACE FUNCTION public.clear_settled_debts(p_wallet_id UUID, p_amount DECIMAL)
RETURNS VOID AS $$
DECLARE
    v_remaining_to_clear DECIMAL := p_amount;
    v_debt RECORD;
BEGIN
    -- البحث عن الديون المتعلقة بهذه المحفظة ومسحها بالترتيب (الأقدم أولاً)
    FOR v_debt IN 
        SELECT id, amount FROM public.financial_transactions 
        WHERE wallet_id = p_wallet_id AND transaction_type = 'debt'
        ORDER BY created_at ASC
    LOOP
        IF v_remaining_to_clear <= 0 THEN
            EXIT;
        END IF;

        IF v_debt.amount <= v_remaining_to_clear THEN
            v_remaining_to_clear := v_remaining_to_clear - v_debt.amount;
            DELETE FROM public.financial_transactions WHERE id = v_debt.id;
        ELSE
            UPDATE public.financial_transactions 
            SET amount = amount - v_remaining_to_clear
            WHERE id = v_debt.id;
            v_remaining_to_clear := 0;
        END IF;
    END LOOP;

    -- حذف سجل السداد (settlement) نفسه لأنه استهلك لتصفية الديون رقمياً وبصرياً
    DELETE FROM public.financial_transactions 
    WHERE wallet_id = p_wallet_id AND transaction_type = 'settlement' AND amount = p_amount;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إعادة مزامنة الأرصدة الحالية (لضمان صحة البيانات السابقة)
DO $$
DECLARE
    w RECORD;
BEGIN
    FOR w IN SELECT wallet_id FROM public.wallets LOOP
        UPDATE public.wallets 
        SET balance = (
            COALESCE((SELECT SUM(amount) FROM public.financial_transactions WHERE wallet_id = w.wallet_id AND type = 'debit'), 0) -
            COALESCE((SELECT SUM(amount) FROM public.financial_transactions WHERE wallet_id = w.wallet_id AND type = 'credit'), 0)
        )
        WHERE wallet_id = w.wallet_id;
    END LOOP;
END $$;
