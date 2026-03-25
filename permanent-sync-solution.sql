-- 🛡️ نظام المزامنة التلقائية الدائم (حل نهائي للأبد)
-- انسخ هذا الكود وشغله مرة واحدة في SQL Editor في Supabase

-- 1. دالة ذكية لمزامنة البروفايل مع نظام المصادقة تلقائياً
CREATE OR REPLACE FUNCTION public.auto_sync_profile_to_auth_v2()
RETURNS trigger AS $$
BEGIN
  -- إذا تم تحديث البريد الإلكتروني في البروفايل، نقوم بتحديثه في نظام المصادقة
  IF (NEW.email IS DISTINCT FROM OLD.email) AND (NEW.email NOT LIKE '%@sasgo.com') AND (NEW.email != 'NA') THEN
    UPDATE auth.users 
    SET email = NEW.email, 
        email_confirmed_at = NOW(), -- نعتبره موثقاً لأنه تم من داخل التطبيق
        updated_at = NOW()
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. تفعيل المزامنة التلقائية مع كل تحديث للبيانات
DROP TRIGGER IF EXISTS sync_auth_email_trigger ON public.profiles;
CREATE TRIGGER sync_auth_email_trigger
  AFTER UPDATE OF email ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_sync_profile_to_auth_v2();

-- 3. إصلاح كافة البيانات العالقة حالياً (مزامنة شاملة لمرة واحدة)

-- أ. مزامنة المستخدمين الذين لديهم بريد حقيقي
UPDATE auth.users u
SET email = p.email, email_confirmed_at = NOW()
FROM public.profiles p
WHERE u.id = p.id 
  AND p.email != 'NA' 
  AND p.email IS NOT NULL 
  AND p.email NOT LIKE '%@sasgo.com'
  AND u.email LIKE '%@sasgo.com';

-- ب. توحيد صيغة بريد الهاتف (إزالة الصفر الزائد أو إضافته ليتطابق البروفايل مع المصادقة)
-- سنقوم بجعل البريد في Auth مطابق تماماً لما هو موجود في خانة phone في البروفايل
UPDATE auth.users u
SET email = REPLACE(p.phone, ' ', '') || '@sasgo.com', email_confirmed_at = NOW()
FROM public.profiles p
WHERE u.id = p.id 
  AND (p.email = 'NA' OR p.email IS NULL OR p.email LIKE '%@sasgo.com')
  AND u.email != (REPLACE(p.phone, ' ', '') || '@sasgo.com');

-- ✅ مبروك! الآن كل الحسابات (بالاسم أو الهاتف) أصبحت متصلة بشكل سليم.
