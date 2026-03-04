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
    balance DECIMAL(20, 2) DEFAULT 0.00,
    currency VARCHAR(10) DEFAULT 'SAR',
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (user_id, user_type)
);

-- إزالة قيد الرصيد الموجب للسماح بالمديونية (الدين)
ALTER TABLE public.wallets DROP CONSTRAINT IF EXISTS wallets_balance_check;

-- التأكد من وجود الأعمدة اللازمة في طلبات السحب
DO $$ 
BEGIN
    -- التأكد من وجود عمود wallet_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='withdrawal_requests' AND column_name='wallet_id') THEN
        ALTER TABLE public.withdrawal_requests ADD COLUMN wallet_id UUID REFERENCES public.wallets(wallet_id);
    END IF;

    -- التأكد من وجود عمود bank_details
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='withdrawal_requests' AND column_name='bank_details') THEN
        ALTER TABLE public.withdrawal_requests ADD COLUMN bank_details JSONB;
    END IF;

    -- التأكد من وجود عمود transaction_type في العمليات المالية
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='financial_transactions' AND column_name='transaction_type') THEN
        ALTER TABLE public.financial_transactions ADD COLUMN transaction_type VARCHAR(20) DEFAULT 'other';
    END IF;

    -- إضافة قيود الربط (Foreign Keys) لجدول طلبات السحب إذا كانت مفقودة
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='withdrawal_requests_user_id_fkey') THEN
        ALTER TABLE public.withdrawal_requests ADD CONSTRAINT withdrawal_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='withdrawal_requests_wallet_id_fkey') THEN
        ALTER TABLE public.withdrawal_requests ADD CONSTRAINT withdrawal_requests_wallet_id_fkey FOREIGN KEY (wallet_id) REFERENCES public.wallets(wallet_id);
    END IF;
END $$;

-- إجبار Supabase على تحديث ذاكرة الواجهة البرمجية (Schema Cache)
NOTIFY pgrst, 'reload schema';

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
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    wallet_id UUID REFERENCES wallets(wallet_id) NOT NULL,
    shipment_id UUID REFERENCES public.loads(id),
    amount DECIMAL(20, 2) NOT NULL,
    type VARCHAR(10) CHECK (type IN ('credit', 'debit')), -- اتجاه الحركة (للتريجر)
    transaction_type VARCHAR(20) DEFAULT 'other', -- تصنيف الحركة (للكود والفلترة)
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- إصلاح مسميات الأعمدة في حال وجود تعارض
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='financial_transactions' AND column_name='type' AND column_name NOT IN ('transaction_type')) THEN
        -- سنبقي على الحقلين مؤقتاً لضمان التوافق التام
        NULL; 
    END IF;
END $$;

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

CREATE TABLE IF NOT EXISTS withdrawal_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    wallet_id UUID NOT NULL,
    amount DECIMAL(20, 2) NOT NULL,
    bank_details JSONB,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    proof_image_url TEXT,
    admin_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT withdrawal_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
    CONSTRAINT withdrawal_requests_wallet_id_fkey FOREIGN KEY (wallet_id) REFERENCES public.wallets(wallet_id)
);

-- تحديث الحقول وتصحيح الربط
DO $$ 
BEGIN
    -- توسيع نطاق حقل المبلغ لتجنب خطأ numeric field overflow
    ALTER TABLE IF EXISTS shipper_payments ALTER COLUMN amount TYPE DECIMAL(20, 2);
    
    -- إضافة عمود admin_notes إذا كان مفقوداً
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='shipper_payments' AND column_name='admin_notes') THEN
        ALTER TABLE public.shipper_payments ADD COLUMN admin_notes TEXT;
    END IF;

    -- إضافة عمود processed_at إذا كان مفقوداً
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='shipper_payments' AND column_name='processed_at') THEN
        ALTER TABLE public.shipper_payments ADD COLUMN processed_at TIMESTAMPTZ;
    END IF;

    -- تصحيح مرجعية shipper_id
    ALTER TABLE IF EXISTS shipper_payments DROP CONSTRAINT IF EXISTS shipper_payments_shipper_id_fkey;
    ALTER TABLE IF EXISTS shipper_payments ADD CONSTRAINT shipper_payments_shipper_id_fkey 
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
ALTER TABLE shipment_finances ENABLE ROW LEVEL SECURITY;

