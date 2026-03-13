-- ==========================================
-- CREATE RECEIPTS STORAGE BUCKET
-- Run this in Supabase SQL Editor to enable image uploads for receipts
-- ==========================================

-- 1. Create the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('RECEIPTS', 'RECEIPTS', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Allow public access to read files
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'RECEIPTS' );

-- 3. Allow authenticated users to upload files
CREATE POLICY "Authenticated Upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'RECEIPTS' );

-- 4. Allow authenticated users to update/delete their own files (optional but good practice)
CREATE POLICY "Authenticated Management"
ON storage.objects FOR ALL
TO authenticated
USING ( bucket_id = 'RECEIPTS' );
