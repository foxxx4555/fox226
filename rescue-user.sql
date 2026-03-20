-- سكربت استعادة الحساب (Rescue Script)
-- قم بتشغيل هذا السكربت في SQL Editor داخل لوحة تحكم Supabase

DO $$
BEGIN
    -- تحديث كلمة المرور وتأكيد الحساب
    UPDATE auth.users 
    SET 
        email_confirmed_at = NOW(),
        encrypted_password = extensions.crypt('12345678', extensions.gen_salt('bf')),
        updated_at = NOW()
    WHERE email = '2642546264@sasgo.com';
    
    RAISE NOTICE '✅ تم إعادة تعيين كلمة المرور إلى: 12345678';
END $$;
