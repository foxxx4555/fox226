import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { toast } from 'sonner';
import {
  Loader2, Truck, Package, MailCheck, RefreshCcw, User, Phone, Lock,
  ChevronRight, UserCircle2, Eye, EyeOff, ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { UserRole } from '@/types';
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Checkbox } from '@/components/ui/checkbox';

export default function RegisterPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<UserRole | "">("");
  const [showOtp, setShowOtp] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [timer, setTimer] = useState(0);

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);

  // إدارة العداد الزمني لإعادة الإرسال
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timer > 0) {
      interval = setInterval(() => setTimer((prev) => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  // التحقق من وجود عملية تسجيل معلقة عند التحميل
  useEffect(() => {
    const savedEmail = localStorage.getItem('pending_email');
    if (savedEmail) {
      setForm(prev => ({ ...prev, email: savedEmail }));
      setShowOtp(true);
    }
  }, []);

  const validateForm = () => {
    if (!role) { toast.error('يرجى اختيار نوع الحساب'); return false; }
    if (form.full_name.length < 3) { toast.error('الاسم الكامل قصير جداً'); return false; }
    if (!/^\S+@\S+\.\S+$/.test(form.email)) { toast.error('البريد الإلكتروني غير صحيح'); return false; }
    if (form.phone.length < 8) { toast.error('رقم الجوال غير صحيح'); return false; }
    if (form.password.length < 6) { toast.error('كلمة المرور يجب أن تكون 6 أحرف على الأقل'); return false; }
    if (form.password !== form.confirmPassword) { toast.error('كلمات المرور غير متطابقة'); return false; }
    if (!agreePrivacy) { toast.error('يرجى الموافقة على سياسة الخصوصية'); return false; }
    if (!agreeTerms) { toast.error('يرجى الموافقة على الشروط والأحكام'); return false; }
    return true;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      await api.registerUser(form.email, form.password, {
        full_name: form.full_name,
        email: form.email,
        phone: form.phone,
        role: role as UserRole
      });

      localStorage.setItem('pending_email', form.email);
      toast.success('تم إرسال رمز التحقق إلى بريدك الإلكتروني');
      setShowOtp(true);
      setTimer(60);
    } catch (err: any) {
      toast.error(err.message || 'حدث خطأ أثناء التسجيل');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length < 6) return toast.error('يرجى إدخال الرمز المكون من 6 أرقام');

    setLoading(true);
    try {
      await api.verifyEmailOtp(form.email, otpCode);
      localStorage.removeItem('pending_email');
      toast.success('تم تفعيل الحساب بنجاح! جاري التحويل...');
      setTimeout(() => navigate('/login'), 1500);
    } catch (err: any) {
      toast.error('الرمز غير صحيح أو منتهي الصلاحية');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (timer > 0 || loading) return;
    setLoading(true);
    try {
      await api.resendOtp(form.email);
      setTimer(60);
      toast.success('تم إعادة إرسال الكود بنجاح');
    } catch (err: any) {
      toast.error('فشل إعادة الإرسال، حاول ثانية');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] relative overflow-hidden p-4 md:p-6 py-12" dir="rtl">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-blue-500/5 rounded-full blur-[80px] translate-y-1/4 -translate-x-1/4" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-xl relative z-10"
      >
        {/* رأس الصفحة - مضغوط */}
        <div className="text-center mb-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto shadow-xl shadow-primary/5 mb-3 border border-slate-50 relative overflow-hidden"
          >
            <img src="/logo.png" className="w-12 h-12 object-contain relative z-10 p-1" alt="Logo" />
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
          </motion.div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight mb-1">
            {showOtp ? 'تأكيد الحساب' : 'إنشاء حساب جديد'}
          </h1>
          <p className="text-[10px] font-bold text-slate-400">
            {showOtp ? 'أدخل الرمز المرسل لإتمام عملية التسجيل' : 'منصة SAS Transport للخدمات اللوجستية'}
          </p>
        </div>

        <Card className="shadow-2xl shadow-slate-200/50 border-white/60 bg-white/90 backdrop-blur-xl rounded-[2rem] overflow-hidden border-2">
          <CardContent className="p-6 md:p-8">
            <AnimatePresence mode="wait">
              {!showOtp ? (
                <motion.form
                  key="register-form"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  onSubmit={handleRegister}
                  className="space-y-6"
                >
                  {/* Role Selection */}
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black text-slate-400 ms-1 uppercase">نوع الحساب *</Label>
                    <Select onValueChange={(val) => setRole(val as UserRole)} value={role}>
                      <SelectTrigger className="w-full h-11 rounded-xl border-slate-100 bg-slate-50/50 shadow-sm font-bold text-xs px-4 focus:ring-primary/20 transition-all">
                        <SelectValue placeholder="سائق أم صاحب شحنة؟" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl shadow-2xl border-slate-100">
                        <SelectItem value="driver" className="h-10 font-bold cursor-pointer">
                          <div className="flex items-center gap-2">
                            <Truck size={14} className="text-primary" />
                            <span>سائق / ناقل</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="shipper" className="h-10 font-bold cursor-pointer">
                          <div className="flex items-center gap-2">
                            <Package size={14} className="text-blue-500" />
                            <span>صاحب شحنة / تاجر</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Personal Info Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black text-slate-400 ms-1 uppercase">الاسم الكامل</Label>
                      <div className="relative">
                        <User className="absolute start-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                        <Input
                          placeholder="الاسم الثلاثي"
                          value={form.full_name}
                          onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))}
                          required
                          className="ps-11 h-11 rounded-xl border-slate-100 bg-slate-50/50 focus:bg-white focus:border-primary transition-all font-bold text-xs"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black text-slate-400 ms-1 uppercase">رقم الجوال</Label>
                      <div className="relative group">
                        <Phone className="absolute start-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                        <Input
                          type="tel"
                          placeholder="05xxxxxxxx"
                          value={form.phone}
                          onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                          dir="ltr"
                          className="ps-11 h-11 rounded-xl border-slate-100 bg-slate-50/50 focus:bg-white focus:border-primary transition-all font-bold text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black text-slate-400 ms-1 uppercase">البريد الإلكتروني</Label>
                    <Input
                      type="email"
                      placeholder="example@mail.com"
                      value={form.email}
                      onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                      required
                      dir="ltr"
                      className="h-11 rounded-xl border-slate-100 bg-slate-50/50 focus:bg-white focus:border-primary transition-all font-bold text-xs shadow-sm"
                    />
                  </div>

                  {/* Password Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black text-slate-400 ms-1 uppercase">كلمة المرور</Label>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          value={form.password}
                          onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                          required
                          dir="ltr"
                          className="h-11 rounded-xl border-slate-100 bg-slate-50/50 focus:bg-white focus:border-primary transition-all font-bold text-xs"
                        />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute end-4 top-1/2 -translate-y-1/2 text-slate-300">
                          {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black text-slate-400 ms-1 uppercase">تأكيد كلمة المرور</Label>
                      <div className="relative">
                        <Input
                          type={showConfirmPassword ? "text" : "password"}
                          value={form.confirmPassword}
                          onChange={e => setForm(p => ({ ...p, confirmPassword: e.target.value }))}
                          required
                          dir="ltr"
                          className="h-11 rounded-xl border-slate-100 bg-slate-50/50 focus:bg-white focus:border-primary transition-all font-bold text-xs"
                        />
                        <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute end-4 top-1/2 -translate-y-1/2 text-slate-300">
                          {showConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Policies Checkboxes */}
                  <div className="space-y-1.5 bg-slate-50/50 p-3 rounded-xl border border-dashed border-slate-200">
                    <div className="flex items-center gap-2">
                      <Checkbox id="privacy" checked={agreePrivacy} onCheckedChange={(val) => setAgreePrivacy(val as boolean)} className="rounded-md border-slate-300 h-4 w-4" />
                      <Label htmlFor="privacy" className="text-[10px] font-bold text-slate-500 cursor-pointer">
                        أوافق على <Link to="/privacy" className="text-primary hover:underline">سياسة الخصوصية</Link>
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox id="terms" checked={agreeTerms} onCheckedChange={(val) => setAgreeTerms(val as boolean)} className="rounded-md border-slate-300 h-4 w-4" />
                      <Label htmlFor="terms" className="text-[10px] font-bold text-slate-500 cursor-pointer">
                        أوافق على <Link to="/terms" className="text-primary hover:underline">الشروط والأحكام</Link>
                      </Label>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-11 rounded-xl text-sm font-black bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 transition-all active:scale-[0.98]"
                  >
                    {loading ? <Loader2 className="animate-spin" /> : 'إنشاء حساب جديد'}
                  </Button>

                  <div className="text-center mt-4">
                    <p className="text-[11px] font-bold text-slate-400">
                      لديك حساب بالفعل؟ <Link to="/login" className="text-primary hover:underline font-black">دخول</Link>
                    </p>
                  </div>
                </motion.form>
              ) : (
                <motion.form
                  key="otp-form"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  onSubmit={handleVerify}
                  className="space-y-6 text-center"
                >
                  <div className="w-16 h-16 bg-primary/5 text-primary rounded-2xl flex items-center justify-center mx-auto shadow-inner border border-primary/10">
                    <MailCheck size={32} className="animate-pulse" />
                  </div>

                  <div className="space-y-1">
                    <h2 className="text-lg font-black text-slate-800">تحقق من بريدك</h2>
                    <p className="text-[10px] font-bold text-slate-400 px-4">
                      أدخل الرمز المكون من 6 أرقام المرسل إلى: <br />
                      <span className="text-primary font-black break-all">{form.email}</span>
                    </p>
                  </div>

                  <div className="flex justify-center" dir="ltr">
                    <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode} autoFocus>
                      <InputOTPGroup className="gap-2 md:gap-3">
                        {[0, 1, 2, 3, 4, 5].map((i) => (
                          <InputOTPSlot
                            key={i}
                            index={i}
                            className="h-14 w-11 md:h-16 md:w-14 text-2xl font-black rounded-xl border-2 bg-slate-50/50 border-slate-100 focus-within:border-primary focus-within:bg-white transition-all"
                          />
                        ))}
                      </InputOTPGroup>
                    </InputOTP>
                  </div>

                  <div className="space-y-4">
                    <Button
                      type="submit"
                      className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black text-lg shadow-xl shadow-primary/10 transition-all"
                      disabled={loading || otpCode.length < 6}
                    >
                      {loading ? <Loader2 className="animate-spin" /> : 'تأكيد الرمز ✅'}
                    </Button>

                    <div className="flex flex-col gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={timer > 0 || loading}
                        onClick={handleResendOtp}
                        className="font-bold text-slate-500 hover:text-primary transition-colors text-[10px]"
                      >
                        {timer > 0 ? `إعادة إرسال خلال (${timer} ثانية)` : (
                          <span className="flex items-center gap-2">
                            <RefreshCcw size={12} /> إعادة إرسال الرمز
                          </span>
                        )}
                      </Button>

                      <button
                        type="button"
                        onClick={() => {
                          localStorage.removeItem('pending_email');
                          setShowOtp(false);
                          setOtpCode("");
                        }}
                        className="text-[9px] font-bold text-slate-400 hover:text-slate-600 flex items-center justify-center gap-1"
                      >
                        <ChevronRight size={12} className="rotate-180" /> تعديل بيانات التسجيل
                      </button>
                    </div>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
