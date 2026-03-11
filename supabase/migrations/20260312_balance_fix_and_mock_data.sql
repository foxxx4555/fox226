-- ======================================================
-- إصلاح تحديث المحفظة وتعريف وظيفة الاعتماد
-- ======================================================

-- 1. وظيفة معالجة اعتماد دفع الشاحن (تحديث المحفظة تلقائياً)
CREATE OR REPLACE FUNCTION public.handle_shipper_payment_approval(
    p_payment_id UUID,
    p_status TEXT,
    p_admin_notes TEXT DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
    v_shipper_id UUID;
    v_amount DECIMAL;
    v_wallet_id UUID;
BEGIN
    -- أ. جلب تفاصيل الدفع
    SELECT shipper_id, amount INTO v_shipper_id, v_amount
    FROM public.shipper_payments
    WHERE id = p_payment_id;

    -- ب. تحديث حالة إيصال السداد
    UPDATE public.shipper_payments
    SET status = p_status, 
        admin_notes = p_admin_notes,
        updated_at = NOW()
    WHERE id = p_payment_id;

    -- ج. إذا تم الاعتماد، نحدث رصيد المحفظة
    IF p_status = 'approved' THEN
        -- الحصول على المحفظة مع قفل للصف لضمان الدقة
        SELECT wallet_id INTO v_wallet_id
        FROM public.wallets
        WHERE user_id = v_shipper_id AND user_type = 'shipper'
        FOR UPDATE;

        IF FOUND THEN
            -- تحديث الرصيد (إضافة المبلغ المدفوع للرصيد الحالي)
            UPDATE public.wallets
            SET balance = balance + v_amount,
                updated_at = NOW()
            WHERE wallet_id = v_wallet_id;
            
            -- تسجيل كحركة مالية مكتملة
            INSERT INTO public.financial_transactions (wallet_id, amount, transaction_type, status, description)
            VALUES (v_wallet_id, v_amount, 'deposit', 'completed', 'اعتماد حوالة بنكية: ' || COALESCE(p_admin_notes, 'سداد فاتورة'));
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ======================================================
-- 2. توليد بيانات تجريبية للفواتير المجمعة لقاعدة البيانات
-- ======================================================

DO $$
DECLARE
    v_shipper_id UUID;
    v_invoice_id UUID;
BEGIN
    -- البحث عن أول شاحن متاح (أو المستخدم 'مهند')
    SELECT id INTO v_shipper_id FROM public.profiles WHERE full_name LIKE '%مهند%' OR role = 'shipper' LIMIT 1;

    IF v_shipper_id IS NOT NULL THEN
        -- فاتورة 1: مجمعة (5 شحنات) - غير مدفوعة
        INSERT INTO public.invoices (shipper_id, total_amount, amount_paid, balance, payment_status, created_at)
        VALUES (v_shipper_id, 15000, 0, 15000, 'pending', NOW() - INTERVAL '5 days')
        RETURNING invoice_id INTO v_invoice_id;

        -- إضافة بنود وهمية للفاتورة
        INSERT INTO public.invoice_items (invoice_id, amount) VALUES (v_invoice_id, 3000), (v_invoice_id, 3000), (v_invoice_id, 3000), (v_invoice_id, 3000), (v_invoice_id, 3000);

        -- فاتورة 2: مجمعة (3 شحنات) - مدفوعة بالكامل
        INSERT INTO public.invoices (shipper_id, total_amount, amount_paid, balance, payment_status, created_at)
        VALUES (v_shipper_id, 9000, 9000, 0, 'paid', NOW() - INTERVAL '10 days')
        RETURNING invoice_id INTO v_invoice_id;

        INSERT INTO public.invoice_items (invoice_id, amount) VALUES (v_invoice_id, 3000), (v_invoice_id, 3000), (v_invoice_id, 3000);

        -- فاتورة 3: مجمعة (4 شحنات) - متبقي رصيد
        INSERT INTO public.invoices (shipper_id, total_amount, amount_paid, balance, payment_status, created_at)
        VALUES (v_shipper_id, 12000, 5000, 7000, 'pending', NOW() - INTERVAL '2 days')
        RETURNING invoice_id INTO v_invoice_id;

        INSERT INTO public.invoice_items (invoice_id, amount) VALUES (v_invoice_id, 3000), (v_invoice_id, 3000), (v_invoice_id, 3000), (v_invoice_id, 3000);
    END IF;
END $$;

-- تحديث الكاش
NOTIFY pgrst, 'reload schema';
