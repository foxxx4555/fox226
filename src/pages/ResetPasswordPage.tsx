import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, Lock, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store/appStore';

export default function ResetPasswordPage() {
    const { t, i18n } = useTranslation();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [isSessionReady, setIsSessionReady] = useState(false); // حالة جديدة للتأكد من الجلسة
    const navigate = useNavigate();
    const setAuth = useAppStore(state => state.setAuth);

    // التأكد من أن الرابط يحتوي على جلسة صالحة عند تحميل الصفحة
    useEffect(() => {
        const checkSession = async () => {
            const { data } = await api.supabase.auth.getSession();
            if (data.session) {
                setIsSessionReady(true);
            } else {
                // إذا لم توجد جلسة، ننتظر قليلاً ربما سوبابيز يعالج الرابط
                setTimeout(async () => {
                    const { data: retryData } = await api.supabase.auth.getSession();
                    if (retryData.session) {
                        setIsSessionReady(true);
                    } else {
                        // إذا كان الرابط يحتوي على خطأ في العنوان
                        if (window.location.hash.includes('error=access_denied')) {
                            toast.error(i18n.language === 'ar' ? "رابط استعادة كلمة المرور منتهي أو غير صالح" : "Password reset link expired or invalid");
                            navigate('/login');
                        }
                    }
                }, 1500);
            }
        };
        checkSession();
    }, [navigate, i18n.language]);

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // التحقق من الجلسة قبل البدء
        if (!isSessionReady) {
            toast.error(i18n.language === 'ar' ? "يرجى الانتظار حتى يتم التحقق من الرابط..." : "Please wait while verifying the link...");
            return;
        }

        if (password !== confirmPassword) return toast.error(t('pass_mismatch'));
        if (password.length < 6) return toast.error(t('pass_too_short'));

        setLoading(true);
        try {
            // تحديث كلمة المرور
            const { error } = await api.supabase.auth.updateUser({ password });
            if (error) throw error;
            
            // جلب البيانات وتوجيه المستخدم
            const userData = await api.getCurrentUser();
            if (userData) {
                setAuth(userData.profile, userData.role);
                toast.success(t('success_reset'));

                const adminRoles = [
                    'super_admin', 'admin', 'finance', 'operations', 
                    'carrier_manager', 'vendor_manager', 'support', 'analytics'
                ];
                
                const userRole = userData.role.toLowerCase();
                if (adminRoles.includes(userRole)) {
                    navigate('/admin/dashboard');
                } else if (userRole === 'shipper') {
                    navigate('/shipper/dashboard');
                } else if (userRole === 'driver') {
                    navigate('/driver/dashboard');
                } else {
                    navigate('/');
                }
            } else {
                navigate('/login');
            }
        } catch (error: any) {
            console.error('Password reset error:', error);
            toast.error(error.message || (i18n.language === 'ar' ? "حدث خطأ أثناء التحديث" : "An error occurred during update"));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] relative overflow-hidden p-6" dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />

            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md relative z-10"
            >
                <Card className="shadow-2xl shadow-slate-200/50 border-white/60 bg-white/90 backdrop-blur-xl rounded-[2.5rem] overflow-hidden border-2">
                    <CardHeader className="text-center pt-10 pb-6 px-10">
                        <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-6 text-primary shadow-inner">
                            <ShieldCheck size={36} strokeWidth={2.5} />
                        </div>
                        <CardTitle className="text-3xl font-black text-slate-900 tracking-tight">{t('reset_password_new')}</CardTitle>
                        <p className="text-sm font-bold text-slate-400 mt-2 leading-relaxed">
                            {t('reset_password_desc')}
                        </p>
                    </CardHeader>
                    <CardContent className="px-10 pb-10">
                        <form onSubmit={handleUpdate} className="space-y-6">
                            <div className="space-y-2">
                                <Label className="text-xs font-black text-slate-500 ms-1 uppercase tracking-wider">{t('password')}</Label>
                                <div className="relative group">
                                    <Lock className={cn("absolute top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors", i18n.language === 'ar' ? "right-4" : "left-4")} size={20} />
                                    <Input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        dir="ltr"
                                        className={cn("h-14 rounded-2xl border-slate-100 bg-slate-50/50 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all font-bold text-lg", i18n.language === 'ar' ? "pr-12" : "pl-12")}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-black text-slate-500 ms-1 uppercase tracking-wider">{t('confirm_password_new')}</Label>
                                <div className="relative group">
                                    <Lock className={cn("absolute top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors", i18n.language === 'ar' ? "right-4" : "left-4")} size={20} />
                                    <Input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required
                                        dir="ltr"
                                        className={cn("h-14 rounded-2xl border-slate-100 bg-slate-50/50 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all font-bold text-lg", i18n.language === 'ar' ? "pr-12" : "pl-12")}
                                    />
                                </div>
                            </div>

                            <Button
                                type="submit"
                                className="w-full h-14 rounded-2xl text-lg font-black bg-primary hover:bg-primary/90 text-white shadow-xl shadow-primary/20 transition-all active:scale-[0.98]"
                                disabled={loading}
                            >
                                {loading ? <Loader2 className="animate-spin" /> : t('update_password_btn')}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}
