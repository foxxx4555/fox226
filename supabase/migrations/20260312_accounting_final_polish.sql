-- ======================================================
-- تحسينات نهائية للدورة المحاسبية (الاصدار الاحترافي)
-- تشمل توليد الفواتير، تحسين مسميات العمليات، والمزامنة
-- ======================================================

-- 0. إنشاء مستودع تخزين الإيصالات إذا لم يوجد
INSERT INTO storage.buckets (id, name, public) 
VALUES ('receipts', 'receipts', true) 
ON CONFLICT (id) DO NOTHING;

-- 1. إضافة تسلسل رقمي للفواتير (Invoice Number) إذا لم يوجد
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS invoice_number SERIAL;

-- 2. تحديث وظيفة التسوية لتوليد فاتورة آلياً وتحسين الأوصاف
CREATE OR REPLACE FUNCTION public.process_shipment_settlement(p_shipment_id UUID)
RETURNS VOID AS $$
DECLARE
    v_shipper_wallet_id UUID;
    v_carrier_wallet_id UUID;
    v_platform_wallet_id UUID;
    v_shipment RECORD;
    v_short_id TEXT;
    v_vat_amount DECIMAL;
BEGIN
    -- ضبط مسار البحث للأمان
    SET search_path = public;
    
    -- استخراج كود قصير للشحنة
    v_short_id := SUBSTRING(p_shipment_id::text, 1, 8);

    -- 1. الحصول على تفاصيل التمويل للشحنة
    SELECT * INTO v_shipment FROM public.shipment_finances WHERE shipment_id = p_shipment_id FOR UPDATE;

    IF NOT FOUND THEN
        -- محاولة الإصلاح التلقائي
        INSERT INTO public.shipment_finances (shipment_id, shipper_id, carrier_id, shipment_price, carrier_amount, platform_commission)
        SELECT id, owner_id, driver_id, price, price * 0.9, price * 0.1
        FROM public.loads l WHERE l.id = p_shipment_id AND l.driver_id IS NOT NULL
        RETURNING * INTO v_shipment;
    END IF;

    -- منع التكرار (إلا إذا كانت الحالة "pending")
    IF v_shipment.settlement_status = 'settled' OR v_shipment.settlement_status = 'held' THEN
        RETURN;
    END IF;

    -- 2. جلب المحافظ (مع الإنشاء التلقائي إذا لزم الأمر)
    SELECT wallet_id INTO v_shipper_wallet_id FROM public.wallets WHERE user_id = v_shipment.shipper_id AND user_type = 'shipper';
    IF v_shipper_wallet_id IS NULL THEN
        INSERT INTO public.wallets (user_id, user_type) VALUES (v_shipment.shipper_id, 'shipper') RETURNING wallet_id INTO v_shipper_wallet_id;
    END IF;

    SELECT wallet_id INTO v_carrier_wallet_id FROM public.wallets WHERE user_id = v_shipment.carrier_id AND user_type = 'carrier';
    IF v_carrier_wallet_id IS NULL THEN
        INSERT INTO public.wallets (user_id, user_type) VALUES (v_shipment.carrier_id, 'carrier') RETURNING wallet_id INTO v_carrier_wallet_id;
    END IF;

    SELECT wallet_id INTO v_platform_wallet_id FROM public.wallets WHERE user_type = 'platform' LIMIT 1;

    -- 3. تنفيذ الحركات المالية ببيانات واضحة
    -- أ. مديونية الشاحن
    INSERT INTO public.financial_transactions (wallet_id, shipment_id, amount, type, transaction_type, status, description)
    VALUES (v_shipper_wallet_id, p_shipment_id, v_shipment.shipment_price, 'debit', 'debt', 'completed', 'رسوم شحنة رقم #' || v_short_id);

    -- ب. أرباح الناقل (توضع في الرصيد المجمد)
    UPDATE public.wallets SET frozen_balance = frozen_balance + v_shipment.carrier_amount WHERE wallet_id = v_carrier_wallet_id;
    INSERT INTO public.financial_transactions (wallet_id, shipment_id, amount, type, transaction_type, status, description)
    VALUES (v_carrier_wallet_id, p_shipment_id, v_shipment.carrier_amount, 'credit', 'earnings', 'pending', 'أرباح شحنة رقم #' || v_short_id);

    -- ج. عمولة المنصة
    IF v_platform_wallet_id IS NOT NULL THEN
        UPDATE public.wallets SET balance = balance + v_platform_commission WHERE wallet_id = v_platform_wallet_id;
        INSERT INTO public.financial_transactions (wallet_id, shipment_id, amount, type, transaction_type, status, description)
        VALUES (v_platform_wallet_id, p_shipment_id, v_shipment.platform_commission, 'credit', 'commission', 'completed', 'عمولة شحنة رقم #' || v_short_id);
    END IF;

    -- 4. إيقاظ "الفاتورة الضريبية" (Invoice Generation)
    -- حسب الحسبة الضريبية (نفترض السعر شامل الضريبة 15% للتبسيط إذا طلب ذلك لاحقاً)
    v_vat_amount := v_shipment.shipment_price * 0.00; -- حالياً نضعها 0 كما في الصور
    
    INSERT INTO public.invoices (shipment_id, shipper_id, amount, vat, total_amount, payment_status)
    VALUES (p_shipment_id, v_shipment.shipper_id, v_shipment.shipment_price, v_vat_amount, v_shipment.shipment_price, 'unpaid')
    ON CONFLICT (shipment_id) DO NOTHING;

    -- 5. تحديث الحالة النهائية
    UPDATE public.shipment_finances SET settlement_status = 'held' WHERE shipment_id = p_shipment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. مزامنة الفواتير المفقودة بأثر رجعي
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT sf.shipment_id, sf.shipper_id, sf.shipment_price
        FROM public.shipment_finances sf
        LEFT JOIN public.invoices inv ON sf.shipment_id = inv.shipment_id
        WHERE inv.invoice_id IS NULL AND (sf.settlement_status = 'settled' OR sf.settlement_status = 'held')
    LOOP
        INSERT INTO public.invoices (shipment_id, shipper_id, amount, vat, total_amount, payment_status)
        VALUES (r.shipment_id, r.shipper_id, r.shipment_price, 0.00, r.shipment_price, 'unpaid')
        ON CONFLICT DO NOTHING;
    END LOOP;
END $$;

-- 4. تحديث أوصاف العمليات المالية القديمة لتكون أكثر احترافية
UPDATE public.financial_transactions
SET description = 'أرباح شحنة رقم #' || SUBSTRING(shipment_id::text, 1, 8)
WHERE transaction_type = 'earnings' AND description NOT LIKE 'أرباح%';

UPDATE public.financial_transactions
SET description = 'رسوم شحنة رقم #' || SUBSTRING(shipment_id::text, 1, 8)
WHERE transaction_type = 'debt' AND description NOT LIKE 'رسوم%';

-- تحديث الكاش
NOTIFY pgrst, 'reload schema';
