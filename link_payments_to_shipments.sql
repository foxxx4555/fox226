-- ==========================================
-- SQL Fix: Link Payments to Shipments Natively
-- ==========================================

-- 1. التأكد من وجود عمود shipment_id في جدول الحركات المالية
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='financial_transactions' AND column_name='shipment_id') THEN
        ALTER TABLE public.financial_transactions ADD COLUMN shipment_id UUID REFERENCES public.loads(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 2. تحديث وظيفة الاعتماد الذرية (Atomic) لتربط الحركة بالشحنة
CREATE OR REPLACE FUNCTION public.handle_shipper_payment_approval(
    p_payment_id UUID,
    p_status TEXT,
    p_admin_notes TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
    v_payment RECORD;
    v_wallet_id UUID;
    v_description TEXT;
BEGIN
    -- ضبط مسار البحث للأمان
    SET search_path = public;

    -- جلب بيانات الإيصال مع غلق السجل للتعديل (Lock)
    SELECT * INTO v_payment FROM public.shipper_payments WHERE id = p_payment_id FOR UPDATE;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'الإيصال غير موجود أو تم حذفه';
    END IF;

    -- التحقق من عدم تكرار الاعتماد
    IF v_payment.status = 'approved' AND p_status = 'approved' THEN
        RAISE NOTICE 'هذا الإيصال تم اعتماده مسبقاً';
        RETURN;
    END IF;

    -- تحديث حالة الإيصال
    UPDATE public.shipper_payments 
    SET 
        status = p_status,
        admin_notes = p_admin_notes,
        processed_at = now(),
        updated_at = now()
    WHERE id = p_payment_id;

    -- في حال الموافقة، إنشاء الحركة المالية
    IF p_status = 'approved' THEN
        -- جلب أو إنشاء محفظة التاجر
        SELECT wallet_id INTO v_wallet_id FROM public.wallets 
        WHERE user_id = v_payment.shipper_id AND user_type = 'shipper';

        IF v_wallet_id IS NULL THEN
            INSERT INTO public.wallets (user_id, user_type, balance) 
            VALUES (v_payment.shipper_id, 'shipper', 0.00)
            RETURNING wallet_id INTO v_wallet_id;
        END IF;

        -- تجهيز الوصف بالعربية
        v_description := 'سداد مستحقات شحنة';
        IF v_payment.shipment_id IS NULL THEN
            v_description := 'سداد مديونية عامة - إيصال: ' || substring(p_payment_id::text from 1 for 8);
        END IF;

        IF v_payment.shipper_notes IS NOT NULL THEN
            v_description := v_description || chr(10) || '- ملاحظة: ' || v_payment.shipper_notes;
        END IF;

        -- إدراج الحركة (تريجر update_wallet_balance سيهتم بتحديث الرصيد آلياً)
        INSERT INTO public.financial_transactions (
            wallet_id, 
            amount, 
            type, 
            transaction_type, 
            description,
            status,
            shipment_id
        ) VALUES (
            v_wallet_id,
            v_payment.amount,
            'credit',
            'settlement',
            v_description,
            'completed',
            v_payment.shipment_id
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. تحديث الحركات السابقة بناءً على الوصف إذا أمكن (اختياري)
UPDATE public.financial_transactions ft
SET shipment_id = sp.shipment_id
FROM public.shipper_payments sp
WHERE ft.transaction_type = 'settlement' 
  AND ft.description LIKE '%' || substring(sp.id::text from 1 for 8) || '%'
  AND ft.shipment_id IS NULL 
  AND sp.shipment_id IS NOT NULL;

-- 4. إجبار Supabase على تحديث ذاكرة الواجهة البرمجية
NOTIFY pgrst, 'reload schema';
