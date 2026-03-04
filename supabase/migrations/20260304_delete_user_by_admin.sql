-- وظيفة مطورة لحذف المستخدم بأمان من كافة جداول النظام
CREATE OR REPLACE FUNCTION delete_user_by_admin(target_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- للعمل بصلاحيات مرتفعة لتجاوز قيود RLS وحذف سجلات Auth
AS $$
DECLARE
    v_is_admin BOOLEAN;
BEGIN
    -- 1. التحقق من أن القائم بالعملية هو أدمن أو سوبر أدمن
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND (role::text ILIKE 'super_admin' OR role::text ILIKE 'admin')
    ) INTO v_is_admin;

    IF NOT v_is_admin THEN
        RAISE EXCEPTION 'not_admin: غير مصرح لك بالقيام بهذه العملية';
    END IF;

    -- 2. تنظيف الجداول المرتبطة بالترتيب لتجنب أخطاء Foreign Key
    -- جداول العمليات المالية
    DELETE FROM public.financial_transactions WHERE wallet_id IN (SELECT wallet_id FROM public.wallets WHERE user_id = target_user_id);
    DELETE FROM public.withdrawal_requests WHERE user_id = target_user_id;
    DELETE FROM public.shipper_payments WHERE shipper_id = target_user_id;
    DELETE FROM public.shipment_finances WHERE shipper_id = target_user_id OR carrier_id = target_user_id;
    DELETE FROM public.invoices WHERE shipper_id = target_user_id;
    DELETE FROM public.wallets WHERE user_id = target_user_id;

    -- جداول الشحنات والعمليات
    DELETE FROM public.load_bids WHERE driver_id = target_user_id;
    DELETE FROM public.ratings WHERE rated_by = target_user_id OR rated_user = target_user_id;
    DELETE FROM public.loads WHERE owner_id = target_user_id OR driver_id = target_user_id;
    
    -- جداول البيانات الشخصية والمهنية
    DELETE FROM public.sub_drivers WHERE carrier_id = target_user_id;
    DELETE FROM public.trucks WHERE owner_id = target_user_id;
    DELETE FROM public.driver_details WHERE id = target_user_id;
    DELETE FROM public.products WHERE owner_id = target_user_id;
    DELETE FROM public.receivers WHERE owner_id = target_user_id;
    
    -- جداول الدعم والنشاط
    DELETE FROM public.ticket_messages WHERE user_id = target_user_id;
    DELETE FROM public.support_tickets WHERE user_id = target_user_id;
    DELETE FROM public.user_roles WHERE user_id = target_user_id;
    
    -- حذف البروفايل
    DELETE FROM public.profiles WHERE id = target_user_id;

    -- 3. الخطوة الأخيرة: حذف المستخدم من جداول Auth الخاصة بـ Supabase
    -- ملاحظة: يتطلب هذا SECURITY DEFINER وصلاحيات كافية
    DELETE FROM auth.users WHERE id = target_user_id;

EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'فشل عملية الحذف: %', SQLERRM;
END;
$$;
