import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useAppStore } from '@/store/appStore';
import { api } from '@/services/api';
import AppLayout from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, User, Building, Shield, Image as ImageIcon, CheckCircle2, Trash2, FileText, ShieldCheck, Mail, RefreshCcw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

export default function ShipperAccount() {
  const { userProfile } = useAuth();
  const { setUserProfile } = useAppStore();
  const [form, setForm] = useState({
    full_name: userProfile?.full_name || '',
    username: userProfile?.username || '',
    company_name: (userProfile as any)?.company_name || '',
    commercial_register: (userProfile as any)?.commercial_register || '',
    tax_number: (userProfile as any)?.tax_number || '',
    phone: userProfile?.phone || '',
    email: userProfile?.email === 'NA' ? '' : (userProfile?.email || ''),
    password: '',
  });
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState({ totalLoads: 0, totalPayments: 0, joinDate: '' });
  
  // Verification states
  const [isVerified, setIsVerified] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifyStep, setVerifyStep] = useState<'email' | 'otp'>('email');
  const [otpType, setOtpType] = useState<'signup' | 'email_change'>('signup');
  const [otpCode, setOtpCode] = useState('');
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    if (userProfile?.id) {
      setForm({
        full_name: userProfile.full_name || '',
        username: userProfile.username || '',
        company_name: (userProfile as any).company_name || '',
        commercial_register: (userProfile as any).commercial_register || '',
        tax_number: (userProfile as any).tax_number || '',
        phone: userProfile.phone || '',
        email: userProfile.email === 'NA' ? '' : (userProfile.email || ''),
        password: '',
      });

      api.getUserLoads(userProfile.id).then(loads => {
        const totalLoads = loads.length;
        const totalPayments = loads
          .filter(l => l.status === 'completed')
          .reduce((sum, l) => sum + (Number(l.price) || 0), 0);

        const joinDate = new Date(userProfile.created_at || new Date()).toLocaleDateString('ar-SA', { month: 'long', year: 'numeric' });
        setStats({ totalLoads, totalPayments, joinDate });
      });

      // Check verification status
      supabase.auth.getUser().then(({ data: { user } }) => {
        setIsVerified(!!user?.email_confirmed_at && userProfile?.email !== 'NA');
      });
    }
  }, [userProfile]);

  const handleSendOtp = async () => {
    if (!form.email || form.email === 'NA') {
      toast.error('يرجى إدخال بريد إلكتروني صالح أولاً');
      return;
    }

    setVerifying(true);
    
    // انتقال تفاؤلي للواجهة (Optimistic UI) لضمان ظهور شاشة الكود للمستخدم فوراً
    // لأن البريد قد يصل بينما الطلب لا يزال معلقاً
    const timer = setTimeout(() => {
        setVerifyStep('otp');
    }, 1500);

    try {
      // 1. فحص الحالة الفورية من Auth قبل المحاولة
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email_confirmed_at && form.email === user.email) {
        clearTimeout(timer);
        setIsVerified(true);
        toast.success("حسابك موثق بالفعل ✅");
        setShowVerifyModal(false);
        return;
      }

      // 2. معالجة الإرسال
      if (form.email !== userProfile?.email) {
        setOtpType('email_change');
        // نحدث البريد أولاً ليبدأ سوبابيز عملية التغيير
        const { error: updateError } = await supabase.auth.updateUser({ email: form.email });
        if (updateError) throw updateError;
        
        // ثم نطلب إرسال رمز OTP خصيصاً للتغيير بدلاً من الرابط الافتراضي
        await api.resendOtp(form.email, 'email_change');
        toast.success('تم إرسال رمز التحقق لبريدك الجديد 📧');
      } else {
        setOtpType('signup');
        await api.resendOtp(form.email, 'signup');
        toast.success('تم إعادة إرسال رمز التحقق');
      }

      setVerifyStep('otp');
    } catch (err: any) {
      console.error("OTP Send Process:", err);
      // إذا حدث Timeout، ننتقل للخطوة التالية بفرض أن البريد تم إرساله (لأن المستخدم أبلغ عن وصوله)
      if (err.message === 'TIMEOUT') {
          setVerifyStep('otp');
          toast.info("تم بدء الإرسال، يرجى فحص بريدك الآن 📧");
      } else if (err.code === 'over_email_send_rate_limit' || err.message?.includes('rate limit')) {
          toast.error('لقد تجاوزت الحد المسموح به لإرسال رسائل البريد. يرجى المحاولة بعد قليل.');
      } else {
          toast.error(err.message || 'فشل إرسال رمز التحقق');
      }
    } finally {
      setVerifying(false);
      clearTimeout(timer);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode) {
      toast.error('يرجى إدخال رمز التحقق');
      return;
    }
    setVerifying(true);
    try {
      await api.verifyEmailOtp(form.email, otpCode, otpType);
      toast.success('تم توثيق الحساب بنجاح');
      setIsVerified(true);
      setShowVerifyModal(false);
    } catch (err: any) {
      if (err.code === 'otp_expired' || err.message?.includes('expired')) {
        toast.error('رمز التحقق منتهي الصلاحية أو غير صحيح');
      } else {
        toast.error(err.message || 'رمز التحقق غير صحيح');
      }
    } finally {
      setVerifying(false);
    }
  };

  const handleSave = async () => {
    if (!userProfile?.id) return;
    setSaving(true);
    try {
      const updatedData = await api.updateProfile(userProfile.id, {
        full_name: form.full_name,
        username: form.username,
        phone: form.phone,
        email: form.email || 'NA',
        company_name: form.company_name,
        commercial_register: form.commercial_register,
        tax_number: form.tax_number,
      });

      if (updatedData) {
        // Update both the local profile store and the auth state if possible, or just the store
        setUserProfile({ ...userProfile, ...updatedData });
      }

      if (form.password) {
        const { error } = await supabase.auth.updateUser({ password: form.password });
        if (error) {
            if (error.message?.includes('same_password') || error.message?.includes('different from the old')) {
                toast.info('كلمة المرور الجديدة مطابقة للقديمة، لم يتم تغييرها.');
            } else {
                throw error;
            }
        }
      }

      // تحذير في حالة تغيير البريد بدون توثيقه
      if (form.email && form.email !== userProfile?.email && !isVerified) {
          toast.warning("لقد قمت بتغيير البريد الإلكتروني. يرجى الضغط على 'توثيق الآن' وتأكيد الرمز لتتمكن من استخدامه في تسجيل الدخول مستقبلاً.");
      } else {
          toast.success('تم حفظ التغييرات بنجاح');
      }
      
      setForm(p => ({ ...p, password: '' }));
    } catch (err: any) {
      toast.error(err.message || 'حدث خطأ أثناء الحفظ');
    }
    finally { setSaving(false); }
  };

  const handleResetAccount = async () => {
    if (!confirm("تنبيه: سيتم حذف كافة الشحنات والعمليات بصفة نهائية من هذا الحساب. هل أنت متأكد؟")) return;
    setSaving(true);
    try {
      await api.deleteAllUserLoads(userProfile.id);
      toast.success("تم تصفية بيانات الحساب بنجاح");
      window.location.reload(); // Reload to refresh all stats
    } catch (err) {
      console.error(err);
      toast.error("حدث خطأ أثناء التصفية");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto space-y-8 pb-32 px-4">

        {/* Header with Background Accent */}
        <div className="relative overflow-hidden bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl">
          <div className="absolute right-0 top-0 w-64 h-64 bg-primary/20 rounded-full blur-[100px]"></div>
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-6">
              <div className="w-28 h-28 bg-white/10 backdrop-blur-md rounded-[2.5rem] flex items-center justify-center border border-white/20 shadow-inner group cursor-pointer overflow-hidden">
                {userProfile?.full_name ? (
                  <span className="text-5xl font-black text-primary">{userProfile.full_name.charAt(0)}</span>
                ) : <User size={48} />}
                <div className="absolute inset-0 bg-primary/80 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                  <ImageIcon className="text-white" size={32} />
                </div>
              </div>
              <div className="text-right">
                <h1 className="text-4xl font-black mb-2">{form.full_name || 'اكمل بياناتك'}</h1>
                <div className="flex items-center gap-3">
                <div className="flex items-center gap-3">
                  {isVerified ? (
                    <Badge className="bg-emerald-500 text-white border-none py-1.5 px-4 rounded-xl flex items-center gap-2 font-bold shadow-lg shadow-emerald-500/20">
                      <Shield size={14} /> حساب موثق
                    </Badge>
                  ) : (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setShowVerifyModal(true)}
                      className="h-9 px-4 bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100 font-bold rounded-xl flex items-center gap-2"
                    >
                      <ShieldCheck size={14} /> توثيق الآن
                    </Button>
                  )}
                  <span className="text-slate-400 font-bold">{form.email}</span>
                </div>
                </div>
              </div>
            </div>
            <Button onClick={handleSave} disabled={saving} className="h-16 rounded-[1.5rem] bg-primary hover:bg-primary/90 px-10 text-xl font-black gap-3 shadow-xl shadow-primary/20 transition-all transform hover:scale-105">
              {saving ? <Loader2 className="animate-spin" /> : "حفظ التعديلات"}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Sidebar Info */}
          <div className="space-y-6">
            <Card className="rounded-[2.5rem] border-none shadow-xl bg-white p-8">
              <h3 className="font-black text-xl mb-6 flex items-center gap-2">نبذة عن النشاط <Building size={20} className="text-primary" /></h3>
              <div className="space-y-6">
                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-1">تاريخ الانضمام</p>
                  <p className="font-bold text-slate-800">{stats.joinDate || '---'}</p>
                </div>
                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-1">عدد الشحنات الكلي</p>
                  <p className="font-bold text-slate-800">{stats.totalLoads} شحنة</p>
                </div>
                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-1">إجمالي المدفوعات</p>
                  <p className="font-bold text-primary">{stats.totalPayments.toLocaleString()} ريال</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Main Form */}
          <div className="lg:col-span-2 space-y-8">
            <Card className="rounded-[3rem] border-none shadow-xl bg-white p-10">
              <div className="mb-10 text-right border-b border-slate-50 pb-6">
                <h3 className="text-2xl font-black text-slate-900">المعلومات الرسمية</h3>
                <p className="text-slate-400 font-bold">يرجى التأكد من دقة البيانات لضمان عدم توقف حسابك</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <Label className="font-black text-sm text-slate-700 mr-2 uppercase tracking-wide">الاسم الكامل</Label>
                  <Input value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))} className="h-14 rounded-2xl bg-slate-50 border-slate-100 font-bold px-6 focus:ring-primary/20" />
                </div>
                <div className="space-y-3">
                  <Label className="font-black text-sm text-slate-700 mr-2 uppercase tracking-wide">اسم المستخدم</Label>
                  <Input value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))} className="h-14 rounded-2xl bg-slate-50 border-slate-100 font-bold px-6" />
                </div>
                <div className="space-y-3">
                  <Label className="font-black text-sm text-slate-700 mr-2 uppercase tracking-wide">اسم المنشأة / الشركة</Label>
                  <Input value={form.company_name} onChange={e => setForm(p => ({ ...p, company_name: e.target.value }))} className="h-14 rounded-2xl bg-slate-50 border-slate-100 font-bold px-6" />
                </div>
                <div className="space-y-3">
                  <Label className="font-black text-sm text-slate-700 mr-2 uppercase tracking-wide">رقم الجوال</Label>
                  <div className="relative">
                    <Input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} className="h-14 rounded-2xl bg-slate-50 border-slate-100 font-black px-6 pl-20" dir="ltr" />
                    <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-emerald-500 text-xs flex items-center gap-1">
                      <CheckCircle2 size={12} /> موثق
                    </span>
                  </div>
                </div>
                <div className="space-y-3">
                  <Label className="font-black text-sm text-slate-700 mr-2 uppercase tracking-wide">البريد الإلكتروني</Label>
                  <Input value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} className="h-14 rounded-2xl bg-slate-50 border-slate-100 font-bold px-6" dir="ltr" />
                </div>
                <div className="space-y-3">
                  <Label className="font-black text-sm text-slate-700 mr-2 uppercase tracking-wide">رقم السجل التجاري</Label>
                  <Input value={form.commercial_register} onChange={e => setForm(p => ({ ...p, commercial_register: e.target.value }))} className="h-14 rounded-2xl bg-slate-50 border-slate-100 font-bold px-6" dir="ltr" />
                </div>
                <div className="space-y-3">
                  <Label className="font-black text-sm text-slate-700 mr-2 uppercase tracking-wide">الرقم الضريبي</Label>
                  <Input value={form.tax_number} onChange={e => setForm(p => ({ ...p, tax_number: e.target.value }))} className="h-14 rounded-2xl bg-slate-50 border-slate-100 font-bold px-6" dir="ltr" />
                </div>
              </div>

              <div className="mt-12 pt-10 border-t border-slate-50">
                <div className="flex items-center gap-3 mb-8 text-amber-600">
                  <Shield size={24} />
                  <h4 className="text-xl font-black">حماية الحساب</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-end">
                  <div className="space-y-3">
                    <Label className="font-black text-sm text-slate-700 mr-2">تغيير كلمة المرور</Label>
                    <Input type="password" placeholder="••••••••" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} className="h-14 rounded-2xl bg-slate-50 border-slate-100 font-bold px-6" dir="ltr" />
                  </div>
                  <p className="text-[10px] text-slate-400 font-bold pb-4">اترك هذا الحقل فارغاً في حال لم ترغب في تغيير كلمة المرور الحالية.</p>
                </div>

                <div className="mt-12 pt-8 border-t border-rose-50 flex flex-col md:flex-row items-center justify-between gap-6">
                  <div>
                    <h4 className="text-xl font-black text-rose-600 mb-2">منطقة الخطر</h4>
                    <p className="text-slate-400 font-bold text-sm">سيتم مسح كافة سجلات الشحنات والعمليات المالية المرتبطة بهذا الحساب.</p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleResetAccount}
                    className="h-16 rounded-[1.5rem] border-rose-200 text-rose-600 hover:bg-rose-50 px-10 text-lg font-black gap-3 transition-all"
                  >
                    <Trash2 size={24} /> تصفية كافة البيانات
                  </Button>
                </div>
              </div>
              {/* Policy Links Section */}
              <div className="mt-12 pt-10 border-t border-slate-50">
                <div className="flex flex-col gap-4">
                  <Link to="/terms" className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-100 transition-colors group justify-end">
                    <span className="font-bold text-slate-700 group-hover:text-primary transition-colors">الشروط والأحكام</span>
                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-slate-500 group-hover:text-primary shadow-sm">
                      <FileText size={20} />
                    </div>
                  </Link>
                  <Link to="/privacy" className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-100 transition-colors group justify-end">
                    <span className="font-bold text-slate-700 group-hover:text-primary transition-colors">سياسة الخصوصية</span>
                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-slate-500 group-hover:text-primary shadow-sm">
                      <ShieldCheck size={20} />
                    </div>
                  </Link>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Verification Modal */}
      <Dialog open={showVerifyModal} onOpenChange={setShowVerifyModal}>
        <DialogContent className="max-w-sm rounded-[2rem] p-6" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-slate-900 border-b pb-3 mb-3">توثيق الحساب</DialogTitle>
          </DialogHeader>
          
          {verifyStep === 'email' ? (
            <div className="space-y-4">
              <p className="text-slate-500 font-bold text-sm text-center">سيتم إرسال رمز تحقق عشوائي إلى بريدك الإلكتروني لضمان ملكيتك للحساب.</p>
              <div className="space-y-1.5">
                <Label className="font-bold text-slate-700">البريد الإلكتروني</Label>
                <Input 
                  value={form.email} 
                  onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  className="h-12 rounded-xl bg-slate-50 border-slate-100 font-black px-4" 
                  dir="ltr" 
                  placeholder="name@example.com"
                />
              </div>
              <Button onClick={handleSendOtp} disabled={verifying} className="w-full h-12 rounded-xl bg-primary text-white font-black shadow-lg">
                {verifying ? <Loader2 className="animate-spin" /> : "إرسال الرمز"}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-slate-500 font-bold text-sm text-center">أدخل الرمز المكون من 6 أرقام المرسل إلى {form.email}</p>
              
              <div className="flex justify-center" dir="ltr">
                <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode} autoFocus>
                  <InputOTPGroup className="gap-2">
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                      <InputOTPSlot
                        key={i}
                        index={i}
                        className="h-12 w-10 text-xl font-black rounded-xl border-2 bg-slate-50 border-slate-100 focus-within:border-primary transition-all"
                      />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>

              <Button onClick={handleVerifyOtp} disabled={verifying} className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black shadow-lg">
                {verifying ? <Loader2 className="animate-spin" /> : "تأكيد التوثيق ✅"}
              </Button>
              
              <div className="flex flex-col gap-2">
                <Button variant="ghost" onClick={handleSendOtp} disabled={verifying} className="w-full font-bold text-xs gap-2">
                  <RefreshCcw size={14} /> إعادة إرسال الرمز
                </Button>
                <Button variant="ghost" onClick={() => setVerifyStep('email')} className="w-full font-bold text-slate-400">رجوع</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
