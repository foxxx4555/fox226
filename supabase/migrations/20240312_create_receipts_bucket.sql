-- 1. Create 'receipts' bucket if not exists
insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', true)
on conflict (id) do nothing;

-- 2. Cleanup existing policies to avoid name/logic conflicts
drop policy if exists "Public Access Receipts" on storage.objects;
drop policy if exists "Authenticated Upload Receipts" on storage.objects;
drop policy if exists "Authenticated Update/Delete Receipts" on storage.objects;
drop policy if exists "Public Access" on storage.objects;
drop policy if exists "Authenticated Upload" on storage.objects;

-- 3. Allow public access to view receipts
create policy "Public Access Receipts"
on storage.objects for select
using ( bucket_id = 'receipts' );

-- 4. Allow authenticated users to upload receipts
create policy "Authenticated Upload Receipts"
on storage.objects for insert
with check (
  bucket_id = 'receipts'
  and auth.role() = 'authenticated'
);
