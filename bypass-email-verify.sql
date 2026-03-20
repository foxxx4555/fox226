-- ضع هذا الكود في نافذة SQL Editor في لوحة تحكم Supabase واضغط على Run (تشغيل)
-- هذا الكود مهمته استثناء الحسابات التي يتم إنشاؤها بدون بريد إلكتروني (الحسابات التي تأخذ الصيغة @sasgo.com) من خطوة تأكيد البريد.

CREATE OR REPLACE FUNCTION public.auto_confirm_no_email_users()
RETURNS trigger AS $$
BEGIN
  -- تتبع في السجلات للمساعدة في التأكد من عمل الـ Trigger
  RAISE NOTICE '🔍 Checking auto-confirm for email: %', NEW.email;

  -- إذا كان البريد ينتهي بـ @sasgo.com (تجاهل حالة الأحرف والمسافات)
  IF NEW.email ILIKE '%@sasgo.com' THEN
    NEW.email_confirmed_at = NOW();
    NEW.confirmed_at = NOW(); -- للتأكد من تحديث كافة الحقول ذات الصلة
    RAISE NOTICE '✅ Auto-confirmed user: %', NEW.email;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- حذف الـ Trigger القديم إن وُجد
DROP TRIGGER IF EXISTS auto_confirm_user ON auth.users;

-- تفعيل الـ Trigger ليعمل مع كل مستخدم جديد (قبل الإدراج)
CREATE TRIGGER auto_confirm_user
  BEFORE INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.auto_confirm_no_email_users();