-- حذف السياسات القديمة
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN (
        SELECT policyname, tablename FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename IN ('shipper_payments', 'wallets', 'financial_transactions', 'shipment_finances', 'withdrawal_requests')
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, pol.tablename);
    END LOOP;
END $$;

-- إنشاء السياسات الجديدة
-- 1. shipper_payments
CREATE POLICY "Shippers can view/insert own payments" ON shipper_payments FOR ALL TO authenticated USING (auth.uid() = shipper_id);
CREATE POLICY "Admins can manage all payments" ON shipper_payments FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'super_admin'::public.app_role));

-- 2. wallets
CREATE POLICY "Users can view own wallet" ON wallets FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all wallets" ON wallets FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'super_admin'::public.app_role));

-- 3. financial_transactions
CREATE POLICY "Users can view own transactions" ON financial_transactions FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM wallets WHERE wallets.wallet_id = financial_transactions.wallet_id AND wallets.user_id = auth.uid()));
CREATE POLICY "Admins can view all transactions" ON financial_transactions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'super_admin'::public.app_role));

-- 4. shipment_finances
CREATE POLICY "Authenticated users can view shipment finances" ON shipment_finances FOR SELECT TO authenticated USING (auth.uid() = shipper_id OR auth.uid() = carrier_id OR public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'super_admin'::public.app_role));
CREATE POLICY "Admins/Drivers can manage shipment finances" ON shipment_finances FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'super_admin'::public.app_role) OR auth.uid() = carrier_id);
CREATE POLICY "Allow insert for finances" ON shipment_finances FOR INSERT TO authenticated WITH CHECK (true);

-- 5. withdrawal_requests
ALTER TABLE withdrawal_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own withdrawals" ON withdrawal_requests FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create own withdrawals" ON withdrawal_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage all withdrawals" ON withdrawal_requests FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'super_admin'::public.app_role));

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

-- ------------------------------------------------------
-- سادساً: وظيفة التسوية المالية (النسخة المحدثة والقوية)
-- ------------------------------------------------------

CREATE OR REPLACE FUNCTION public.process_shipment_settlement(p_shipment_id UUID)
RETURNS VOID AS $$
DECLARE
    v_shipper_wallet_id UUID;
    v_carrier_wallet_id UUID;
    v_platform_wallet_id UUID;
    v_shipment RECORD;
