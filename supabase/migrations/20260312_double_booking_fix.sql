-- ======================================================
-- FINAL FINANCIAL LOGIC ALIGNMENT (Idempotency & Double-Booking Fix)
-- ======================================================

-- 1. FIX: approve_carrier_earnings (Remove Redundant Manual Update)
CREATE OR REPLACE FUNCTION public.approve_carrier_earnings(p_shipment_id UUID)
RETURNS VOID AS $$
DECLARE
    v_carrier_id UUID;
    v_carrier_wallet_id UUID;
    v_amount DECIMAL;
    v_status TEXT;
BEGIN
    SET search_path = public;

    -- 1. جلب بيانات الناقل والمبلغ والحالة الحالية
    SELECT carrier_id, carrier_amount, settlement_status 
    INTO v_carrier_id, v_amount, v_status
    FROM public.shipment_finances
    WHERE shipment_id = p_shipment_id;

    -- 2. التحقق من وجود السجل وعدم تكرار العملية (Idempotency)
    IF v_carrier_id IS NULL THEN
        RAISE EXCEPTION 'Finance record not found for shipment_id: %', p_shipment_id;
    END IF;

    IF v_status = 'settled' THEN
        RETURN; -- تم الاعتماد مسبقاً، نخرج بهدوء
    END IF;

    -- 3. الحصول على محفظة الناقل
    SELECT wallet_id INTO v_carrier_wallet_id FROM public.wallets WHERE user_id = v_carrier_id AND user_type = 'carrier';

    IF v_carrier_wallet_id IS NOT NULL THEN
        -- 4. تحديث حالة المعاملة المالية (هذا سيطلق الـ Trigger لتحديث الرصيد مرة واحدة ونهائية)
        UPDATE public.financial_transactions
        SET status = 'completed'
        WHERE shipment_id = p_shipment_id 
          AND wallet_id = v_carrier_wallet_id 
          AND status = 'pending';

        -- ملاحظة: تم حذف الـ UPDATE اليدوي للرصيد هنا لمنع Double Booking 
        -- حيث أن التريجر on_financial_transaction_v2 يتكفل بالمزامنة.

        -- 5. تحديث حالة التسوية النهائية
        UPDATE public.shipment_finances SET settlement_status = 'settled' WHERE shipment_id = p_shipment_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. FIX: get_shipper_financial_summary (Unify Source of Truth to Transactions)
CREATE OR REPLACE FUNCTION public.get_shipper_financial_summary(p_shipper_ids UUID[])
RETURNS TABLE (
    shipper_id UUID,
    total_paid NUMERIC,
    total_debt NUMERIC,
    net_balance NUMERIC,
    remaining_debt NUMERIC
) AS $$
DECLARE
    sid UUID;
    v_wallet_id UUID;
BEGIN
    FOR sid IN SELECT unnest(p_shipper_ids) LOOP
        -- جلب المحفظة المرتبطة بالشاحن
        SELECT wallet_id INTO v_wallet_id FROM public.wallets WHERE user_id = sid AND user_type = 'shipper' LIMIT 1;

        RETURN QUERY
        WITH 
        credit_sum AS (
            -- التحصيلات (Madiuniya repayment or Pre-payment)
            SELECT COALESCE(SUM(amount), 0) as val 
            FROM public.financial_transactions 
            WHERE wallet_id = v_wallet_id AND type = 'credit' AND status = 'completed'
        ),
        debit_sum AS (
            -- المديونيات (Shipment costs)
            SELECT COALESCE(SUM(amount), 0) as val 
            FROM public.financial_transactions 
            WHERE wallet_id = v_wallet_id AND type = 'debit' AND status = 'completed'
        )
        SELECT 
            sid as shipper_id,
            credit_sum.val::NUMERIC as total_paid,
            debit_sum.val::NUMERIC as total_debt,
            (credit_sum.val - debit_sum.val)::NUMERIC as net_balance,
            GREATEST(0, debit_sum.val - credit_sum.val)::NUMERIC as remaining_debt
        FROM credit_sum, debit_sum;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. FINAL SYNC: إعادة مزامنة كافة الأرصدة للتأكد من زوال آثار الخطأ السابق
DO $$
DECLARE
    w RECORD;
BEGIN
    FOR w IN SELECT wallet_id, user_id, user_type FROM public.wallets LOOP
        UPDATE public.wallets 
        SET balance = (
            COALESCE((SELECT SUM(amount) FROM public.financial_transactions WHERE wallet_id = w.wallet_id AND type = 'credit' AND status = 'completed'), 0) -
            COALESCE((SELECT SUM(amount) FROM public.financial_transactions WHERE wallet_id = w.wallet_id AND type = 'debit' AND status = 'completed'), 0)
        ),
        frozen_balance = (
            COALESCE((SELECT SUM(amount) FROM public.financial_transactions WHERE wallet_id = w.wallet_id AND status = 'pending' AND transaction_type = 'earnings'), 0)
        )
        WHERE wallet_id = w.wallet_id;
    END LOOP;
END $$;
