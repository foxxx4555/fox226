-- ======================================================
-- إضافات النظام المالي (نسخة شاملة للحماية والتهيئة)
-- ======================================================

-- 1. جدول سجل العمليات (Audit Logs)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id),
    action VARCHAR(100) NOT NULL,
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
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
ON CONFLICT (setting_key) DO UPDATE SET description = EXCLUDED.description;

-- 3. إضافة حقول أرقام السندات والربط
ALTER TABLE public.shipper_payments ADD COLUMN IF NOT EXISTS receipt_number SERIAL;
ALTER TABLE public.withdrawal_requests ADD COLUMN IF NOT EXISTS receipt_number SERIAL;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS invoice_number SERIAL;

-- تفعيل RLS لجميع الجداول المالية الجديدة
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_receipts ENABLE ROW LEVEL SECURITY;

-- 4. سياسات RLS لجدول سجل العمليات (Audit Logs)
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
CREATE POLICY "Admins can view audit logs" ON public.audit_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'super_admin'::public.app_role));

-- 5. سياسات RLS لجدول الإعدادات (Financial Settings)
DROP POLICY IF EXISTS "Admins can view financial settings" ON public.financial_settings;
CREATE POLICY "Admins can view financial settings" ON public.financial_settings FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'super_admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can update financial settings" ON public.financial_settings;
CREATE POLICY "Admins can update financial settings" ON public.financial_settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'super_admin'::public.app_role));

-- 6. سياسات RLS لجدول الفواتير (Invoices)
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own invoices" ON public.invoices;
CREATE POLICY "Users can view their own invoices" ON public.invoices FOR SELECT TO authenticated USING (auth.uid() = shipper_id OR public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'super_admin'::public.app_role));

-- 7. جدول إيصالات الصرف (Payout Receipts)
CREATE TABLE IF NOT EXISTS public.payout_receipts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    transaction_id UUID REFERENCES public.financial_transactions(transaction_id),
    payment_method VARCHAR(50) DEFAULT 'bank_transfer',
    reference_number TEXT,
    receipt_number SERIAL,
    created_at TIMESTAMPTZ DEFAULT now()
);

DROP POLICY IF EXISTS "Users can view their own payout receipts" ON public.payout_receipts;
CREATE POLICY "Users can view their own payout receipts" ON public.payout_receipts FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'super_admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can insert payout receipts" ON public.payout_receipts;
CREATE POLICY "Admins can insert payout receipts" ON public.payout_receipts FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'super_admin'::public.app_role));

-- إجبار Supabase على تحديث الـ Cache
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';