BEGIN
    -- 0. ضبط مسار البحث للأمان
    SET search_path = public;

    -- 1. الحصول على تفاصيل التمويل للشحنة (مع محاولة الإصلاح التلقائي إذا فُقد السجل)
    SELECT * INTO v_shipment FROM public.shipment_finances WHERE shipment_id = p_shipment_id FOR UPDATE;

    IF NOT FOUND THEN
        -- محاولة الإصلاح: جلب البيانات من جدول الشحنات الأساسي
        INSERT INTO public.shipment_finances (
            shipment_id, shipper_id, carrier_id, 
            shipment_price, carrier_amount, platform_commission
        )
        SELECT 
            l.id, l.owner_id, l.driver_id,
            l.price, l.price * 0.9, l.price * 0.1
        FROM public.loads l
        WHERE l.id = p_shipment_id AND l.driver_id IS NOT NULL
        RETURNING * INTO v_shipment;

        IF v_shipment.id IS NULL THEN
            RAISE EXCEPTION 'ERR: Financial record not found and auto-repair failed (Check driver/price for load %).', p_shipment_id;
        END IF;
    END IF;

    IF v_shipment.settlement_status = 'settled' THEN
        RAISE EXCEPTION 'ERR: Shipment already settled (%).', p_shipment_id;
    END IF;

    -- 2. جلب أو إنشاء معرِفات المحافظ (Resilient Wallet Fetching)
    -- محفظة الشاحن
    SELECT wallet_id INTO v_shipper_wallet_id FROM public.wallets WHERE user_id = v_shipment.shipper_id AND user_type = 'shipper';
    IF v_shipper_wallet_id IS NULL THEN
        INSERT INTO public.wallets (user_id, user_type, balance) 
        VALUES (v_shipment.shipper_id, 'shipper', 0.00) 
        RETURNING wallet_id INTO v_shipper_wallet_id;
    END IF;

    -- محفظة الناقل
    SELECT wallet_id INTO v_carrier_wallet_id FROM public.wallets WHERE user_id = v_shipment.carrier_id AND user_type = 'carrier';
    IF v_carrier_wallet_id IS NULL THEN
        INSERT INTO public.wallets (user_id, user_type, balance) 
        VALUES (v_shipment.carrier_id, 'carrier', 0.00) 
        RETURNING wallet_id INTO v_carrier_wallet_id;
    END IF;

    -- محفظة المنصة
    SELECT wallet_id INTO v_platform_wallet_id FROM public.wallets WHERE user_type = 'platform' LIMIT 1;
    IF v_platform_wallet_id IS NULL THEN
        INSERT INTO public.wallets (user_type, balance) 
        VALUES ('platform', 0.00) 
        RETURNING wallet_id INTO v_platform_wallet_id;
    END IF;

    -- 3. تنفيذ الحركات المالية (تحديث الرصيد سيتم تلقائياً عبر Trigger)
    -- أ. تسجيل مديونية على الشاحن
    INSERT INTO public.financial_transactions (wallet_id, shipment_id, amount, type, transaction_type, description)
    VALUES (v_shipper_wallet_id, p_shipment_id, v_shipment.shipment_price, 'debit', 'debt', 'DEBT: Outstanding shipment payment #' || p_shipment_id);

    -- ب. إيداع للناقل
    INSERT INTO public.financial_transactions (wallet_id, shipment_id, amount, type, transaction_type, description)
    VALUES (v_carrier_wallet_id, p_shipment_id, v_shipment.carrier_amount, 'credit', 'earnings', 'EARNINGS: Shipment delivery #' || p_shipment_id);

    -- ج. إيداع عمولة المنصة
    INSERT INTO public.financial_transactions (wallet_id, shipment_id, amount, type, transaction_type, description)
    VALUES (v_platform_wallet_id, p_shipment_id, v_shipment.platform_commission, 'credit', 'commission', 'FEE: Platform commission #' || p_shipment_id);

    -- 4. تحديث حالة التسوية
    UPDATE public.shipment_finances SET settlement_status = 'settled' WHERE shipment_id = p_shipment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- ------------------------------------------------------
-- سابعاً: وظيفة إنشاء المستخدم وتطوير التلقائية
-- ------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- 1. إنشاء البروفايل
  INSERT INTO public.profiles (id, full_name, email, phone) 
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), NEW.email, COALESCE(NEW.raw_user_meta_data->>'phone', ''));
  
  -- 2. إنشاء الدور
  INSERT INTO public.user_roles (user_id, role) 
  VALUES (NEW.id, COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'shipper'));
  
  -- 3. إنشاء المحفظة المناسبة
  IF COALESCE(NEW.raw_user_meta_data->>'role', 'shipper') = 'driver' THEN
    INSERT INTO public.wallets (user_id, user_type, balance, currency) VALUES (NEW.id, 'carrier', 0.00, 'SAR');
  ELSIF COALESCE(NEW.raw_user_meta_data->>'role', 'shipper') = 'shipper' THEN
    INSERT INTO public.wallets (user_id, user_type, balance, currency) VALUES (NEW.id, 'shipper', 0.00, 'SAR');
  END IF;
  
  RETURN NEW;
END;
$$;

-- إعادة ربط التريجر بمستودع auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ------------------------------------------------------
-- ثامناً: الإصلاح التلقائي للسجلات المالية المفقودة
-- ------------------------------------------------------

