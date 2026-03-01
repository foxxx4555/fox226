-- Ensure drivers can see the loads assigned to them and shippers can see the loads they created.
-- Also ensures that 'available' loads are visible to everyone so drivers can bid on them.

-- 1. Drop existing permissive policy if it exists
DROP POLICY IF EXISTS "Anyone authenticated can view available loads" ON public.loads;
DROP POLICY IF EXISTS "Users can view their own loads" ON public.loads;

-- 2. Create proper reading policy for loads
CREATE POLICY "Users can view their own loads" 
ON public.loads 
FOR SELECT 
TO authenticated 
USING (
  status = 'available' 
  OR auth.uid() = owner_id 
  OR auth.uid() = driver_id
);

-- Note: In Supabase, you can run this from your SQL Editor tab.
