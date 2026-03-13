-- ======================================================
-- FINAL FINANCIAL REPAIR & SYNC SCRIPT
-- يرجى تشغيل هذا الكود في Supabase SQL Editor لحل مشكلة الـ SQL (wallets_frozen_balance_check)
-- ======================================================

BEGIN;

-- 1. التأكد من أن جميع الشحنات المكتملة لها قيود في سجل المعاملات (Backfilling)
INSERT INTO public.financial_transactions (wallet_id, shipment_id, amount, type, transaction_type, status, description)
SELECT 
    w.wallet_id, 
    sf.shipment_id, 
    sf.carrier_amount, 
    'credit', 
    'earnings', 
    'pending', 
    'أرباح مجمدة لشحنة #' || SUBSTRING(sf.shipment_id::text, 1, 8)
FROM public.shipment_finances sf
JOIN public.wallets w ON w.user_id = sf.carrier_id AND w.user_type = 'carrier'
WHERE sf.settlement_status = 'held' -- الشحنات المعلقة التي لم ترحل بعد
AND NOT EXISTS (
    SELECT 1 FROM public.financial_transactions ft 
    WHERE ft.shipment_id = sf.shipment_id AND ft.wallet_id = w.wallet_id
);

-- 2. إزالة أي أرصدة سالبة (في حال وجدت نتيجة أخطاء قديمة)
UPDATE public.wallets SET frozen_balance = 0 WHERE frozen_balance < 0;

-- 3. إعادة مزامنة الأرصدة بالكامل من سجل العمليات (Single Source of Truth)
UPDATE public.wallets w
SET 
  balance = (
    COALESCE((SELECT SUM(amount) FROM public.financial_transactions WHERE wallet_id = w.wallet_id AND type = 'credit' AND status = 'completed'), 0) -
    COALESCE((SELECT SUM(amount) FROM public.financial_transactions WHERE wallet_id = w.wallet_id AND type = 'debit' AND status = 'completed'), 0)
  ),
  frozen_balance = COALESCE((SELECT SUM(amount) FROM public.financial_transactions WHERE wallet_id = w.wallet_id AND transaction_type = 'earnings' AND status = 'pending'), 0)
WHERE user_type IN ('carrier', 'shipper');

COMMIT;

-- إشعار النظام بتحديث البيانات
NOTIFY pgrst, 'reload schema';
