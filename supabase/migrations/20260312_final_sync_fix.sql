-- ======================================================
-- سكربت الربط المالي النهائي (إصلاح المزامنة والفواتير الحقيقية)
-- ينظم العلاقة بين إيصالات السداد، الفواتير، ورصيد المحفظة
-- ======================================================

-- 1. إصلاح وظيفة اعتماد المدفوعات (لضمان تحديث الرصيد والفواتير)
CREATE OR REPLACE FUNCTION public.handle_shipper_payment_approval(
    p_payment_id UUID,
    p_status TEXT,
    p_admin_notes TEXT DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
    v_shipper_id UUID;
    v_amount DECIMAL;
    v_shipment_id UUID;
    v_wallet_id UUID;
    v_invoice_id UUID;
BEGIN
    -- أ. جلب تفاصيل الدفع
    SELECT shipper_id, amount, shipment_id INTO v_shipper_id, v_amount, v_shipment_id
    FROM public.shipper_payments
    WHERE id = p_payment_id;

    -- ب. تحديث حالة إيصال السداد
    UPDATE public.shipper_payments
    SET status = p_status, 
        admin_notes = p_admin_notes,
        updated_at = NOW()
    WHERE id = p_payment_id;

    -- ج. إذا تم الاعتماد، نحدث كل شيء
    IF p_status = 'approved' THEN
        -- الحصول على المحفظة
        SELECT wallet_id INTO v_wallet_id
        FROM public.wallets
        WHERE user_id = v_shipper_id AND user_type = 'shipper';

        IF v_wallet_id IS NOT NULL THEN
            -- إضافة المبلغ كحركة مالية (Credit) لتحديث الرصيد آلياً
            INSERT INTO public.financial_transactions (wallet_id, shipment_id, amount, type, transaction_type, status, description)
            VALUES (v_wallet_id, v_shipment_id, v_amount, 'credit', 'deposit', 'completed', 'اعتماد حوالة بنكية: ' || COALESCE(p_admin_notes, 'سداد'));
            
            -- د. تحديث الفاتورة المرتبطة بالشحنة (إن وجدت)
            IF v_shipment_id IS NOT NULL THEN
                -- البحث عن الفاتورة التي تحتوي على هذه الشحنة (أو فاتورة الشحنة نفسها)
                SELECT invoice_id INTO v_invoice_id FROM public.invoices WHERE shipment_id = v_shipment_id LIMIT 1;
                
                -- إذا لم نجدها في رأس الفاتورة، نبحث في البنود (invoice_items)
                IF v_invoice_id IS NULL THEN
                    SELECT invoice_id INTO v_invoice_id FROM public.invoice_items WHERE shipment_id = v_shipment_id LIMIT 1;
                END IF;

                IF v_invoice_id IS NOT NULL THEN
                    UPDATE public.invoices
                    SET amount_paid = amount_paid + v_amount,
                        balance = total_amount - (amount_paid + v_amount),
                        payment_status = CASE WHEN (total_amount - (amount_paid + v_amount)) <= 0 THEN 'paid' ELSE 'pending' END
                    WHERE invoice_id = v_invoice_id;
                END IF;
            END IF;
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. تصحيح البيانات القديمة (Sync Past Data)
DO $$
DECLARE
    p RECORD;
BEGIN
    -- أ. تصييح أي حركات مالية مفقودة النوع (Type Missing)
    UPDATE public.financial_transactions SET type = 'credit' WHERE type IS NULL AND transaction_type = 'deposit';
    UPDATE public.financial_transactions SET type = 'debit' WHERE type IS NULL AND transaction_type = 'debt';

    -- ب. مزامنة الفواتير مع المدفوعات المعتمدة فعلياً
    FOR p IN SELECT id, shipper_id, amount, shipment_id FROM public.shipper_payments WHERE status = 'approved' AND shipment_id IS NOT NULL LOOP
        UPDATE public.invoices
        SET amount_paid = (SELECT COALESCE(SUM(amount), 0) FROM public.shipper_payments WHERE shipment_id = p.shipment_id AND status = 'approved'),
            balance = total_amount - (SELECT COALESCE(SUM(amount), 0) FROM public.shipper_payments WHERE shipment_id = p.shipment_id AND status = 'approved'),
            payment_status = CASE WHEN (total_amount - (SELECT COALESCE(SUM(amount), 0) FROM public.shipper_payments WHERE shipment_id = p.shipment_id AND status = 'approved')) <= 0 THEN 'paid' ELSE 'pending' END
        WHERE (shipment_id = p.shipment_id OR EXISTS (SELECT 1 FROM public.invoice_items WHERE invoice_id = public.invoices.invoice_id AND shipment_id = p.shipment_id));
    END LOOP;

    -- ج. إعادة حساب أرصدة المحافظ النهائية
    UPDATE public.wallets w SET balance = (
        COALESCE((SELECT SUM(amount) FROM public.financial_transactions WHERE wallet_id = w.wallet_id AND type = 'debit'), 0) -
        COALESCE((SELECT SUM(amount) FROM public.financial_transactions WHERE wallet_id = w.wallet_id AND type = 'credit'), 0)
    );
END $$;

-- تحديث الكاش لضمان رؤية النتائج في الموقع فواراً
NOTIFY pgrst, 'reload schema';
