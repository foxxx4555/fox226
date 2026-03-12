-- ======================================================
-- تطوير البنية التحتية المالية لدورة العمل الكاملة
-- إضافة الأرصدة المجمدة وتحسين سندات الصرف
-- ======================================================

-- 1. إضافة عمود الرصيد المجمد للمحفظة
ALTER TABLE public.wallets ADD COLUMN IF NOT EXISTS frozen_balance DECIMAL(20, 2) DEFAULT 0.00 CHECK (frozen_balance >= 0);

-- 2. تحديث جدول طلبات السحب لدعم تفاصيل التحويل البنكي (سند الصرف)
ALTER TABLE public.withdrawal_requests ADD COLUMN IF NOT EXISTS bank_name_used VARCHAR(100);
ALTER TABLE public.withdrawal_requests ADD COLUMN IF NOT EXISTS transaction_reference VARCHAR(100);

-- 3. وظيفة اعتماد أرباح الشحنة (من مجمد إلى متاح)
CREATE OR REPLACE FUNCTION public.approve_carrier_earnings(p_shipment_id UUID)
RETURNS VOID AS $$
DECLARE
    v_carrier_id UUID;
    v_carrier_wallet_id UUID;
    v_amount DECIMAL;
BEGIN
    -- جلب الناقل والمبلغ المستحق (صافي الناقل) من سجل المالية
    SELECT carrier_id, carrier_amount INTO v_carrier_id, v_amount
    FROM public.shipment_finances
    WHERE shipment_id = p_shipment_id;

    IF v_carrier_id IS NULL THEN
        RAISE EXCEPTION 'لم يتم العثور على ناقل مرتب بهده الشحنة';
    END IF;

    -- الحصول على محفظة الناقل
    SELECT wallet_id INTO v_carrier_wallet_id FROM public.wallets WHERE user_id = v_carrier_id AND user_type = 'carrier';

    -- الانتقال من المجمد للمتاح
    UPDATE public.wallets 
    SET frozen_balance = GREATEST(0, COALESCE(frozen_balance, 0) - v_amount),
        balance = balance + v_amount
    WHERE wallet_id = v_carrier_wallet_id;

    -- تسجيل الحركة المالية كـ "متاحة"
    UPDATE public.financial_transactions
    SET status = 'completed'
    WHERE shipment_id = p_shipment_id AND wallet_id = v_carrier_wallet_id AND status = 'pending';

    -- تحديث حالة التسوية لضمان عدم التكرار
    UPDATE public.shipment_finances SET settlement_status = 'settled' WHERE shipment_id = p_shipment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. تعديل وظيفة التسوية لتجميد الأرباح فوراً عند انتهاء المشوار
CREATE OR REPLACE FUNCTION public.process_shipment_settlement(p_shipment_id UUID)
RETURNS VOID AS $$
DECLARE
    v_shipper_wallet_id UUID;
    v_carrier_wallet_id UUID;
    v_platform_wallet_id UUID;
    v_shipment RECORD;
BEGIN
    -- جلب تفاصيل الشحنة
    SELECT * INTO v_shipment FROM public.shipment_finances WHERE shipment_id = p_shipment_id FOR UPDATE;

    IF v_shipment.settlement_status = 'settled' OR v_shipment.settlement_status = 'held' THEN
        RETURN; -- تم المعالجة مسبقاً
    END IF;

    -- جلب المحافظ
    SELECT wallet_id INTO v_shipper_wallet_id FROM wallets WHERE user_id = v_shipment.shipper_id AND user_type = 'shipper';
    SELECT wallet_id INTO v_carrier_wallet_id FROM wallets WHERE user_id = v_shipment.carrier_id AND user_type = 'carrier';
    SELECT wallet_id INTO v_platform_wallet_id FROM wallets WHERE user_type = 'platform' LIMIT 1;

    -- 1. خصم من الشاحن (مديونية فورية)
    -- ملاحظة: الرصيد في محفظة الشاحن يمكن أن يكون سالباً (مديونية)
    UPDATE wallets SET balance = balance - v_shipment.shipment_price WHERE wallet_id = v_shipper_wallet_id;
    INSERT INTO financial_transactions (wallet_id, shipment_id, amount, type, transaction_type, status, description)
    VALUES (v_shipper_wallet_id, p_shipment_id, v_shipment.shipment_price, 'debit', 'debt', 'completed', 'رسوم شحنة #' || SUBSTRING(p_shipment_id::text, 1, 8));

    -- 2. إضافة للناقل في الرصيد "المجمد"
    UPDATE wallets SET frozen_balance = frozen_balance + v_shipment.carrier_amount WHERE wallet_id = v_carrier_wallet_id;
    INSERT INTO financial_transactions (wallet_id, shipment_id, amount, type, transaction_type, status, description)
    VALUES (v_carrier_wallet_id, p_shipment_id, v_shipment.carrier_amount, 'credit', 'earnings', 'pending', 'أرباح مجمدة لشحنة #' || SUBSTRING(p_shipment_id::text, 1, 8));

    -- 3. إضافة للمنصة (صافي العمولة)
    UPDATE wallets SET balance = balance + v_shipment.platform_commission WHERE wallet_id = v_platform_wallet_id;
    INSERT INTO financial_transactions (wallet_id, shipment_id, amount, type, transaction_type, status, description)
    VALUES (v_platform_wallet_id, p_shipment_id, v_shipment.platform_commission, 'credit', 'commission', 'completed', 'عمولة شحنة #' || SUBSTRING(p_shipment_id::text, 1, 8));

    -- تحديث الحالة لـ "محجوز" (Held) لانتظار تأكيد الإدارة
    UPDATE public.shipment_finances SET settlement_status = 'held' WHERE shipment_id = p_shipment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- تحديث الكاش
NOTIFY pgrst, 'reload schema';
