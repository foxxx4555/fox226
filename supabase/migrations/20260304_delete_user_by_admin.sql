-- وظيفة لحذف المستخدم بأمان من قاعدة البيانات
CREATE OR REPLACE FUNCTION delete_user_by_admin(target_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- هذا السطر يسمح للوظيفة بالعمل بصلاحيات الأدمن لتجاوز الـ 401
AS $$
BEGIN
  -- التحقق من أن الشخص الذي ينفذ الأمر هو super_admin (أمان إضافي)
  IF EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'super_admin'
  ) THEN
    -- حذف المستخدم من نظام Auth
    DELETE FROM auth.users WHERE id = target_user_id;
  ELSE
    RAISE EXCEPTION 'غير مصرح لك بالقيام بهذه العملية';
  END IF;
END;
$$;
