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
import { Loader2, Truck, Package, MailCheck, RefreshCcw, User, Phone, Lock, ChevronRight, UserCircle2 } from 'lucide-react';
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

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timer > 0) interval = setInterval(() => setTimer((prev) => prev - 1), 1000);
    return () => clearInterval(interval);
  }, [timer]);

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
        phone: form.phone, 
        role: role as UserRole 
      });
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
    if (otpCode.length < 6) return toast.error('الرجاء إدخال الرمز كاملاً');
    setLoading(true);
    try {
      await api.verifyEmailOtp(form.email, otpCode);
      toast.success('تم تفعيل حسابك بنجاح!');
      navigate('/login');
    } catch (err: any) { toast.error('رمز التحقق غير صحيح'); }
    finally { setLoading(false); }
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
                      <Input value={form.full_name} onChange={e => setForm(p => ({...p, full_name: e.target.value}))} required className="ps-12 h-14 rounded-2xl border-transparent bg-muted/40 focus:bg-white focus:border-primary transition-all font-bold shadow-inner" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-black text-muted-foreground ms-2 uppercase">رقم الجوال</Label>
                    <div className="relative group">
                      <Phone className="absolute start-4 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" size={18} />
                      <Input type="tel" value={form.phone} onChange={e => setForm(p => ({...p, phone: e.target.value}))} dir="ltr" className="ps-12 h-14 rounded-2xl border-transparent bg-muted/40 focus:bg-white focus:border-primary transition-all font-bold shadow-inner" />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-black text-muted-foreground ms-2 uppercase">البريد الإلكتروني</Label>
                  <Input type="email" value={form.email} onChange={e => setForm(p => ({...p, email: e.target.value}))} required dir="ltr" className="h-14 rounded-2xl border-transparent bg-muted/40 focus:bg-white focus:border-primary transition-all font-bold shadow-inner" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label className="text-xs font-black text-muted-foreground ms-2 uppercase">كلمة المرور</Label>
                    <Input type="password" value={form.password} onChange={e => setForm(p => ({...p, password: e.target.value}))} required className="h-14 rounded-2xl border-transparent bg-muted/40 focus:bg-white focus:border-primary transition-all font-bold shadow-inner" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-black text-muted-foreground ms-2 uppercase">تأكيد المرور</Label>
                    <Input type="password" value={form.confirmPassword} onChange={e => setForm(p => ({...p, confirmPassword: e.target.value}))} required className="h-14 rounded-2xl border-transparent bg-muted/40 focus:bg-white focus:border-primary transition-all font-bold shadow-inner" />
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
              <form onSubmit={handleVerify} className="space-y-10 text-center">
                <div className="flex justify-center mb-6">
                   <div className="w-24 h-24 bg-primary/10 rounded-[2rem] flex items-center justify-center text-primary animate-bounce">
                     <MailCheck size={48} />
                   </div>
                </div>

                <div className="space-y-2">
                  <h2 className="text-2xl font-black">تأكيد الرمز</h2>
                  <p className="text-muted-foreground font-medium">أرسلنا رمزاً لبريدك الإلكتروني</p>
                </div>

                <div className="flex justify-center py-4" dir="ltr">
                  <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode}>
                    <InputOTPGroup className="gap-3">
                      {[0, 1, 2, 3, 4, 5].map((i) => (
                        <InputOTPSlot key={i} index={i} className="h-16 w-12 text-2xl font-black rounded-2xl border-2 bg-muted/20 border-transparent focus-within:border-primary transition-all" />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                </div>

                <Button type="submit" className="w-full h-16 rounded-[1.5rem] text-lg font-black shadow-xl" disabled={loading || otpCode.length < 6}>
                   تفعيل الحساب
                </Button>
                
                <Button type="button" variant="ghost" className="font-bold text-muted-foreground h-12" onClick={() => setShowOtp(false)}>
                   <ChevronRight className="ms-2" size={18}/> العودة لتصحيح البيانات
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
