import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export default function AddAdminById() {
    const [userId, setUserId] = useState('cfbc7f68-ec4f-4a9e-8d9d-f8e38e3ef95c');
    const [role, setRole] = useState('super_admin');
    const [loading, setLoading] = useState(false);

    const handleAddAdmin = async () => {
        setLoading(true);
        try {
            const { error } = await supabase.from('user_roles').upsert({
                user_id: userId,
                role: role as any
            }, { onConflict: 'user_id' });

            if (error) throw error;
            toast.success('تمت إضافة الصلاحية بنجاح!');
        } catch (e: any) {
            toast.error('حدث خطأ: ' + e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8 max-w-md mx-auto mt-20 bg-white rounded-3xl shadow-xl" dir="rtl">
            <h2 className="text-2xl font-black mb-6">إضافة مدير بالـ ID</h2>

            <div className="space-y-4">
                <div>
                    <label className="text-sm font-bold mb-1 block">رقم المستخدم (User ID)</label>
                    <Input
                        value={userId}
                        onChange={e => setUserId(e.target.value)}
                        dir="ltr"
                        className="font-mono text-xs"
                    />
                </div>

                <div>
                    <label className="text-sm font-bold mb-1 block">الصلاحية (Role في قاعدة البيانات)</label>
                    <Input
                        value={role}
                        onChange={e => setRole(e.target.value)}
                        dir="ltr"
                    />
                </div>

                <Button
                    onClick={handleAddAdmin}
                    disabled={loading}
                    className="w-full h-12 rounded-xl bg-blue-600 font-bold"
                >
                    {loading ? 'جاري التنفيذ...' : 'تعيين كمدير'}
                </Button>
            </div>
        </div>
    );
}
