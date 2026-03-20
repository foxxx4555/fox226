-- سكربت إصلاح وظائف الإدارة (Admin Functions Fix)
-- قم بتشغيل هذا السكربت في SQL Editor في لوحة تحكم Supabase

-- 1. وظيفة حذف المستخدم بالكامل من Auth و Profiles
-- الدروب هنا مهم لتجنب خطأ تعارض أسماء المعاملات (42P13)
DROP FUNCTION IF EXISTS public.delete_user_by_admin(uuid);

CREATE OR REPLACE FUNCTION public.delete_user_by_admin(target_user_id UUID)
RETURNS void AS $$
BEGIN
    DELETE FROM auth.users WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. وظيفة حذف كافة شحنات التاجر
-- الدروب هنا مهم لتجنب خطأ تعارض أنواع الإرجاع (42P13)
DROP FUNCTION IF EXISTS public.delete_all_shipper_loads(uuid);

CREATE OR REPLACE FUNCTION public.delete_all_shipper_loads(p_shipper_id UUID)
RETURNS boolean AS $$
BEGIN
    DELETE FROM public.loads WHERE owner_id = p_shipper_id;
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. منح الصلاحيات اللازمة للـ Public schema لاستدعاء هذه الوظائف
GRANT EXECUTE ON FUNCTION public.delete_user_by_admin(UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.delete_all_shipper_loads(UUID) TO anon, authenticated, service_role;
