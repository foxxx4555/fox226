-- ======================================================
-- سكربت تفعيل الربط المالي الآلي (البيانات الفعلية)
-- يهدف لتحويل الشحنات الموجودة في النظام إلى حركات مالية حقيقية
-- ======================================================

-- 1. التأكد من وجود محافظ لجميع الشاحنين
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT id FROM public.profiles LOOP
        INSERT INTO public.wallets (user_id, user_type, balance, currency)
        VALUES (r.id, 'shipper', 0, 'SAR')
        ON CONFLICT (user_id, user_type) DO NOTHING;
    END LOOP;
END $$;

-- 2. إدراج حركات مالية (مديونية) لكل الشحنات التي تم تعيينها أو اكتملت
DO $$
DECLARE
    l RECORD;
    v_wallet_id UUID;
BEGIN
    FOR l IN 
        SELECT id, owner_id, price, origin, status, created_at 
        FROM public.loads 
        WHERE driver_id IS NOT NULL 
    LOOP
        -- جلب محفظة الشاحن
        SELECT wallet_id INTO v_wallet_id FROM public.wallets WHERE user_id = l.owner_id AND user_type = 'shipper';
        
        IF v_wallet_id IS NOT NULL THEN
            -- إدراج حركة مديونية إذا لم تكن موجودة
            INSERT INTO public.financial_transactions (
                wallet_id, shipment_id, amount, type, transaction_type, status, description, created_at
            )
            SELECT v_wallet_id, l.id, l.price, 'debit', 'debt', 'completed', 
                   'رسوم شحنة من ' || COALESCE(l.origin, 'غير معروف'), l.created_at
            WHERE NOT EXISTS (
                SELECT 1 FROM public.financial_transactions 
                WHERE shipment_id = l.id AND transaction_type = 'debt'
            );
        END IF;
    END LOOP;
END $$;

-- 3. توليد فواتير آلية لكل الشحنات التي لم يصدر لها فاتورة
DO $$
DECLARE
    l RECORD;
BEGIN
    FOR l IN 
        SELECT id, owner_id, price, status, created_at 
        FROM public.loads 
        WHERE driver_id IS NOT NULL 
    LOOP
        INSERT INTO public.invoices (
            shipper_id, amount, vat, total_amount, 
            amount_paid, balance, payment_status, created_at
        )
        SELECT l.owner_id, l.price / 1.15, l.price - (l.price / 1.15), l.price,
               CASE WHEN l.status = 'completed' THEN l.price ELSE 0 END,
               CASE WHEN l.status = 'completed' THEN 0 ELSE l.price END,
               CASE WHEN l.status = 'completed' THEN 'paid' ELSE 'pending' END,
               l.created_at
        WHERE NOT EXISTS (
            SELECT 1 FROM public.invoices WHERE (shipment_id = l.id OR EXISTS (
                SELECT 1 FROM public.invoice_items WHERE invoice_id = public.invoices.invoice_id AND shipment_id = l.id
            ))
        );
    END LOOP;
END $$;

-- 4. تحديث الأرصدة في المحافظ لتطابق الحركات الفعلية
DO $$
DECLARE
    w RECORD;
BEGIN
    FOR w IN SELECT wallet_id FROM public.wallets LOOP
        UPDATE public.wallets 
        SET balance = (
            COALESCE((SELECT SUM(amount) FROM public.financial_transactions WHERE wallet_id = w.wallet_id AND type = 'debit'), 0) -
            COALESCE((SELECT SUM(amount) FROM public.financial_transactions WHERE wallet_id = w.wallet_id AND type = 'credit'), 0)
        )
        WHERE wallet_id = w.wallet_id;
    END LOOP;
END $$;

-- تحديث الكاش
NOTIFY pgrst, 'reload schema';
