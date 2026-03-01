import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
// استيراد مكونات القائمة المنسدلة
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { toast } from 'sonner';
import {
  Loader2, Truck, Package, MailCheck, RefreshCcw, User, Phone, Lock, ChevronRight, UserCircle2,
  Eye, EyeOff
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { UserRole } from '@/types';
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

export default function RegisterPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // جعل القيمة الافتراضية فارغة لإجبار المستخدم على الاختيار
  const [role, setRole] = useState<UserRole | "">("");

  const [showOtp, setShowOtp] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [timer, setTimer] = useState(0);
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timer > 0) interval = setInterval(() => setTimer((prev) => prev - 1), 1000);
    return () => clearInterval(interval);
  }, [timer]);

  // أول ما الصفحة تفتح، يشوف لو فيه إيميل محفوظ مستني الرمز
  useEffect(() => {
    const savedEmail = localStorage.getItem('pending_email');
    if (savedEmail) {
      setForm(prev => ({ ...prev, email: savedEmail }));
      setShowOtp(true);
      setTimer(30); // رجعه لخطوة الرمز
    }
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    // منع التسجيل إذا لم يتم اختيار نوع الحساب
    if (!role) {
      toast.error('يرجى تحديد نوع الحساب أولاً');
      return;
    }

    if (form.password !== form.confirmPassword) {
      toast.error('كلمة المرور غير متطابقة');
      return;
    }

    setLoading(true);
    try {
      await api.registerUser(form.email, form.password, {
        full_name: form.full_name,
        email: form.email, // إضافة البريد للميتاداتا لضمان وصوله لقاعدة البيانات
        phone: form.phone,
        role: role as UserRole
      });

      // ✅ الزتونة: احفظ الإيميل هنا عشان لو حصل ريفريش
      localStorage.setItem('pending_email', form.email);

      toast.success('تم إرسال رمز التحقق بريدياً');
      setShowOtp(true);
      setTimer(60);
    } catch (err: any) {
      toast.error(err.message || t('error'));
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length < 6) return toast.error('الرجاء إدخال الرمز كاملاً (6 أرقام)');
    setLoading(true);
    try {
      await api.verifyEmailOtp(form.email, otpCode);
      localStorage.removeItem('pending_email');
      toast.success('تم تفعيل حسابك بنجاح! 🚀');
      navigate('/login');
    } catch (err: any) {
      toast.error('رمز التحقق غير صحيح أو انتهت صلاحيته');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (timer > 0) return;
    setLoading(true);
    try {
      await api.resendOtp(form.email);
      setTimer(60);
      toast.success('تم إعادة إرسال الرمز');
    } catch (err: any) { toast.error('فشل في إعادة الإرسال'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 relative overflow-hidden p-6 py-12" dir="rtl">
      {/* تأثيرات الخلفية */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2" />

      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-xl relative z-10">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto shadow-xl mb-6">
            <UserCircle2 className="text-primary w-10 h-10" />
          </div>
          <h1 className="text-3xl font-black tracking-tight">{showOtp ? 'تأكيد الهوية' : 'إنشاء حساب جديد'}</h1>
          <p className="text-muted-foreground font-medium mt-2">انضم إلى شبكة SAS Transport الذكية</p>
        </div>

        <Card className="shadow-[0_25px_60px_-15px_rgba(0,0,0,0.1)] border-white/50 bg-white/70 backdrop-blur-2xl rounded-[3rem] overflow-hidden border-2">
          <CardContent className="p-8 md:p-12">
            {!showOtp ? (
              <form onSubmit={handleRegister} className="space-y-8">

                {/* 🔽 القائمة المنسدلة لاختيار نوع الحساب (مثل سكرين 0214) 🔽 */}
                <div className="space-y-3">
                  <Label className="text-sm font-black text-slate-800 ms-1">نوع الحساب (مطلوب) *</Label>
                  <Select onValueChange={(val) => setRole(val as UserRole)} value={role}>
                    <SelectTrigger className="w-full h-16 rounded-2xl border-2 border-slate-100 bg-white shadow-sm font-black text-lg px-6 focus:border-primary focus:ring-primary transition-all">
                      <SelectValue placeholder="اختر: أنت سائق أم صاحب شاحنة؟" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-none shadow-2xl p-2 bg-white">
                      <SelectItem value="driver" className="h-14 font-black cursor-pointer rounded-xl focus:bg-primary/5">
                        <div className="flex items-center gap-3">
                          <Truck size={20} className="text-primary" />
                          <span>ناقل / سائق</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="shipper" className="h-14 font-black cursor-pointer rounded-xl focus:bg-primary/5">
                        <div className="flex items-center gap-3">
                          <Package size={20} className="text-amber-500" />
                          <span>تاجر / صاحب شحنة</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label className="text-xs font-black text-muted-foreground ms-2 uppercase">الاسم الكامل</Label>
                    <div className="relative group">
                      <User className="absolute start-4 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" size={18} />
                      <Input value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))} required className="ps-12 h-14 rounded-2xl border-transparent bg-muted/40 focus:bg-white focus:border-primary transition-all font-bold shadow-inner" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-black text-muted-foreground ms-2 uppercase">رقم الجوال</Label>
                    <div className="relative group">
                      <Phone className="absolute start-4 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" size={18} />
                      <Input type="tel" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} dir="ltr" className="ps-12 h-14 rounded-2xl border-transparent bg-muted/40 focus:bg-white focus:border-primary transition-all font-bold shadow-inner" />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-black text-muted-foreground ms-2 uppercase">البريد الإلكتروني</Label>
                  <Input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required dir="ltr" className="h-14 rounded-2xl border-transparent bg-muted/40 focus:bg-white focus:border-primary transition-all font-bold shadow-inner" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label className="text-xs font-black text-muted-foreground ms-2 uppercase">كلمة المرور</Label>
                    <div className="relative group">
                      <Input
                        type={showPassword ? "text" : "password"}
                        value={form.password}
                        onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                        required
                        className="h-14 rounded-2xl border-transparent bg-muted/40 focus:bg-white focus:border-primary transition-all font-bold shadow-inner pe-12"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute end-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-black text-muted-foreground ms-2 uppercase">تأكيد المرور</Label>
                    <div className="relative group">
                      <Input
                        type={showConfirmPassword ? "text" : "password"}
                        value={form.confirmPassword}
                        onChange={e => setForm(p => ({ ...p, confirmPassword: e.target.value }))}
                        required
                        className="h-14 rounded-2xl border-transparent bg-muted/40 focus:bg-white focus:border-primary transition-all font-bold shadow-inner pe-12"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute end-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                      >
                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading || !role} // التعطيل لو مختارش من القائمة
                  className={cn(
                    "w-full h-16 rounded-[1.5rem] mt-4 text-xl font-black transition-all shadow-xl",
                    !role ? "bg-slate-200 text-slate-400 cursor-not-allowed" : "bg-primary hover:bg-primary/95 text-white shadow-primary/20 active:scale-95"
                  )}
                >
                  {loading ? <Loader2 className="animate-spin" /> : 'إنشاء حساب جديد'}
                </Button>

                <p className="text-sm font-bold text-center text-muted-foreground mt-6">
                  {t('have_account')} <Link to="/login" className="text-primary hover:underline font-black underline-offset-4">تسجيل الدخول</Link>
                </p>
              </form>
            ) : (
              <form onSubmit={handleVerify} className="space-y-10 text-center animate-in fade-in zoom-in duration-300">
                <div className="w-24 h-24 bg-blue-50 text-blue-600 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-inner">
                  <MailCheck size={48} className="animate-bounce" />
                </div>

                <div className="space-y-2">
                  <h2 className="text-2xl font-black text-slate-800">أدخل رمز التفعيل</h2>
                  <p className="text-slate-400 font-bold">أرسلنا كود من 6 أرقام إلى: <br /> <span className="text-blue-600 font-black">{form.email}</span></p>
                </div>

                <div className="flex justify-center" dir="ltr">
                  <InputOTP
                    maxLength={6}
                    value={otpCode}
                    onChange={setOtpCode}
                  >
                    <InputOTPGroup className="gap-2 md:gap-3">
                      {[0, 1, 2, 3, 4, 5].map((i) => (
                        <InputOTPSlot
                          key={i}
                          index={i}
                          className="h-16 w-12 md:h-20 md:w-16 text-2xl md:text-3xl font-black rounded-2xl border-2 bg-slate-50 border-slate-100 focus-within:border-blue-500 focus-within:bg-white transition-all shadow-sm"
                        />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                </div>

                <div className="space-y-4">
                  <Button
                    type="submit"
                    className="w-full h-16 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xl shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
                    disabled={loading || otpCode.length < 6}
                  >
                    {loading ? <Loader2 className="animate-spin" /> : 'تأكيد الحساب ✅'}
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    className="font-bold text-slate-400 hover:text-slate-600"
                    onClick={() => {
                      localStorage.removeItem('pending_email');
                      setShowOtp(false);
                    }}
                  >
                    <RefreshCcw size={16} className="me-2" /> تعديل البيانات أو إعادة الإرسال
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