DO $$
DECLARE
    load_row RECORD;
BEGIN
    -- إنشاء سجلات مالية للشحنات التي لديها سائق ولكن ليس لديها سجل مالي
    FOR load_row IN 
        SELECT l.id, l.owner_id, l.driver_id, l.price 
        FROM public.loads l
        LEFT JOIN public.shipment_finances sf ON l.id = sf.shipment_id
        WHERE l.driver_id IS NOT NULL AND sf.shipment_id IS NULL
    LOOP
        INSERT INTO public.shipment_finances (
            shipment_id, shipper_id, carrier_id, 
            shipment_price, carrier_amount, platform_commission
        ) VALUES (
            load_row.id, load_row.owner_id, load_row.driver_id,
            load_row.price, load_row.price * 0.9, load_row.price * 0.1
        ) ON CONFLICT DO NOTHING;
    END LOOP;
END $$;

-- ------------------------------------------------------
-- تاسعاً: أتمتة إنشاء السجل المالي عند قبول العرض
-- ------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_load_assignment()
RETURNS TRIGGER AS $$
BEGIN
    -- ضبط مسار البحث للأمان
    SET search_path = public;

    -- إذا تم تعيين سائق جديد للشحنة
    IF (NEW.driver_id IS NOT NULL AND (OLD.driver_id IS NULL OR OLD.driver_id != NEW.driver_id)) THEN
        INSERT INTO public.shipment_finances (
            shipment_id, shipper_id, carrier_id, 
            shipment_price, carrier_amount, platform_commission
        ) VALUES (
            NEW.id, NEW.owner_id, NEW.driver_id,
            NEW.price, NEW.price * 0.9, NEW.price * 0.1
        ) ON CONFLICT (shipment_id) DO UPDATE SET
            carrier_id = EXCLUDED.carrier_id,
            shipment_price = EXCLUDED.shipment_price,
            carrier_amount = EXCLUDED.carrier_amount,
            platform_commission = EXCLUDED.platform_commission;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_load_assigned ON public.loads;
CREATE TRIGGER on_load_assigned
    AFTER UPDATE OF driver_id ON public.loads
    FOR EACH ROW EXECUTE FUNCTION public.handle_load_assignment();

-- وظيفة لتصفية الديون وتسوية السجلات (Settlement)
CREATE OR REPLACE FUNCTION public.clear_settled_debts(p_wallet_id UUID, p_amount DECIMAL)
RETURNS VOID AS $$
DECLARE
    v_remaining_to_clear DECIMAL := p_amount;
    v_debt RECORD;
BEGIN
    -- 1. البحث عن الديون المتعلقة بهذه المحفظة ومسحها بالترتيب (الأقدم أولاً)
    FOR v_debt IN 
        SELECT id, amount FROM public.financial_transactions 
        WHERE wallet_id = p_wallet_id AND transaction_type = 'debt'
        ORDER BY created_at ASC
    LOOP
        IF v_remaining_to_clear <= 0 THEN
            EXIT;
        END IF;

        IF v_debt.amount <= v_remaining_to_clear THEN
            -- إذا كان الدين أقل من أو يساوي المبلغ المسدد، نحذف سجل الدين بالكامل
            v_remaining_to_clear := v_remaining_to_clear - v_debt.amount;
            DELETE FROM public.financial_transactions WHERE id = v_debt.id;
        ELSE
            -- إذا كان الدين أكبر، نخصم منه فقط ونبقي السجل
            UPDATE public.financial_transactions 
            SET amount = amount - v_remaining_to_clear
            WHERE id = v_debt.id;
            v_remaining_to_clear := 0;
        END IF;
    END LOOP;

    -- 2. حذف سجل السداد (settlement) نفسه لأنه تم استخدامه في التصفية
    DELETE FROM public.financial_transactions 
    WHERE wallet_id = p_wallet_id AND transaction_type = 'settlement' AND amount = p_amount;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ------------------------------------------------------
