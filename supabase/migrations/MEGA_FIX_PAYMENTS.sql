-- ======================================================
-- الإصلاح الشامل لمشكلة السداد (قاعدة البيانات + التخزين)
-- يرجى تشغيل هذا الكود بالكامل في محرر SQL في Supabase
-- ======================================================

-- أولاً: إصلاح التعداد والأدوار المفقودة
DO $$ 
BEGIN
    -- إضافة الأدوار المفقودة للتعداد
    BEGIN
        ALTER TYPE public.app_role ADD VALUE 'super_admin';
    EXCEPTION WHEN duplicate_object THEN null; END;
    
    BEGIN
        CREATE TYPE user_type_enum AS ENUM ('shipper', 'carrier', 'platform');
    EXCEPTION WHEN duplicate_object THEN null; END;

    BEGIN
        CREATE TYPE payment_status_enum AS ENUM ('pending', 'paid_to_escrow', 'refunded');
    EXCEPTION WHEN duplicate_object THEN null; END;

    BEGIN
        CREATE TYPE settlement_status_enum AS ENUM ('pending', 'held', 'settled');
    EXCEPTION WHEN duplicate_object THEN null; END;

    -- تنظيف الجداول المكسورة (في حال وجود تعارض بين UUID و Integer)
    -- إذا كان جدول wallets موجوداً بنوع id قديم (Integer)، سنقوم بحذفه لإعادة بنائه بشكل صحيح
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'wallets' 
        AND column_name = 'wallet_id' 
        AND data_type != 'uuid'
    ) THEN
        DROP TABLE IF EXISTS financial_transactions CASCADE;
        DROP TABLE IF EXISTS shipment_finances CASCADE;
        DROP TABLE IF EXISTS wallets CASCADE;
        DROP TABLE IF EXISTS invoices CASCADE;
    END IF;
END $$;

-- ------------------------------------------------------
-- ثانياً: إنشاء الجداول المالية الأساسية (في حال عدم وجودها)
-- ------------------------------------------------------

CREATE TABLE IF NOT EXISTS wallets (
    wallet_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id),
    user_type user_type_enum NOT NULL,
    balance DECIMAL(20, 2) DEFAULT 0.00 CHECK (balance >= 0),
    currency VARCHAR(10) DEFAULT 'SAR',
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (user_id, user_type)
);

CREATE TABLE IF NOT EXISTS shipment_finances (
    shipment_id UUID REFERENCES public.loads(id) PRIMARY KEY,
    shipper_id UUID REFERENCES public.profiles(id) NOT NULL,
    carrier_id UUID REFERENCES public.profiles(id),
    shipment_price DECIMAL(20, 2) NOT NULL,
    carrier_amount DECIMAL(20, 2) NOT NULL,
    platform_commission DECIMAL(20, 2) NOT NULL,
    payment_status payment_status_enum DEFAULT 'pending',
    settlement_status settlement_status_enum DEFAULT 'pending'
);

