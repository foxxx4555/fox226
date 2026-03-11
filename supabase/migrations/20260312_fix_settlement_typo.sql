-- 20260312_fix_settlement_typo.sql
-- Fixes a typo in process_shipment_settlement that prevents status updates from working

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
        -- FIX: Use v_shipment.platform_commission instead of v_platform_commission typo
        UPDATE public.wallets SET balance = balance + v_shipment.platform_commission WHERE wallet_id = v_platform_wallet_id;
        INSERT INTO public.financial_transactions (wallet_id, shipment_id, amount, type, transaction_type, status, description)
        VALUES (v_platform_wallet_id, p_shipment_id, v_shipment.platform_commission, 'credit', 'commission', 'completed', 'عمولة شحنة رقم #' || v_short_id);
    END IF;

    -- 4. إيقاظ "الفاتورة الضريبية" (Invoice Generation)
    v_vat_amount := v_shipment.shipment_price * 0.00; 
    
    INSERT INTO public.invoices (shipment_id, shipper_id, amount, vat, total_amount, payment_status)
    VALUES (p_shipment_id, v_shipment.shipper_id, v_shipment.shipment_price, v_vat_amount, v_shipment.shipment_price, 'unpaid')
    ON CONFLICT (shipment_id) DO NOTHING;

    -- 5. تحديث الحالة النهائية
    UPDATE public.shipment_finances SET settlement_status = 'held' WHERE shipment_id = p_shipment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
