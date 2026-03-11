-- ======================================================
-- سكربت إدراج فواتير تجريبية "مضمون" (نسخة منقحة بالكامل - بدون أخطاء أعمدة)
-- ======================================================

DO $$
DECLARE
    v_shipper_id UUID;
    v_invoice_id UUID;
BEGIN
    -- 1. البحث عن أي مستخدم بصيانة "فائقة الأمان" (أول مستخدم موجود في النظام)
    SELECT id INTO v_shipper_id 
    FROM public.profiles 
    ORDER BY created_at ASC 
    LIMIT 1;

    IF v_shipper_id IS NULL THEN
        RAISE NOTICE 'تحذير: لم يتم العثور على أي مستخدم في Profiles!';
        RETURN;
    END IF;

    -- 2. إدراج فاتورة 1 (مجمعة و مديونية عالقة)
    -- ملاحظة: تم حذف عمود 'status' لأنه غير موجود في الجدول، نعتمد على 'payment_status'
    INSERT INTO public.invoices (
        shipper_id, 
        amount, vat, total_amount, 
        amount_paid, balance, 
        payment_status, 
        created_at
    )
    VALUES (
        v_shipper_id, 
        13000, 1950, 14950, 
        0, 14950, 
        'pending', 
        NOW() - INTERVAL '3 days'
    )
    RETURNING invoice_id INTO v_invoice_id;

    -- إضافة بنود للفاتورة 1 (إذا كان الجدول موجوداً)
    BEGIN
        INSERT INTO public.invoice_items (invoice_id, amount) VALUES 
        (v_invoice_id, 5000), 
        (v_invoice_id, 4000), 
        (v_invoice_id, 4000);
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'تنبيه: لم يتم العثور على جدول invoice_items، تم إدراج رأس الفاتورة فقط.';
    END;

    -- 3. إدراج فاتورة 2 (مدفوعة بالكامل)
    INSERT INTO public.invoices (
        shipper_id, 
        amount, vat, total_amount, 
        amount_paid, balance, 
        payment_status, 
        created_at
    )
    VALUES (
        v_shipper_id, 
        8000, 1200, 9200, 
        9200, 0, 
        'paid', 
        NOW() - INTERVAL '7 days'
    )
    RETURNING invoice_id INTO v_invoice_id;

    -- إضافة بنود للفاتورة 2
    BEGIN
        INSERT INTO public.invoice_items (invoice_id, amount) VALUES 
        (v_invoice_id, 4000), 
        (v_invoice_id, 4000);
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    RAISE NOTICE 'تم إدراج البيانات التجريبية بنجاح للمستخدم ID: %', v_shipper_id;
END $$;

-- تجديد الكاش
NOTIFY pgrst, 'reload schema';
