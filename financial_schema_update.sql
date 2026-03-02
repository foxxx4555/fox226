-- ==========================================
-- تحديثات الدورة المالية (مديونيات الشاحنين ومستحقات السائقين)
-- يرجى تشغيل هذا السكريبت في محرر SQL الخاص بـ Supabase
-- ==========================================

-- 1. إضافة بيانات الحساب البنكي للسائقين (في جدول profiles)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='bank_name') THEN
        ALTER TABLE profiles ADD COLUMN bank_name VARCHAR(100);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='account_name') THEN
        ALTER TABLE profiles ADD COLUMN account_name VARCHAR(100);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='account_number') THEN
        ALTER TABLE profiles ADD COLUMN account_number VARCHAR(50);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='iban') THEN
        ALTER TABLE profiles ADD COLUMN iban VARCHAR(50);
    END IF;
END $$;

-- 2. تحديث جدول طلبات السحب (withdrawal_requests)
-- إضافة حقول لإثبات التحويل من قبل الإدارة
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='withdrawal_requests' AND column_name='proof_image_url') THEN
        ALTER TABLE withdrawal_requests ADD COLUMN proof_image_url TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='withdrawal_requests' AND column_name='admin_notes') THEN
        ALTER TABLE withdrawal_requests ADD COLUMN admin_notes TEXT;
    END IF;
END $$;

-- 3. إنشاء جدول مدفوعات الشاحنين (shipper_payments)
-- هذا الجدول مخصص لرفع الشاحن لإثبات سداد المديونية ليقوم المدير بمراجعته
CREATE TABLE IF NOT EXISTS shipper_payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    shipper_id UUID REFERENCES auth.users(id) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    shipment_id UUID REFERENCES loads(id), -- إذا كان الدفع مخصص لشحنة معينة (اختياري)
    proof_image_url TEXT NOT NULL,         -- صورة الإيصال/التحويل
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    admin_notes TEXT,                      -- ملاحظات المدير (سبب الرفض مثلاً)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- إعداد قواعد الحماية (RLS) لجدول shipper_payments
ALTER TABLE shipper_payments ENABLE ROW LEVEL SECURITY;

-- الشاحن يمكنه رؤية وإضافة مدفوعاته فقط
CREATE POLICY "Shippers can view their own payments" ON shipper_payments
    FOR SELECT USING (auth.uid() = shipper_id);

CREATE POLICY "Shippers can insert their own payments" ON shipper_payments
    FOR INSERT WITH CHECK (auth.uid() = shipper_id);

-- الإدارة (المدير والموظفين) يمكنهم رؤية وتحديث جميع المدفوعات
-- افترضنا أن دور الإدارة يُعرف في جدول profiles كـ 'admin' (قد تحتاج لتعديل هذا بناءً على بنية الصلاحيات لديك)
CREATE POLICY "Admins can view and manage all payments" ON shipper_payments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.user_type = 'admin'
        )
    );

-- 4. إعداد مساحة تخزين (Storage) للإيصالات
-- يجب عليك إنشاء Bucket جديد في Supabase Storage باسم 'receipts' وتعيينه ليكون 'Public'
-- ستقوم واجهات المستخدم برفع صور الحوالات (سواء من الشاحن أو الإدارة) إلى هذا المُستودع.
