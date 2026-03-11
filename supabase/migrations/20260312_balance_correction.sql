-- 20260312_balance_correction.sql
-- Correction script for Mohnnad's wallet balance (Shipper ID: f0a82747-0e6e-4433-8968-07e376043236)
-- Target: Correct the payment from 524 to 200 and restore debt to 324.

DO $$ 
DECLARE
    v_shipper_id UUID := 'f0a82747-0e6e-4433-8968-07e376043236'; -- مهند
    v_shipment_id UUID := 'd74dbe45-817c-4712-ae89-32216f4afbe1'; -- الشحنة المتأثرة
    v_payment_id UUID;
    v_wallet_id UUID;
    v_old_amount DECIMAL := 524.00;
    v_new_amount DECIMAL := 200.00;
BEGIN
    -- 1. الحصول على الـ payment_id والـ wallet_id
    SELECT id INTO v_payment_id FROM public.shipper_payments 
    WHERE shipper_id = v_shipper_id AND amount = v_old_amount AND status = 'approved'
    LIMIT 1;

    SELECT wallet_id INTO v_wallet_id FROM public.wallets WHERE user_id = v_shipper_id;

    IF v_payment_id IS NOT NULL THEN
        -- 2. تحديث جدول shipper_payments
        UPDATE public.shipper_payments 
        SET amount = v_new_amount, admin_notes = 'Data Correction: Adjusted from 524 to 200 based on actual receipt'
        WHERE id = v_payment_id;

        -- 3. تحديث جدول financial_transactions (التمويل)
        UPDATE public.financial_transactions 
        SET amount = v_new_amount, description = 'DEPOSIT: Shipper payment (Adjusted) #' || v_payment_id
        WHERE wallet_id = v_wallet_id AND amount = v_old_amount AND transaction_type = 'deposit';

        -- 4. تحديث جدول invoices (الفواتير)
        UPDATE public.invoices 
        SET amount_paid = v_new_amount, balance = total_amount - v_new_amount
        WHERE shipment_id = v_shipment_id;

        -- 5. إعادة حساب رصيد المحفظة بالكامل للتاكد من الدقة
        UPDATE public.wallets 
        SET balance = (
            SELECT COALESCE(SUM(CASE WHEN type = 'credit' THEN amount ELSE -amount END), 0)
            FROM public.financial_transactions
            WHERE wallet_id = v_wallet_id
        )
        WHERE wallet_id = v_wallet_id;

        RAISE NOTICE 'Correction completed for payment %: 524 -> 200', v_payment_id;
    ELSE
        RAISE NOTICE 'No payment of 524 found for this shipper.';
    END IF;
END $$;
