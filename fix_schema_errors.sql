-- 1. إصلاح مشكلة جدول transactions (تغيير نوع user_id أو إضافته إذا كان مفقوداً)
-- إذا كان لديك جدول transactions القديم، نفضل استخدام financial_transactions الجديد
-- لكن لتفادي الأخطاء في دوالك القديمة، سنقوم بإضافة user_id إن لم يكن موجوداً
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='user_id') THEN
        ALTER TABLE transactions ADD COLUMN user_id UUID REFERENCES auth.users(id);
    ELSE
        -- إذا كان موجوداً لكن بنوع خاطئ (مثال text)، سنقوم بتحويله
        BEGIN
            ALTER TABLE transactions ALTER COLUMN user_id TYPE UUID USING user_id::text::uuid;
        EXCEPTION
            WHEN OTHERS THEN
                -- ربما هو UUID بالفعل
                NULL;
        END;
    END IF;
END $$;


-- 2. إعداد أنواع البيانات لجدول المحافظ (wallets)
DO $$ BEGIN
    CREATE TYPE user_type_enum AS ENUM ('shipper', 'carrier', 'platform');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. إصلاح مشكلة جدول wallets (إضافة user_type)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='wallets' AND column_name='user_type') THEN
        -- إضافة العمود وربطه بنوع البيانات الجديد
        ALTER TABLE wallets ADD COLUMN user_type user_type_enum DEFAULT 'shipper';
        
        -- تحديث نوع المحافظ الحالية لتتوافق مع نوع المستخدمين (إن وجد ربط)
        UPDATE wallets 
        SET user_type = (
            SELECT p.user_type::user_type_enum 
            FROM profiles p 
            WHERE p.id = wallets.user_id 
            LIMIT 1
        );
        
        -- جعل الحقل إجبارياً بعد تحويل البيانات
        ALTER TABLE wallets ALTER COLUMN user_type SET NOT NULL;
    END IF;
END $$;

-- 4. إعداد المحفظة الافتراضية للمنصة
INSERT INTO wallets (user_type, balance, currency) 
SELECT 'platform', 0.00, 'SAR'
WHERE NOT EXISTS (SELECT 1 FROM wallets WHERE user_type = 'platform');

-- 5. تحديث دالة تسوية الشحنات لتستخدم name الصحيح
CREATE OR REPLACE FUNCTION process_shipment_settlement(p_shipment_id UUID)
RETURNS VOID AS $$
DECLARE
    v_shipper_wallet_id UUID;
    v_carrier_wallet_id UUID;
    v_platform_wallet_id UUID;
    v_shipment RECORD;
BEGIN
    -- الحصول على تفاصيل الشحنة
    SELECT * INTO v_shipment FROM shipment_finances WHERE shipment_id = p_shipment_id FOR UPDATE;

    IF v_shipment.settlement_status = 'settled' THEN
        RAISE EXCEPTION 'This shipment has already been settled';
    END IF;

    -- الحصول على حوافظ المستخدمين
    SELECT wallet_id INTO v_shipper_wallet_id FROM wallets WHERE user_id = v_shipment.shipper_id AND user_type = 'shipper';
    SELECT wallet_id INTO v_carrier_wallet_id FROM wallets WHERE user_id = v_shipment.carrier_id AND user_type = 'carrier';
    SELECT wallet_id INTO v_platform_wallet_id FROM wallets WHERE user_type = 'platform' LIMIT 1;

    -- 1. خصم مبلغ الشحنة من محفظة الشاحن
    UPDATE wallets SET balance = balance - v_shipment.shipment_price WHERE wallet_id = v_shipper_wallet_id;
    INSERT INTO financial_transactions (wallet_id, shipment_id, amount, type, description)
    VALUES (v_shipper_wallet_id, p_shipment_id, v_shipment.shipment_price, 'debit', 'Payment for shipment ' || p_shipment_id);

    -- 2. إيداع مستحقات السائق في محفظته
    UPDATE wallets SET balance = balance + v_shipment.carrier_amount WHERE wallet_id = v_carrier_wallet_id;
    INSERT INTO financial_transactions (wallet_id, shipment_id, amount, type, description)
    VALUES (v_carrier_wallet_id, p_shipment_id, v_shipment.carrier_amount, 'credit', 'Earnings from shipment ' || p_shipment_id);

    -- 3. إيداع عمولة المنصة
    UPDATE wallets SET balance = balance + v_shipment.platform_commission WHERE wallet_id = v_platform_wallet_id;
    INSERT INTO financial_transactions (wallet_id, shipment_id, amount, type, description)
    VALUES (v_platform_wallet_id, p_shipment_id, v_shipment.platform_commission, 'credit', 'Commission from shipment ' || p_shipment_id);

    -- تحديث حالة التسوية إلى مكتملة
    UPDATE shipment_finances SET settlement_status = 'settled' WHERE shipment_id = p_shipment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
