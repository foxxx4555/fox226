import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
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
  ChevronRight, UserCircle2, Eye, EyeOff, ShieldCheck, FileUp, Image as ImageIcon, CheckCircle2, Link2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { UserRole } from '@/types';
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Checkbox } from '@/components/ui/checkbox';

export default function RegisterPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<UserRole | "">("");
  const [showOtp, setShowOtp] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [timer, setTimer] = useState(0);

  const [searchParams] = useSearchParams();
  const [form, setForm] = useState({
    full_name: '',
    username: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    inviteCode: searchParams.get('invite') || ''
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);

  // مستندات السائق
  const [files, setFiles] = useState<{
    license: File | null;
    idDoc: File | null;
    truckImg: File | null;
  }>({ license: null, idDoc: null, truckImg: null });

  const licenseRef = useRef<HTMLInputElement>(null);
  const idRef = useRef<HTMLInputElement>(null);
  const truckRef = useRef<HTMLInputElement>(null);

  const [uploadProgress, setUploadProgress] = useState({
    license: false,
    idDoc: false,
    truckImg: false
  });

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
    if (!role) { toast.error(t('select_account_type')); return false; }
    if (form.full_name.length < 3) { toast.error(t('name_too_short')); return false; }
    if (form.username.length < 3) { toast.error(t('username_too_short')); return false; }
    if (!/^[a-zA-Z0-9_\.]+$/.test(form.username)) { toast.error(t('username_invalid_chars')); return false; }
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) { toast.error(t('invalid_email')); return false; }
    if (form.phone.length < 8) { toast.error(t('invalid_phone')); return false; }
    if (form.password.length < 6) { toast.error(t('pass_too_short')); return false; }
    if (form.password !== form.confirmPassword) { toast.error(t('pass_mismatch')); return false; }
    if (!agreeTerms) { toast.error(t('agree_terms_error')); return false; }

    if (role === 'driver') {
      if (!files.license) { toast.error(t('license_required')); return false; }
      if (!files.idDoc) { toast.error(t('id_required')); return false; }
      if (!form.inviteCode && !files.truckImg) { 
        toast.error(t('truck_img_required')); 
        return false; 
      }
    }
    return true;
  };

  const uploadFile = async (file: File, docType: string) => {
    try {
      const publicUrl = await api.uploadImage(file, 'documents');
      return publicUrl;
    } catch (error) {
      console.error(`Error uploading ${docType}:`, error);
      throw new Error(t('upload_failed', { type: docType }));
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      // التحقق من توفر اسم المستخدم قبل البدء لتقليل احتمالية فشل عملية الـ Auth
      const usernameExists = await api.checkUsernameExists(form.username);
      if (usernameExists) {
        toast.error(t('username_exists'));
        setLoading(false);
        return;
      }

      let urls = {
        driving_license_url: '',
        id_document_url: '',
        truck_image_url: ''
      };

      if (role === 'driver') {
        toast.info(t('uploading_docs'));

        const uploadPromises = [
          api.uploadImage(files.license!, 'documents'),
          api.uploadImage(files.idDoc!, 'documents'),
        ];

        let truckUrlTemp = '';
        if (files.truckImg) {
          uploadPromises.push(api.uploadImage(files.truckImg!, 'documents'));
        }

        const resolvedUrls = await Promise.all(uploadPromises);

        urls = {
          driving_license_url: resolvedUrls[0] || '',
          id_document_url: resolvedUrls[1] || '',
          truck_image_url: resolvedUrls[2] || ''
        };
      }

      const hasEmail = !!form.email.trim();
      const authEmail = hasEmail ? form.email.trim() : `${form.phone.trim()}@sasgo.com`;

      await api.registerUser(authEmail, form.password, {
        full_name: form.full_name,
        username: form.username,
        email: hasEmail ? form.email.trim() : 'NA',
        phone: form.phone,
        role: role as UserRole,
        ...urls
      });

      if (hasEmail) {
        localStorage.setItem('pending_email', authEmail);
        toast.success(t('otp_sent'));
        setShowOtp(true);
        setTimer(60);
      } else {
        toast.success(t('success_activate') || 'تم التسجيل بنجاح');
        setTimeout(() => navigate('/login'), 1500);
      }
    } catch (err: any) {
      if (err.code === 'over_email_send_rate_limit' || err.message?.includes('rate limit')) {
        toast.error('لقد تجاوزت الحد المسموح به لإرسال رسائل البريد. يرجى المحاولة بعد قليل.');
      } else {
        toast.error(err.message || t('error'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length < 6) return toast.error(t('enter_6_digits'));

    setLoading(true);
    try {
      await api.verifyEmailOtp(form.email, otpCode);
      
      // If there is an invite code and the user registered as a driver, link them automatically
      if (form.inviteCode && role === 'driver') {
        try {
          await api.addInvitedSubDriver(form.inviteCode, { driver_name: form.full_name, driver_phone: form.phone });
        } catch (e) {
          console.warn("Could not automatically add sub driver (Invalid code or other error):", e);
        }
      }

      localStorage.removeItem('pending_email');
      toast.success(t('success_activate'));
      setTimeout(() => navigate('/login'), 1500);
    } catch (err: any) {
      if (err.code === 'otp_expired' || err.message?.includes('expired')) {
        toast.error('رمز التحقق منتهي الصلاحية أو غير صحيح');
      } else {
        toast.error(t('invalid_otp'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (timer > 0 || loading) return;
    setLoading(true);
    try {
      await api.resendOtp(form.email, 'signup');
      setTimer(60);
      toast.success(t('otp_resent'));
    } catch (err: any) {
      console.error("Resend OTP Error:", err);
      if (err.code === 'over_email_send_rate_limit' || err.message?.includes('rate limit')) {
        toast.error('لقد تجاوزت الحد المسموح به لإرسال رسائل البريد. يرجى المحاولة بعد قليل.');
      } else {
        toast.error(t('resend_failed'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] relative overflow-hidden p-4 md:p-6 py-12" dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
      {/* Background Decorative Elements */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-blue-500/5 rounded-full blur-[80px] translate-y-1/4 -translate-x-1/4" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-xl relative z-10"
      >

        <Card className="shadow-2xl shadow-slate-200/50 border-white/60 bg-white/90 backdrop-blur-xl rounded-[2rem] overflow-hidden border-2">
          <CardContent className="p-0">
            <div className="flex flex-col md:flex-row items-stretch">
              {/* Header/Side Info */}
              <div className="w-full md:w-[30%] bg-slate-50/50 p-6 flex flex-col items-center justify-center border-b md:border-b-0 md:border-l border-slate-100">
                 <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="w-16 h-16 bg-white rounded-xl flex items-center justify-center shadow-md border border-slate-50 relative overflow-hidden mb-3"
                >
                  <img src="/logo.png" className="w-11 h-11 object-contain relative z-10 p-1" alt="Logo" />
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
                </motion.div>
                <h1 className="text-lg font-black text-slate-900 tracking-tight text-center">
                  {showOtp ? t('verify_title') : t('register_title')}
                </h1>
                <p className="text-[9px] font-bold text-slate-400 text-center">
                  {showOtp ? t('verify_subtitle') : t('register_subtitle')}
                </p>
              </div>

              {/* Form Content */}
              <div className="w-full md:w-[70%] p-6 md:p-8">
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
                    <Label className="text-[10px] font-black text-slate-400 ms-1 uppercase">{t('account_type')} *</Label>
                    <Select onValueChange={(val) => setRole(val as UserRole)} value={role}>
                      <SelectTrigger className="w-full h-11 rounded-xl border-slate-100 bg-slate-50/50 shadow-sm font-bold text-xs px-4 focus:ring-primary/20 transition-all">
                        <SelectValue placeholder={t('driver_shipper_placeholder')} />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl shadow-2xl border-slate-100">
                        <SelectItem value="driver" className="h-10 font-bold cursor-pointer">
                          <div className="flex items-center gap-2">
                            <Truck size={14} className="text-primary" />
                            <span>{t('driver_carrier')}</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="shipper" className="h-10 font-bold cursor-pointer">
                          <div className="flex items-center gap-2">
                            <Package size={14} className="text-blue-500" />
                            <span>{t('shipper_merchant')}</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Personal Info Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black text-slate-400 ms-1 uppercase">{t('full_name')}</Label>
                      <div className="relative">
                        <User className={cn("absolute top-1/2 -translate-y-1/2 text-slate-300", i18n.language === 'ar' ? "right-4" : "left-4")} size={16} />
                        <Input
                          placeholder={t('full_name_placeholder')}
                          value={form.full_name}
                          onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))}
                          required
                          className={cn("h-11 rounded-xl border-slate-100 bg-slate-50/50 focus:bg-white focus:border-primary transition-all font-bold text-xs", i18n.language === 'ar' ? "pr-11" : "pl-11")}
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black text-slate-400 ms-1 uppercase">{t('username')}</Label>
                      <div className="relative group">
                        <UserCircle2 className={cn("absolute top-1/2 -translate-y-1/2 text-slate-300", i18n.language === 'ar' ? "right-4" : "left-4")} size={16} />
                        <Input
                          placeholder={t('username_placeholder_only')}
                          value={form.username}
                          onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
                          dir="ltr"
                          className={cn("h-11 rounded-xl border-slate-100 bg-slate-50/50 focus:bg-white focus:border-primary transition-all font-bold text-xs", i18n.language === 'ar' ? "pr-11" : "pl-11")}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black text-slate-400 ms-1 uppercase">
                        {t('email')} <span className="text-gray-300 font-normal normal-case ml-1">- اختياري</span>
                      </Label>
                      <Input
                        type="email"
                        placeholder={t('email_placeholder')}
                        value={form.email}
                        onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                        dir="ltr"
                        className="h-11 rounded-xl border-slate-100 bg-slate-50/50 focus:bg-white focus:border-primary transition-all font-bold text-xs shadow-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black text-slate-400 ms-1 uppercase">{t('phone')}</Label>
                      <div className="relative group">
                        <Phone className={cn("absolute top-1/2 -translate-y-1/2 text-slate-300", i18n.language === 'ar' ? "right-4" : "left-4")} size={16} />
                        <Input
                          type="tel"
                          placeholder={t('phone_placeholder')}
                          value={form.phone}
                          onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                          dir="ltr"
                          className={cn("h-11 rounded-xl border-slate-100 bg-slate-50/50 focus:bg-white focus:border-primary transition-all font-bold text-xs", i18n.language === 'ar' ? "pr-11" : "pl-11")}
                        />
                      </div>
                    </div>
                  </div>



                  {/* Password Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black text-slate-400 ms-1 uppercase">{t('password')}</Label>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          value={form.password}
                          onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                          required
                          dir="ltr"
                          placeholder="••••••••"
                          className={cn("h-11 rounded-xl border-slate-100 bg-slate-50/50 focus:bg-white focus:border-primary transition-all font-bold text-xs", i18n.language === 'ar' ? "pr-4 pl-12" : "pl-4 pr-12")}
                        />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className={cn("absolute top-1/2 -translate-y-1/2 text-slate-300", i18n.language === 'ar' ? "left-4" : "right-4")}>
                          {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black text-slate-400 ms-1 uppercase">{t('confirm_password')}</Label>
                      <div className="relative">
                        <Input
                          type={showConfirmPassword ? "text" : "password"}
                          value={form.confirmPassword}
                          onChange={e => setForm(p => ({ ...p, confirmPassword: e.target.value }))}
                          required
                          dir="ltr"
                          placeholder="••••••••"
                          className={cn("h-11 rounded-xl border-slate-100 bg-slate-50/50 focus:bg-white focus:border-primary transition-all font-bold text-xs", i18n.language === 'ar' ? "pr-4 pl-12" : "pl-4 pr-12")}
                        />
                        <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className={cn("absolute top-1/2 -translate-y-1/2 text-slate-300", i18n.language === 'ar' ? "left-4" : "right-4")}>
                          {showConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <AnimatePresence>
                    {role === 'driver' && (
                      <motion.div
                        initial={{ opacity: 0, height: 0, marginTop: 0 }}
                        animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
                        exit={{ opacity: 0, height: 0, marginTop: 0 }}
                        className="space-y-1.5 overflow-hidden pb-2"
                      >
                        <Label className="text-[10px] font-black text-slate-400 ms-1 uppercase">{t('invite_code_label')}</Label>
                        <div className="relative group">
                          <Link2 className={cn("absolute top-1/2 -translate-y-1/2 text-slate-300", i18n.language === 'ar' ? "right-4" : "left-4")} size={16} />
                          <Input
                            placeholder={t('invite_code_placeholder')}
                            value={form.inviteCode}
                            onChange={e => setForm(p => ({ ...p, inviteCode: e.target.value }))}
                            dir="ltr"
                            className={cn("h-11 rounded-xl border-slate-100 bg-slate-50/50 focus:bg-white focus:border-primary transition-all font-bold text-xs shadow-sm", i18n.language === 'ar' ? "pr-11" : "pl-11")}
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Policies Checkboxes */}
                  <div className="space-y-1.5 bg-slate-50/50 p-3 rounded-xl border border-dashed border-slate-200">
                    <div className="flex items-center gap-2">
                      <Checkbox id="terms" checked={agreeTerms} onCheckedChange={(val) => setAgreeTerms(val as boolean)} className="rounded-md border-slate-300 h-4 w-4" />
                      <Label htmlFor="terms" className="text-xs font-bold text-slate-600 cursor-pointer">
                        {t('agree_to')} <Link to="/terms" className="text-blue-600 hover:underline">{t('terms_conditions')}</Link> {i18n.language === 'ar' ? 'و' : '&'} <Link to="/privacy" className="text-blue-600 hover:underline">{t('privacy_policy')}</Link>
                      </Label>
                    </div>
                  </div>

                  {/* Driver Documents Upload (Animated) */}
                  <AnimatePresence>
                    {role === 'driver' && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-4 pt-2 border-t border-dashed border-slate-100"
                      >
                        <Label className="text-[10px] font-black text-slate-400 ms-1 uppercase">{t('required_driver_docs')}</Label>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {/* License */}
                          <div
                            onClick={() => licenseRef.current?.click()}
                            className={cn(
                              "relative cursor-pointer group p-3 rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center gap-2",
                              files.license ? "border-emerald-200 bg-emerald-50/30" : "border-slate-100 bg-slate-50/50 hover:bg-slate-100/80 hover:border-primary/30"
                            )}
                          >
                            <input type="file" ref={licenseRef} onChange={e => setFiles(p => ({ ...p, license: e.target.files?.[0] || null }))} className="hidden" accept="image/*,application/pdf" title={t('driving_license')} />
                            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-all", files.license ? "bg-emerald-500 text-white" : "bg-white text-slate-400 group-hover:text-primary")}>
                              {files.license ? <CheckCircle2 size={18} /> : <FileUp size={18} />}
                            </div>
                            <span className="text-[9px] font-black text-slate-700">{t('driving_license')}</span>
                            {files.license && <span className="text-[7px] text-emerald-600 font-bold truncate max-w-full px-2">{files.license.name}</span>}
                          </div>

                          {/* ID Document */}
                          <div
                            onClick={() => idRef.current?.click()}
                            className={cn(
                              "relative cursor-pointer group p-3 rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center gap-2",
                              files.idDoc ? "border-emerald-200 bg-emerald-50/30" : "border-slate-100 bg-slate-50/50 hover:bg-slate-100/80 hover:border-primary/30"
                            )}
                          >
                            <input type="file" ref={idRef} onChange={e => setFiles(p => ({ ...p, idDoc: e.target.files?.[0] || null }))} className="hidden" accept="image/*,application/pdf" title={t('id_card')} />
                            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-all", files.idDoc ? "bg-emerald-500 text-white" : "bg-white text-slate-400 group-hover:text-primary")}>
                              {files.idDoc ? <CheckCircle2 size={18} /> : <FileUp size={18} />}
                            </div>
                            <span className="text-[9px] font-black text-slate-700">{t('id_card')}</span>
                            {files.idDoc && <span className="text-[7px] text-emerald-600 font-bold truncate max-w-full px-2">{files.idDoc.name}</span>}
                          </div>

                          {/* Truck Image */}
                          <div
                            onClick={() => truckRef.current?.click()}
                            className={cn(
                              "relative cursor-pointer group p-3 rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center gap-2",
                              files.truckImg ? "border-emerald-200 bg-emerald-50/30" : "border-slate-100 bg-slate-50/50 hover:bg-slate-100/80 hover:border-primary/30",
                              form.inviteCode && !files.truckImg ? "opacity-70" : ""
                            )}
                          >
                            <input type="file" ref={truckRef} onChange={e => setFiles(p => ({ ...p, truckImg: e.target.files?.[0] || null }))} className="hidden" accept="image/*" title={t('truck_pic')} />
                            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-all", files.truckImg ? "bg-emerald-500 text-white" : "bg-white text-slate-400 group-hover:text-primary")}>
                              {files.truckImg ? <CheckCircle2 size={18} /> : <ImageIcon size={18} />}
                            </div>
                            <span className="text-[9px] font-black text-slate-700 text-center">
                              {t('truck_pic')}
                              {form.inviteCode && <span className="block text-[7px] text-slate-400 font-bold mt-1">{t('optional_here')}</span>}
                            </span>
                            {files.truckImg && <span className="text-[7px] text-emerald-600 font-bold truncate max-w-full px-2">{files.truckImg.name}</span>}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-11 rounded-xl text-sm font-black bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 transition-all active:scale-[0.98]"
                  >
                    {loading ? <Loader2 className="animate-spin" /> : t('register_title')}
                  </Button>

                  <div className="text-center mt-4">
                    <p className="text-[11px] font-bold text-slate-400">
                      {t('have_account')} <Link to="/login" className="text-primary hover:underline font-black">{t('login')}</Link>
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
                    <h2 className="text-lg font-black text-slate-800">{t('check_email_verify')}</h2>
                    <p className="text-[10px] font-bold text-slate-400 px-4">
                      {t('verify_code_desc')} <br />
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
                      {loading ? <Loader2 className="animate-spin" /> : t('confirm_code') + ' ✅'}
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
                        {timer > 0 ? `${t('resend_in')} (${timer} ${t('seconds')})` : (
                          <span className="flex items-center gap-2">
                            <RefreshCcw size={12} /> {t('resend_code')}
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
                        <ChevronRight size={12} className={i18n.language === 'ar' ? "rotate-180" : "rotate-0"} /> {t('edit_reg_info')}
                      </button>
                    </div>
                  </div>
                </motion.form>
              )}
                </AnimatePresence>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
