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
        SET frozen_balance = COALESCE(frozen_balance, 0) - v_amount,
            balance = COALESCE(balance, 0) + v_amount
        WHERE wallet_id = v_carrier_wallet_id;

        -- 3. تحديث حالة التسوية النهائية للشحنة لضمان عدم تكرار الاعتماد
        UPDATE public.shipment_finances SET settlement_status = 'settled' WHERE shipment_id = p_shipment_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. منح الصلاحيات اللازمة للوظيفة البرمجية
GRANT EXECUTE ON FUNCTION public.approve_carrier_earnings(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_carrier_earnings(UUID) TO service_role;

-- 4. إجبار PostgREST على تحديث تعريفات قاعدة البيانات فوراً
NOTIFY pgrst, 'reload schema';

-- 5. تعليق توضيحي للجدول
COMMENT ON TABLE public.loads IS 'Table for shipment loads with full shipping details and financial metadata';