-- حادي عشر: أتمتة الدفع عند اكتمال الرحلة
-- ------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_load_completion()
RETURNS TRIGGER AS $$
BEGIN
    -- ضبط مسار البحث للأمان
    SET search_path = public;
    
    -- إذا تغيرت حالة الرحلة إلى "مكتملة"
    IF (NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed')) THEN
        BEGIN
            PERFORM public.process_shipment_settlement(NEW.id);
        EXCEPTION WHEN OTHERS THEN
            -- إذا فشل الدفع التلقائي، لا نوقف عملية الحفظ ولكن نسجل الخطأ في سجلات السيرفر
            RAISE WARNING 'Auto-payment failed for load %: %', NEW.id, SQLERRM;
        END;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_load_completed ON public.loads;
CREATE TRIGGER on_load_completed
    AFTER UPDATE OF status ON public.loads
    FOR EACH ROW EXECUTE FUNCTION public.handle_load_completion();

-- ------------------------------------------------------
-- عاشراً: ترحيل الأرباح بأثر رجعي (SYNC ALL BALANCES)
-- ------------------------------------------------------

DO $$
DECLARE
    r RECORD;
BEGIN
    -- هذا الكود يمر على كافة الرحلات المكتملة التي لم يتم دفعها للمحافظ ويقوم بترحيلها الآن
    FOR r IN 
        SELECT l.id 
        FROM public.loads l
        LEFT JOIN public.shipment_finances sf ON l.id = sf.shipment_id
        WHERE l.status = 'completed' 
        AND l.driver_id IS NOT NULL 
        AND (sf.settlement_status IS NULL OR sf.settlement_status != 'settled')
    LOOP
        BEGIN
            PERFORM public.process_shipment_settlement(r.id);
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'فشل ترحيل الشحنة (ID: %): %', r.id, SQLERRM;
        END;
    END LOOP;
END $$;

-- ------------------------------------------------------
-- الثاني عشر: المزامنة التلقائية للرصيد (Wallet Sync Trigger)
-- ------------------------------------------------------

CREATE OR REPLACE FUNCTION public.update_wallet_balance()
RETURNS TRIGGER AS $$
BEGIN
    SET search_path = public;
    IF (TG_OP = 'INSERT') THEN
        -- التحقق من نوع الحركة وتحديث الرصيد
        IF (NEW.type = 'credit') THEN
            UPDATE public.wallets SET balance = balance + NEW.amount WHERE wallet_id = NEW.wallet_id;
        ELSIF (NEW.type = 'debit') THEN
            UPDATE public.wallets SET balance = balance - NEW.amount WHERE wallet_id = NEW.wallet_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Trigger after transaction change (Insert/Update/Delete) for balanced wallet
DROP TRIGGER IF EXISTS on_financial_transaction ON public.financial_transactions;
CREATE TRIGGER on_financial_transaction
    AFTER INSERT OR UPDATE OR DELETE ON public.financial_transactions
    FOR EACH ROW EXECUTE FUNCTION public.update_wallet_balance();

-- ------------------------------------------------------
-- الثالث عشر: تصفير وتحديث الأرصدة الحالية (Current Balance Sync)
-- ------------------------------------------------------

DO $$
DECLARE
    w RECORD;
BEGIN
    -- إعادة تشغيل الحسابات لكل المحافظ لضمان أن الرصيد الحالي يطابق مجموع العمليات
    FOR w IN SELECT wallet_id FROM public.wallets LOOP
        UPDATE public.wallets 
        SET balance = (
            COALESCE((SELECT SUM(amount) FROM public.financial_transactions WHERE wallet_id = w.wallet_id AND type = 'credit'), 0) -
            COALESCE((SELECT SUM(amount) FROM public.financial_transactions WHERE wallet_id = w.wallet_id AND type = 'debit'), 0)
        )
        WHERE wallet_id = w.wallet_id;
    END LOOP;
END $$;

-- إجبار Supabase على تحديث ذاكرة الواجهة البرمجية (Schema Cache)
NOTIFY pgrst, 'reload schema';
