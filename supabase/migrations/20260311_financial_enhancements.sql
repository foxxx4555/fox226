-- ======================================================
-- إضافات النظام المالي (سجل العمليات وإعدادات العمولة)
-- ======================================================

-- 1. جدول سجل العمليات (Audit Logs)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES pسشublic.profiles(id), -- من قام بالعملية
    action VARCHAR(100) NOT NULL, -- وصف العملية (e.g., 'approve_payment', 'process_payout')
    entity_id UUID, -- المعرف المرتبط (e.g., shipment_id, payment_id)
    old_values JSONB, -- القيم السابقة
    new_values JSONB, -- القيم الجديدة
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. جدول إعدادات النظام المالي
CREATE TABLE IF NOT EXISTS public.financial_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(50) UNIQUE NOT NULL,
    setting_value DECIMAL(10, 2) NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- إضافة عمولة المنصة الافتراضية (10%)
INSERT INTO public.financial_settings (setting_key, setting_value, description)
VALUES ('platform_commission_rate', 10.00, 'نسبة عمولة المنصة المقتطعة من إجمالي الشحنة')
ON CONFLICT (setting_key) DO NOTHING;

-- 3. إضافة رقم السند للجداول المالية لسهولة الربط الورقي
ALTER TABLE public.shipper_payments ADD COLUMN IF NOT EXISTS receipt_number SERIAL;
ALTER TABLE public.withdrawal_requests ADD COLUMN IF NOT EXISTS receipt_number SERIAL;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS invoice_number SERIAL;

-- تفعيل RLS لسجل العمليات (للمسؤولين فقط)
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view audit logs" ON public.audit_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'super_admin'::public.app_role));

-- 4. جدول إيصالات الصرف (Payout Receipts)
CREATE TABLE IF NOT EXISTS public.payout_receipts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    transaction_id UUID REFERENCES public.financial_transactions(id),
    payment_method VARCHAR(50) DEFAULT 'bank_transfer',
    reference_number TEXT,
    receipt_number SERIAL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- تفعيل RLS لإيصالات الصرف
ALTER TABLE public.payout_receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own payout receipts" 
ON public.payout_receipts FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'super_admin'::public.app_role));

CREATE POLICY "Admins can insert payout receipts" 
ON public.payout_receipts FOR INSERT 
TO authenticated 
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'super_admin'::public.app_role));

-- إجبار Supabase على تحديث الـ Cache
NOTIFY pgrst, 'reload schema';
