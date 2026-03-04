-- سياسات تخزين مستودع الإيصالات (receipts)
-- التاريخ: 2026-03-04

-- 1. السماح للمستخدمين برفع الصور لمستودع receipts
-- ملاحظة: نستخدم bucket_id للفلترة
CREATE POLICY "Allow authenticated users to upload receipts"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'receipts');

-- 2. السماح للمسؤولين بإدارة جميع الملفات في هذا المستودع
CREATE POLICY "Allow admins to manage receipts"
ON storage.objects FOR ALL
TO authenticated
USING (
    bucket_id = 'receipts' AND 
    EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid()
        AND (role::text ILIKE '%admin%' OR role::text ILIKE '%finance%')
    )
);

-- 3. السماح لجميع المستخدمين المسجلين برؤية الملفات (بما أن المستودع PUBLIC)
CREATE POLICY "Allow authenticated users to view receipts"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'receipts');
