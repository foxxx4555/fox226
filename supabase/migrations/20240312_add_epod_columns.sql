-- Add ePOD columns to loads table
alter table public.loads 
add column if not exists pod_image_url text,
add column if not exists signature_url text,
add column if not exists delivered_at timestamptz;

-- Refresh schema cache (implicit in Supabase when running via SQL Editor)
comment on table public.loads is 'Table for shipment loads with ePOD support';
