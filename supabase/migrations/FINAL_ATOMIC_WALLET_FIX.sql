-- ======================================================
-- الإصلاح النهائي والقطعي لمشكلة ازدواجية الرصيد وأتمتة التجميد
-- يرجى تشغيل هذا الكود بالكامل في محرر SQL في Supabase
-- ======================================================

-- 1. التأكد من وجود عمود الرصيد المجمد (frozen_balance)
ALTER TABLE public.wallets ADD COLUMN IF NOT EXISTS frozen_balance DECIMAL(20, 2) DEFAULT 0.00 CHECK (frozen_balance >= 0);

-- 2. إيقاف الـ Triggers القديمة مؤقتاً لتنظيف النظام
DROP TRIGGER IF EXISTS on_financial_transaction ON public.financial_transactions;
DROP TRIGGER IF EXISTS on_load_completed ON public.loads;

-- 3. تحديث وظيفة تسوية الشحنات (Process Settlement) 
-- الوظيفة الآن تدعم التجميد الفوري (Held) بدلاً من الإيداع المباشر
CREATE OR REPLACE FUNCTION public.process_shipment_settlement(p_shipment_id UUID)
RETURNS VOID AS $$
DECLARE
    v_shipper_wallet_id UUID;
    v_carrier_wallet_id UUID;
    v_platform_wallet_id UUID;
    v_shipment RECORD;
BEGIN
    SET search_path = public;

    -- قفل السجل المالي للنظام لمنع العمليات المتوازية (Double Entry)
    SELECT * INTO v_shipment FROM public.shipment_finances WHERE shipment_id = p_shipment_id FOR UPDATE;

    -- إذا كانت الشحنة مسواة بالفعل أو محجوزة، نخرج فوراً لمنع التكرار
    IF v_shipment.settlement_status = 'settled' OR v_shipment.settlement_status = 'held' THEN
        RETURN;
    END IF;

    -- جلب أو إنشاء صناديق المحافظ
    SELECT wallet_id INTO v_shipper_wallet_id FROM wallets WHERE user_id = v_shipment.shipper_id AND user_type = 'shipper';
    SELECT wallet_id INTO v_carrier_wallet_id FROM wallets WHERE user_id = v_shipment.carrier_id AND user_type = 'carrier';
    SELECT wallet_id INTO v_platform_wallet_id FROM wallets WHERE user_type = 'platform' LIMIT 1;

    -- تطبيق الحركات المالية دفعة واحدة
    
    -- أ. مديونية الشاحن (مكتملة فوراً)
    INSERT INTO financial_transactions (wallet_id, shipment_id, amount, type, transaction_type, status, description)
    VALUES (v_shipper_wallet_id, p_shipment_id, v_shipment.shipment_price, 'debit', 'debt', 'completed', 'رسوم شحنة #' || SUBSTRING(p_shipment_id::text, 1, 8));

    -- ب. أرباح السائق (محجوزة/مجمدة - Status: pending)
    INSERT INTO financial_transactions (wallet_id, shipment_id, amount, type, transaction_type, status, description)
    VALUES (v_carrier_wallet_id, p_shipment_id, v_shipment.carrier_amount, 'credit', 'earnings', 'pending', 'أرباح مجمدة لشحنة #' || SUBSTRING(p_shipment_id::text, 1, 8));

    -- ج. عمولة المنصة (مكتملة فوراً)
    INSERT INTO financial_transactions (wallet_id, shipment_id, amount, type, transaction_type, status, description)
    VALUES (v_platform_wallet_id, p_shipment_id, v_shipment.platform_commission, 'credit', 'commission', 'completed', 'عمولة منصة شحنة #' || SUBSTRING(p_shipment_id::text, 1, 8));

    -- تحديث حالة الشحنة لتصبح "محجوزة" (Held) لانتظار اعتماد الإدارة
    UPDATE public.shipment_finances SET settlement_status = 'held' WHERE shipment_id = p_shipment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. إعادة بناء الـ Wallet Sync Trigger ليكون ذكياً (يفرق بين المتاح والمجمد)
