-- ضع هذا الكود في نافذة SQL Editor في لوحة تحكم Supabase واضغط على Run (تشغيل)
-- هذا الكود مهمته استثناء الحسابات التي يتم إنشاؤها بدون بريد إلكتروني (الحسابات التي تأخذ الصيغة @sasgo.com) من خطوة تأكيد البريد.

CREATE OR REPLACE FUNCTION public.auto_confirm_no_email_users()
RETURNS trigger AS $$
BEGIN
  -- إذا كان البريد ينتهي بـ @sasgo.com (بريدنا التقني المؤقت)، سيتم تأكيده تلقائياً
  IF NEW.email LIKE '%@sasgo.com' THEN
    NEW.email_confirmed_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- حذف الدالة القديمة إن وُجدت لمنع التضارب
DROP TRIGGER IF EXISTS auto_confirm_user ON auth.users;

-- تفعيل الدالة لتعمل مع كل مستخدم جديد
CREATE TRIGGER auto_confirm_user
  BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.auto_confirm_no_email_users();
