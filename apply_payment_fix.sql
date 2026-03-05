-- ==========================================
-- SQL Fix: Atomic Payment Approval
-- ==========================================

-- 1. التأكد من وجود الأعمدة اللازمة في جدول الحركات المالية
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='financial_transactions' AND column_name='status') THEN
        ALTER TABLE public.financial_transactions ADD COLUMN status VARCHAR(20) DEFAULT 'completed';
    END IF;
END $$;

-- 2. إنشاء وظيفة الاعتماد الذرية (Atomic)
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
        v_description := 'سداد مديونية - إيصال: ' || substring(p_payment_id::text from 1 for 8);
        IF v_payment.shipper_notes IS NOT NULL THEN
            v_description := v_description || chr(10) || '- ملاحظة التاجر: ' || v_payment.shipper_notes;
        END IF;
        IF p_admin_notes IS NOT NULL THEN
            v_description := v_description || chr(10) || '- إفادة الإدارة: ' || p_admin_notes;
        END IF;

        -- إدراج الحركة (تريجر update_wallet_balance سيهتم بتحديث الرصيد آلياً)
        INSERT INTO public.financial_transactions (
            wallet_id, 
            amount, 
            type, 
            transaction_type, 
            description,
            status
        ) VALUES (
            v_wallet_id,
            v_payment.amount,
            'credit',
            'settlement',
            v_description,
            'completed'
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. إجبار Supabase على تحديث ذاكرة الواجهة البرمجية
NOTIFY pgrst, 'reload schema';
