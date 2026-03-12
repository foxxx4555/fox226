-- 1. إصلاح جدول الشحنات (إضافة الأعمدة المفقودة)
ALTER TABLE public.loads 
ADD COLUMN IF NOT EXISTS quantity NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS unit TEXT,
ADD COLUMN IF NOT EXISTS goods_value NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS insurance_value NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS payment_method TEXT;

-- 2. إصلاح وظيفة اعتماد الأرباح لضمان ظهورها في PostgREST بالمعاملات الصحيحة
CREATE OR REPLACE FUNCTION public.approve_carrier_earnings(p_shipment_id UUID)
RETURNS VOID AS $$
DECLARE
    v_carrier_id UUID;
    v_carrier_wallet_id UUID;
    v_amount DECIMAL;
BEGIN
    SET search_path = public;

    -- جلب بيانات الناقل والمبلغ من سجل المالية
    SELECT carrier_id, carrier_amount INTO v_carrier_id, v_amount
    FROM public.shipment_finances
    WHERE shipment_id = p_shipment_id;

    -- التأكد من وجود سجل مالي لهذه الشحنة
    IF v_carrier_id IS NULL THEN
        RAISE EXCEPTION 'Finance record not found for shipment_id: %', p_shipment_id;
    END IF;

    -- الحصول على محفظة الناقل
    SELECT wallet_id INTO v_carrier_wallet_id FROM public.wallets WHERE user_id = v_carrier_id AND user_type = 'carrier';

    IF v_carrier_wallet_id IS NOT NULL THEN
        -- 1. تحديث حالة المعاملة المالية من "معلق (Pending)" إلى "مكتمل (Completed)"
        UPDATE public.financial_transactions
        SET status = 'completed'
        WHERE shipment_id = p_shipment_id AND wallet_id = v_carrier_wallet_id AND status = 'pending';

        -- 2. نقل المبلغ من الرصيد المجمد إلى الرصيد المتاح
        UPDATE public.wallets 
        SET frozen_balance = GREATEST(0, COALESCE(frozen_balance, 0) - v_amount),
            balance = COALESCE(balance, 0) + v_amount
        WHERE wallet_id = v_carrier_wallet_id;

        -- 3. تحديث حالة التسوية النهائية للشحنة لضمان عدم تكرار الاعتماد
        UPDATE public.shipment_finances SET settlement_status = 'settled' WHERE shipment_id = p_shipment_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. تحديث صلاحيات الوصول لضمان عمل الـ RPC
GRANT EXECUTE ON FUNCTION public.approve_carrier_earnings(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_carrier_earnings(UUID) TO service_role;

-- 4. وظيفة SQL لحساب المديونية والرصيد المتاح (Security Definer لتجاوز قيود RLS للأدمن)
DROP FUNCTION IF EXISTS public.get_shipper_financial_summary(UUID[]);
CREATE OR REPLACE FUNCTION public.get_shipper_financial_summary(p_shipper_ids UUID[])
RETURNS TABLE (
    shipper_id UUID,
    total_paid NUMERIC,
    total_debt NUMERIC,
    net_balance NUMERIC,
    remaining_debt NUMERIC
) AS $$
DECLARE
    sid UUID;
BEGIN
    FOR sid IN SELECT unnest(p_shipper_ids) LOOP
        RETURN QUERY
        WITH p_sum AS (
            SELECT COALESCE(SUM(amount), 0) as val 
            FROM public.shipper_payments 
            WHERE shipper_payments.shipper_id = sid AND status = 'approved'
        ),
        d_sum AS (
            SELECT COALESCE(SUM(price), 0) as val 
            FROM public.loads 
            WHERE owner_id = sid AND status != 'cancelled'
        )
        SELECT 
            sid as shipper_id,
            p_sum.val::NUMERIC as total_paid,
            d_sum.val::NUMERIC as total_debt,
            (p_sum.val - d_sum.val)::NUMERIC as net_balance,
            GREATEST(0, d_sum.val - p_sum.val)::NUMERIC as remaining_debt
        FROM p_sum, d_sum;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_shipper_financial_summary(UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_shipper_financial_summary(UUID[]) TO service_role;

-- 6. تصحيح تريجر المحفظة لتوحيد منطق (سالب = مديونية) لجميع المستخدمين
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
        -- توحيد المنطق: Credit (إيداع/سداد/ربح) يزيد الرصيد، Debit (مديونية/سحب) ينقص الرصيد
        IF (v_user_role = 'shipper') THEN
            -- للشاحن: نعتبر الرصيد الموجب "فائض" والسالب "مديونية"
            IF (NEW.type = 'credit') THEN
                UPDATE public.wallets SET balance = COALESCE(balance, 0) + NEW.amount WHERE wallet_id = NEW.wallet_id;
            ELSIF (NEW.type = 'debit') THEN
                UPDATE public.wallets SET balance = COALESCE(balance, 0) - NEW.amount WHERE wallet_id = NEW.wallet_id;
            END IF;
        ELSE
            -- للناقل: نفس المنطق الحسابي (أرباح - سحب)
            IF (NEW.type = 'credit') THEN
                UPDATE public.wallets SET balance = COALESCE(balance, 0) + NEW.amount WHERE wallet_id = NEW.wallet_id;
            ELSIF (NEW.type = 'debit') THEN
                UPDATE public.wallets SET balance = COALESCE(balance, 0) - NEW.amount WHERE wallet_id = NEW.wallet_id;
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. إعادة مزامنة كافة أرصدة المحافظ للشاحنين بناءً على المنطق الموحد
DO $$
DECLARE
    w RECORD;
BEGIN
    FOR w IN SELECT wallet_id, user_id FROM public.wallets WHERE user_type = 'shipper' LOOP
        UPDATE public.wallets 
        SET balance = (
            COALESCE((SELECT SUM(amount) FROM public.shipper_payments WHERE shipper_id = w.user_id AND status = 'approved'), 0) -
            COALESCE((SELECT SUM(price) FROM public.loads WHERE owner_id = w.user_id AND status != 'cancelled'), 0)
        )
        WHERE wallet_id = w.wallet_id;
    END LOOP;
END $$;

-- 8. تعليق توضيحي للجدول
COMMENT ON TABLE public.loads IS 'Table for shipment loads with full shipping details and financial metadata';