CREATE TABLE IF NOT EXISTS financial_transactions (
    transaction_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    wallet_id UUID REFERENCES wallets(wallet_id) NOT NULL,
    shipment_id UUID REFERENCES public.loads(id),
    amount DECIMAL(20, 2) NOT NULL,
    type VARCHAR(10) CHECK (type IN ('credit', 'debit')),
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS invoices (
    invoice_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    shipment_id UUID REFERENCES public.loads(id) NOT NULL,
    shipper_id UUID REFERENCES public.profiles(id) NOT NULL,
    amount DECIMAL(20, 2) NOT NULL,
    vat DECIMAL(20, 2) DEFAULT 0.00,
    total_amount DECIMAL(20, 2) NOT NULL,
    payment_status VARCHAR(20) DEFAULT 'unpaid',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ------------------------------------------------------
-- ثالثاً: إصلاح جدول مدفوعات الشاحنين (shipper_payments)
-- ------------------------------------------------------

CREATE TABLE IF NOT EXISTS shipper_payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    shipper_id UUID REFERENCES public.profiles(id) NOT NULL,
    amount DECIMAL(20, 2) NOT NULL,
    shipment_id UUID REFERENCES public.loads(id),
    proof_image_url TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    shipper_notes TEXT,
    admin_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- تحديث الحقول وتصحيح الربط
DO $$ 
BEGIN
    -- توسيع نطاق حقل المبلغ لتجنب خطأ numeric field overflow
    ALTER TABLE shipper_payments ALTER COLUMN amount TYPE DECIMAL(20, 2);
    
    -- تصحيح مرجعية shipper_id
    ALTER TABLE shipper_payments DROP CONSTRAINT IF EXISTS shipper_payments_shipper_id_fkey;
    ALTER TABLE shipper_payments ADD CONSTRAINT shipper_payments_shipper_id_fkey 
        FOREIGN KEY (shipper_id) REFERENCES public.profiles(id);
END $$;

-- ------------------------------------------------------
-- رابعاً: وظائف الصلاحيات والتحكم (Security)
-- ------------------------------------------------------

-- إعادة تعريف وظيفة الصلاحيات
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- تفعيل RLS
ALTER TABLE shipper_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;

-- حذف السياسات القديمة
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public' AND tablename IN ('shipper_payments', 'wallets', 'financial_transactions')) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, pol.tablename);
    END LOOP;
END $$;

-- إنشاء السياسات الجديدة
CREATE POLICY "Shippers can view/insert own payments" ON shipper_payments FOR ALL TO authenticated USING (auth.uid() = shipper_id);
CREATE POLICY "Admins can manage all payments" ON shipper_payments FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Users can view own wallet" ON wallets FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all wallets" ON wallets FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Users can view own transactions" ON financial_transactions FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM wallets WHERE wallets.wallet_id = financial_transactions.wallet_id AND wallets.user_id = auth.uid()));
CREATE POLICY "Admins can view all transactions" ON financial_transactions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- ------------------------------------------------------
-- خامساً: إنشاء المحافظ وإصلاح التلقائية
-- ------------------------------------------------------

-- إنشاء محافظ للمستخدمين الحاليين
DO $$
DECLARE user_row RECORD;
BEGIN
    FOR user_row IN SELECT p.id, r.role FROM public.profiles p JOIN public.user_roles r ON p.id = r.user_id WHERE r.role IN ('driver', 'shipper') LOOP
        IF user_row.role = 'driver' THEN
            INSERT INTO public.wallets (user_id, user_type, balance, currency) VALUES (user_row.id, 'carrier', 0.00, 'SAR') ON CONFLICT DO NOTHING;
        ELSIF user_row.role = 'shipper' THEN
            INSERT INTO public.wallets (user_id, user_type, balance, currency) VALUES (user_row.id, 'shipper', 0.00, 'SAR') ON CONFLICT DO NOTHING;
        END IF;
    END LOOP;
    
    INSERT INTO wallets (user_type, balance, currency) SELECT 'platform', 0.00, 'SAR' WHERE NOT EXISTS (SELECT 1 FROM wallets WHERE user_type = 'platform');
END $$;

-- تحديث الـ Trigger الخاص بالمستخدم الجديد
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, phone) VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), NEW.email, COALESCE(NEW.raw_user_meta_data->>'phone', ''));
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'shipper'));
  IF COALESCE(NEW.raw_user_meta_data->>'role', 'shipper') = 'driver' THEN
    INSERT INTO public.wallets (user_id, user_type, balance, currency) VALUES (NEW.id, 'carrier', 0.00, 'SAR');
  ELSIF COALESCE(NEW.raw_user_meta_data->>'role', 'shipper') = 'shipper' THEN
    INSERT INTO public.wallets (user_id, user_type, balance, currency) VALUES (NEW.id, 'shipper', 0.00, 'SAR');
  END IF;
  RETURN NEW;
END;
$$;
