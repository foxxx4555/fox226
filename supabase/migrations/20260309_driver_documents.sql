-- إضافة حقل صورة الشاحنة وتحديث معالجة المستندات
-- التاريخ: 2026-03-09

-- 1. إضافة عمود صورة الشاحنة إلى جدول profiles إذا لم يكن موجوداً
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS truck_image_url TEXT;

-- 2. التأكد من وجود الأعمدة الأخرى
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS driving_license_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS id_document_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS vehicle_insurance_url TEXT;

-- 3. تحديث الوظيفة التي تعالج تسجيل المستخدم لاستخراج الحقول الجديدة من metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    full_name,
    avatar_url,
    phone,
    user_type,
    driving_license_url,
    id_document_url,
    vehicle_insurance_url,
    truck_image_url
  )
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'role',
    new.raw_user_meta_data->>'driving_license_url',
    new.raw_user_meta_data->>'id_document_url',
    new.raw_user_meta_data->>'vehicle_insurance_url',
    new.raw_user_meta_data->>'truck_image_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
