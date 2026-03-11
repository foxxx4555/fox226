-- ======================================================
-- سكربت الإصلاح الشامل لظهور البيانات لجميع المستخدمين
-- يضمن ظهور البيانات بغض النظر عن الحساب الذي تستخدمه
-- ======================================================

DO $$
DECLARE
    r RECORD;
    v_wallet_id UUID;
    v_invoice_id UUID;
BEGIN
    FOR r IN SELECT id, full_name FROM public.profiles LOOP
        
        -- 1. التأكد من وجود محفظة شاحن لكل مستخدم
        INSERT INTO public.wallets (user_id, user_type, balance, currency)
        VALUES (r.id, 'shipper', 22500.00, 'SAR')
        ON CONFLICT (user_id, user_type) DO UPDATE SET updated_at = NOW()
        RETURNING wallet_id INTO v_wallet_id;

        -- 2. إدراج حركات مالية تجريبية (إذا لم تكن موجودة)
        -- نمسح القديم لضمان التنسيق المحاسبي الجديد
        DELETE FROM public.financial_transactions WHERE wallet_id = v_wallet_id;
        
        INSERT INTO public.financial_transactions (wallet_id, amount, type, transaction_type, status, description, created_at)
        VALUES 
        (v_wallet_id, 0.00, 'deposit', 'deposit', 'completed', 'رصيد افتتاحي للمحفظة', '2026-03-01 08:00:00'),
        (v_wallet_id, 15000, 'debit', 'debt', 'completed', 'مستحقات شحنة #1002 (الرياض - جدة)', '2026-03-05 10:00:00'),
        (v_wallet_id, 2500, 'credit', 'credit', 'completed', 'سداد جزئي - حوالة بنكية #7721', '2026-03-10 14:30:00'),
        (v_wallet_id, 45000, 'credit', 'deposit', 'completed', 'شحن رصيد المحفظة - سداد مبكر', '2026-03-12 09:15:00'),
        (v_wallet_id, 10000, 'debit', 'debt', 'completed', 'مستحقات شحنة #1005 (الدمام - مكة)', '2026-03-15 11:45:00');

        -- 3. إدراج فواتير تجريبية (إذا لم تكن موجودة)
        IF NOT EXISTS (SELECT 1 FROM public.invoices WHERE shipper_id = r.id) THEN
            INSERT INTO public.invoices (
                shipper_id, amount, vat, total_amount, 
                amount_paid, balance, payment_status, created_at
            )
            VALUES 
            (r.id, 13000, 1950, 14950, 0, 14950, 'pending', NOW() - INTERVAL '3 days'),
            (r.id, 8000, 1200, 9200, 9200, 0, 'paid', NOW() - INTERVAL '7 days');
        END IF;

        RAISE NOTICE 'تم تجهيز البيانات للمستخدم: %', r.full_name;
    END LOOP;
END $$;

-- تحديث الكاش
NOTIFY pgrst, 'reload schema';
