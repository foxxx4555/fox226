-- 20260312_fix_admin_payment_policy.sql
-- Fix: Allow admins to INSERT/UPDATE/SELECT shipper_payments
-- Roles are stored in user_roles table, not profiles.role

-- Drop old policies that referenced wrong column
DROP POLICY IF EXISTS "admin_manage_all_payments" ON public.shipper_payments;
DROP POLICY IF EXISTS "admin_select_all" ON public.shipper_payments;
DROP POLICY IF EXISTS "admin_select_all_payments" ON public.shipper_payments;
DROP POLICY IF EXISTS "admin_insert_payments" ON public.shipper_payments;
DROP POLICY IF EXISTS "admin_update_payments" ON public.shipper_payments;

-- Helper: check if current user has an admin-level role in user_roles table
-- Roles: super_admin, admin, finance, operations, etc.

-- SELECT: admins see all payments, shippers see their own
CREATE POLICY "admin_select_all_payments" ON public.shipper_payments
    FOR SELECT
    TO authenticated
    USING (
        auth.uid() = shipper_id
        OR
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid()
            AND role::text IN (
                'super_admin', 'admin', 'Admin', 'finance', 'Finance',
                'operations', 'Operations', 'carrier_manager', 'support'
            )
        )
    );

-- INSERT: only admins/finance can insert manual payments
CREATE POLICY "admin_insert_payments" ON public.shipper_payments
    FOR INSERT
    TO authenticated
    WITH CHECK (
        -- Allow shipper to submit their own receipt
        auth.uid() = shipper_id
        OR
        -- Allow admins to create manual payments for any shipper
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid()
            AND role::text IN (
                'super_admin', 'admin', 'Admin', 'finance', 'Finance',
                'operations', 'Operations'
            )
        )
    );

-- UPDATE: only admins can approve/reject payments
CREATE POLICY "admin_update_payments" ON public.shipper_payments
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid()
            AND role::text IN (
                'super_admin', 'admin', 'Admin', 'finance', 'Finance',
                'operations', 'Operations'
            )
        )
    );

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
