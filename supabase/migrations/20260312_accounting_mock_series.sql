-- ======================================================
-- سكربت سلسلة المعاملات المالية "المحاسبي" (نسخة فائقة الأمان)
-- يرجى نسخ المحتوى بالكامل ووضعه في Supabase SQL Editor
-- ======================================================

DO $$
DECLARE
    v_shipper_id UUID;
    v_wallet_id UUID;
BEGIN
    -- 1. البحث عن أي مستخدم بصيانة "فائقة الأمان" (أول مستخدم موجود في النظام)
    -- هذا يتجنب تماماً أي أخطاء في أعمدة الصلاحيات أو الأسماء
    SELECT id INTO v_shipper_id 
    FROM public.profiles 
    ORDER BY created_at ASC 
    LIMIT 1;

    IF v_shipper_id IS NULL THEN
        RAISE NOTICE 'تحذير: لم يتم العثور على أي مستخدم في جدول Profiles!';
        RETURN;
    END IF;

    -- 2. الحصول على المحفظة (أو إنشاؤها إذا لم توجد)
    SELECT wallet_id INTO v_wallet_id FROM public.wallets WHERE user_id = v_shipper_id;
    
    IF v_wallet_id IS NULL THEN
        INSERT INTO public.wallets (user_id, user_type, balance) 
        VALUES (v_shipper_id, 'shipper', 0) 
        RETURNING wallet_id INTO v_wallet_id;
    END IF;

    -- تنظيف العمليات القديمة لهذا المستخدم لفحص دقيق
    DELETE FROM public.financial_transactions WHERE wallet_id = v_wallet_id;
    UPDATE public.wallets SET balance = 0 WHERE wallet_id = v_wallet_id;

    -- 3. إدراج سلسلة العمليات (بالترتيب الزمني لضبط الرصيد الجاري)
    
    -- عملية 1: رصيد افتتاحي (01-03-2026)
    INSERT INTO public.financial_transactions (wallet_id, amount, transaction_type, status, description, created_at)
    VALUES (v_wallet_id, 0.00, 'deposit', 'completed', 'رصيد افتتاحي للمحفظة', '2026-03-01 08:00:00');

    -- عملية 2: مديونية شحنة (05-03-2026) - دائن 15,000
    INSERT INTO public.financial_transactions (wallet_id, amount, transaction_type, status, description, created_at)
    VALUES (v_wallet_id, 15000, 'debit', 'completed', 'مستحقات شحنة #1002 (الرياض - جدة)', '2026-03-05 10:00:00');

    -- عملية 3: إيداع سداد جزئي (10-03-2026) - مدين 2,500
    INSERT INTO public.financial_transactions (wallet_id, amount, transaction_type, status, description, created_at)
    VALUES (v_wallet_id, 2500, 'credit', 'completed', 'سداد جزئي - حوالة بنكية #7721', '2026-03-10 14:30:00');

    -- عملية 4: إيداع ضخم (12-03-2026) - مدين 45,000
    INSERT INTO public.financial_transactions (wallet_id, amount, transaction_type, status, description, created_at)
    VALUES (v_wallet_id, 45000, 'credit', 'completed', 'شحن رصيد المحفظة - سداد مبكر', '2026-03-12 09:15:00');

    -- عملية 5: مديونية شحنة جديدة (15-03-2026) - دائن 10,000
    INSERT INTO public.financial_transactions (wallet_id, amount, transaction_type, status, description, created_at)
    VALUES (v_wallet_id, 10000, 'debit', 'completed', 'مستحقات شحنة #1005 (الدمام - مكة)', '2026-03-15 11:45:00');

    -- 4. تحديث الرصيد النهائي للمحفظة ليتوافق مع العمليات (22,500)
    UPDATE public.wallets SET balance = 22500 WHERE wallet_id = v_wallet_id;

    RAISE NOTICE 'تم إدراج السلسلة المحاسبية بنجاح للمستخدم ID: %', v_shipper_id;
END $$;
