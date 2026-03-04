-- وظيفة لحذف المستخدم بأمان من قاعدة البيانات
CREATE OR REPLACE FUNCTION delete_user_by_admin(target_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- هذا السطر يسمح للوظيفة بالعمل بصلاحيات الأدمن لتجاوز الـ 401
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'super_admin'
  ) THEN
    -- تنظيف الجداول المرتبطة يدوياً لتجنب خطأ Foreign Key Constraint (مثل المنتجات والشحنات)
    DELETE FROM public.products WHERE owner_id = target_user_id;
    DELETE FROM public.load_bids WHERE driver_id = target_user_id;
    DELETE FROM public.trucks WHERE owner_id = target_user_id;
    DELETE FROM public.ratings WHERE rater_id = target_user_id OR rated_id = target_user_id;
    DELETE FROM public.user_roles WHERE user_id = target_user_id;
    DELETE FROM public.support_tickets WHERE user_id = target_user_id;
    DELETE FROM public.ticket_messages WHERE user_id = target_user_id;
    DELETE FROM public.shipper_payments WHERE shipper_id = target_user_id;
    DELETE FROM public.financial_transactions WHERE user_id = target_user_id;
    DELETE FROM public.loads WHERE owner_id = target_user_id OR driver_id = target_user_id;
    DELETE FROM public.profiles WHERE id = target_user_id;

    -- أخيراً: حذف المستخدم من نظام Auth (الدخول)
    DELETE FROM auth.users WHERE id = target_user_id;
  ELSE
    RAISE EXCEPTION 'غير مصرح لك بالقيام بهذه العملية';
  END IF;
END;
$$;
