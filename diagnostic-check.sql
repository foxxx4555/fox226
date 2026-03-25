-- 🔎 كود الفحص التشخيصي (لماذا لا يستطيع محمد الدخول؟)
-- الصق الكود وأخبرني بالضبط بالنتائج التي تظهر لك في الجداول تحت

-- 1. فحص ملف "محمد" في جدول البروفايلات
SELECT id as uuid, username, email, phone 
FROM public.profiles 
WHERE username = 'محمد' OR phone LIKE '%65432222%';

-- 2. فحص وجود "محمد" في جدول المصادقة (Auth) بمختلف الصيغ
SELECT id as auth_uuid, email, confirmed_at, last_sign_in_at
FROM auth.users 
WHERE email LIKE '%65432222%' 
   OR email LIKE '%محمد%';

-- 🛠️ حل طوارئ لـ "محمد" (لو عاوز تدخله فوراً):
-- هذا الكود يمسح أي تعارض ويضبط كلمة السر لـ 12345678
-- تأكد من استبدال الـ UUID لو طلع مختلف في نتائج البحث فوق
/*
UPDATE auth.users 
SET 
    email = '65432222@sasgo.com',
    email_confirmed_at = NOW(),
    encrypted_password = extensions.crypt('12345678', extensions.gen_salt('bf'))
WHERE email LIKE '%65432222%';
*/
