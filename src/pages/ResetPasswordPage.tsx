import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export default function ResetPasswordPage() {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) return toast.error('كلمة المرور غير متطابقة');

        setLoading(true);
        try {
            // بننادي الدالة اللي ضفناها في api.ts
            await api.updatePassword(password);
            toast.success('تم تغيير كلمة المرور بنجاح، يمكنك الدخول الآن');
            navigate('/login');
        } catch (error: any) {
            toast.error(error.message || 'فشل تحديث كلمة المرور');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-muted/30 p-6">
            <div className="w-full max-w-md bg-white p-8 rounded-[2rem] shadow-xl text-right" dir="rtl">
                <h2 className="text-2xl font-black mb-6 text-center text-slate-800">تعيين كلمة مرور جديدة</h2>
                <form onSubmit={handleUpdate} className="space-y-5">
                    <div>
                        <label className="block text-sm font-bold mb-2 text-slate-700">كلمة المرور الجديدة</label>
                        <Input type="password" value={password} onChange={e => setPassword(e.target.value)} required className="h-14 font-bold rounded-xl" dir="ltr" />
                    </div>
                    <div>
                        <label className="block text-sm font-bold mb-2 text-slate-700">تأكيد كلمة المرور</label>
                        <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required className="h-14 font-bold rounded-xl" dir="ltr" />
                    </div>
                    <Button type="submit" disabled={loading} className="w-full h-14 rounded-xl font-black text-lg bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20 active:scale-95 transition-all">
                        {loading ? 'جاري التحديث...' : 'حفظ كلمة المرور والدخول'}
                    </Button>
                </form>
            </div>
        </div>
    );
}