CREATE OR REPLACE FUNCTION public.update_wallet_balance_v2()
RETURNS TRIGGER AS $$
BEGIN
    SET search_path = public;
    
    -- عند إضافة حركة مالية جديدة
    IF (TG_OP = 'INSERT') THEN
        -- إذا كانت الحركة "أرباح مجمدة" (Pending)، تذهب للرصيد المجمد فقط
        IF (NEW.transaction_type = 'earnings' AND NEW.status = 'pending') THEN
            UPDATE public.wallets SET frozen_balance = frozen_balance + NEW.amount WHERE wallet_id = NEW.wallet_id;
        
        -- الحركات العادية المكتملة (Completed) تذهب للرصيد المتاح
        ELSIF (NEW.status = 'completed') THEN
            IF (NEW.type = 'credit') THEN
                UPDATE public.wallets SET balance = balance + NEW.amount WHERE wallet_id = NEW.wallet_id;
            ELSIF (NEW.type = 'debit') THEN
                UPDATE public.wallets SET balance = balance - NEW.amount WHERE wallet_id = NEW.wallet_id;
            END IF;
        END IF;

    -- عند تحديث حالة الحركة (مثلاً من pending إلى completed)
    ELSIF (TG_OP = 'UPDATE') THEN
        IF (OLD.status = 'pending' AND NEW.status = 'completed' AND NEW.transaction_type = 'earnings') THEN
            -- سحب من المجمد وإيداع في المتاح
            UPDATE public.wallets 
            SET frozen_balance = frozen_balance - NEW.amount,
                balance = balance + NEW.amount 
            WHERE wallet_id = NEW.wallet_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- تفعيل الـ Trigger الجديد
CREATE TRIGGER on_financial_transaction_v2
    AFTER INSERT OR UPDATE ON public.financial_transactions
    FOR EACH ROW EXECUTE FUNCTION public.update_wallet_balance_v2();

-- 5. وظيفة إتمام الشحنة التلقائية (Auto-Settle Trigger)
CREATE OR REPLACE FUNCTION public.handle_load_completion_v2()
RETURNS TRIGGER AS $$
BEGIN
    SET search_path = public;
    IF (NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed')) THEN
        PERFORM public.process_shipment_settlement(NEW.id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_load_completed_v2
    AFTER UPDATE OF status ON public.loads
    FOR EACH ROW EXECUTE FUNCTION public.handle_load_completion_v2();

-- 6. تصفير الحسابات وإعادة المزامنة النهائية (Nuclear Polish)
DO $$
DECLARE
    w RECORD;
BEGIN
    -- هذا القسم يعيد حساب كافة الأرصدة من الصفر بناءً على سجل العمليات لضمان عدم وجود سنت واحد خطأ
    FOR w IN SELECT wallet_id FROM public.wallets LOOP
        -- تحديث الرصيد المتاح (فقط الحركات المكتملة)
        UPDATE public.wallets 
        SET balance = (
            COALESCE((SELECT SUM(amount) FROM public.financial_transactions WHERE wallet_id = w.wallet_id AND type = 'credit' AND status = 'completed'), 0) -
            COALESCE((SELECT SUM(amount) FROM public.financial_transactions WHERE wallet_id = w.wallet_id AND type = 'debit' AND status = 'completed'), 0)
        )
        WHERE wallet_id = w.wallet_id;

        -- تحديث الرصيد المجمد (فقط أرباح السواقين الـ Pending)
        UPDATE public.wallets 
        SET frozen_balance = COALESCE((SELECT SUM(amount) FROM public.financial_transactions WHERE wallet_id = w.wallet_id AND transaction_type = 'earnings' AND status = 'pending'), 0)
        WHERE wallet_id = w.wallet_id;
    END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
