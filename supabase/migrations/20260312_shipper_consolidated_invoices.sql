-- ======================================================
-- نظام الفواتير المجمعة (Batch Invoices)
-- ======================================================

-- 1. تحديث جدول الفواتير ليكون أكثر مرونة
ALTER TABLE public.invoices ALTER COLUMN shipment_id DROP NOT NULL;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS amount_paid DECIMAL(15, 2) DEFAULT 0.00;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS balance DECIMAL(15, 2) DEFAULT 0.00;

-- 2. جدول بنود الفاتورة (لربط عدة شحنات بفاتورة واحدة)
CREATE TABLE IF NOT EXISTS public.invoice_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    invoice_id UUID REFERENCES public.invoices(invoice_id) ON DELETE CASCADE,
    shipment_id UUID REFERENCES public.loads(id),
    amount DECIMAL(15, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. تحديث مسميات الفواتير لتكون متسلسلة (تلقائية)
-- ملاحظة: تم إضافة invoice_number سابقاً ببرج السيريال

-- تفعيل RLS لجدول البنود
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own invoice items" ON public.invoice_items;
CREATE POLICY "Users can view their own invoice items" 
ON public.invoice_items FOR SELECT 
TO authenticated 
USING (EXISTS (SELECT 1 FROM public.invoices WHERE invoice_id = invoice_items.invoice_id AND shipper_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'::public.app_role));

-- 4. تجديد الكاش
NOTIFY pgrst, 'reload schema';
