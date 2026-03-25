-- 🩺 سكربت إنقاذ وتوثيق البريد الإلكتروني (naserefox@gmail.com)
-- تشغيل هذا الكود في SQL Editor داخل لوحة تحكم Supabase

-- 1. تحديث بيانات المصادقة (Auth)
UPDATE auth.users 
SET 
    email = 'naserefox@gmail.com',
    email_confirmed_at = NOW(),
    confirmation_token = NULL,
    updated_at = NOW()
WHERE email LIKE '%2642546264@sasgo.com' -- استخدام الهوية القديمة
   OR email = 'naserefox@gmail.com';

-- 2. تحديث ملف التعريف (Profile)
UPDATE public.profiles
SET 
    email = 'naserefox@gmail.com'
WHERE id IN (
    SELECT id FROM auth.users WHERE email = 'naserefox@gmail.com'
);

-- 💡 تم التوثيق بنجاح! يمكنك الآن تسجيل الدخول ببريدك الجديد أو رقم هاتفك.
