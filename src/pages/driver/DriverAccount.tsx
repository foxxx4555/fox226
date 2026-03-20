import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/store/appStore';
import { api } from '@/services/api';
import { supabase } from '@/integrations/supabase/client';
import AppLayout from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, User, Phone, Mail, ShieldCheck, CheckCircle2, Building, Image as ImageIcon, Briefcase, Truck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { FileUp, FileCheck, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

export default function DriverAccount() {
  const { t, i18n } = useTranslation();
  const { userProfile } = useAuth();
  const { setUserProfile } = useAppStore();
  const [form, setForm] = useState({
    full_name: userProfile?.full_name || '',
    phone: userProfile?.phone || '',
    email: userProfile?.email === 'NA' ? '' : (userProfile?.email || ''),
    id_number: (userProfile as any)?.id_number || '',
    plate_number: (userProfile as any)?.plate_number || '',
    password: '',
    bank_name: (userProfile as any)?.bank_name || '',
    account_name: (userProfile as any)?.account_name || '',
    account_number: (userProfile as any)?.account_number || '',
    iban: (userProfile as any)?.iban || '',
  });
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);

  // Verification states
  const [isVerified, setIsVerified] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifyStep, setVerifyStep] = useState<'email' | 'otp'>('email');
  const [otpType, setOtpType] = useState<'signup' | 'email_change'>('signup');
  const [otpCode, setOtpCode] = useState('');
  const [verifying, setVerifying] = useState(false);

  // Load user data and verification status
  useEffect(() => {
    if (userProfile?.id) {
      setForm(prev => ({
        ...prev,
        full_name: userProfile.full_name || '',
        phone: userProfile.phone || '',
        email: userProfile.email === 'NA' ? '' : (userProfile.email || ''),
        id_number: (userProfile as any).id_number || '',
        plate_number: (userProfile as any).plate_number || '',
        bank_name: (userProfile as any).bank_name || '',
        account_name: (userProfile as any).account_name || '',
        account_number: (userProfile as any).account_number || '',
        iban: (userProfile as any).iban || '',
      }));

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
    try {
      if (form.email !== userProfile?.email) {
        setOtpType('email_change');
        const { error } = await supabase.auth.updateUser({ email: form.email });
        if (error) throw error;
        toast.success('تم إرسال رمز التحقق للبريد الجديد');
      } else {
        setOtpType('signup');
        await api.resendOtp(form.email);
        toast.success('تم إعادة إرسال رمز التحقق');
      }
      setVerifyStep('otp');
    } catch (err: any) {
      if (err.code === 'over_email_send_rate_limit' || err.message?.includes('rate limit')) {
        toast.error('لقد تجاوزت الحد المسموح به لإرسال رسائل البريد. يرجى المحاولة بعد قليل.');
      } else {
        toast.error(err.message || 'فشل إرسال رمز التحقق');
      }
    } finally {
      setVerifying(false);
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


  const fileInputRef = useRef<HTMLInputElement>(null);
  const licenseInputRef = useRef<HTMLInputElement>(null);
  const idInputRef = useRef<HTMLInputElement>(null);
  const insuranceInputRef = useRef<HTMLInputElement>(null);
  const truckImageInputRef = useRef<HTMLInputElement>(null);

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>, docType: 'driving_license_url' | 'id_document_url' | 'vehicle_insurance_url' | 'truck_image_url') => {
    const file = e.target.files?.[0];
    if (!file || !userProfile?.id) return;

    if (file.size > 5 * 1024 * 1024) {
      return toast.error("حجم المستند يجب ألا يتجاوز 5 ميجابايت");
    }

    setUploadingDoc(docType);
    try {
      const publicUrl = await api.uploadImage(file, 'documents');

      const updatedData = await api.updateProfile(userProfile.id, {
        [docType]: publicUrl
      });

      if (updatedData) {
        setUserProfile(updatedData);
        toast.success("تم رفع المستند بنجاح 📄");
      }
    } catch (error) {
      toast.error("حدث خطأ أثناء رفع المستند");
    } finally {
      setUploadingDoc(null);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userProfile?.id) return;

    if (file.size > 2 * 1024 * 1024) {
      return toast.error("حجم الصورة يجب ألا يتجاوز 2 ميجابايت");
    }

    setUploadingAvatar(true);
    try {
      const publicUrl = await api.uploadImage(file, 'avatars');

      const updatedData = await api.updateProfile(userProfile.id, {
        avatar_url: publicUrl
      });

      if (updatedData) {
        setUserProfile(updatedData);
        toast.success("تم تحديث الصورة الشخصية بنجاح 🖼️");
      }
    } catch (error) {
      toast.error("حدث خطأ أثناء رفع الصورة");
    } finally {
      setUploadingAvatar(false);
    }
  };
  const handleSave = async () => {
    if (!userProfile?.id) return;
    setSaving(true);
    try {
      const updatedData = await api.updateProfile(userProfile.id, {
        full_name: form.full_name,
        phone: form.phone,
        email: form.email || 'NA',
        id_number: form.id_number,
        plate_number: form.plate_number,
        bank_name: form.bank_name,
        account_name: form.account_name,
        account_number: form.account_number,
        iban: form.iban
      });

      if (updatedData) {
        setUserProfile(updatedData);
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

      toast.success("تم تحديث بيانات ملفك الشخصي بنجاح ✅");
      setForm(p => ({ ...p, password: '' }));
    } catch (err: any) {
      toast.error("حدث خطأ أثناء الحفظ");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto space-y-8 pb-32 px-4">

        {/* Header with Background Accent */}
        <div className="relative overflow-hidden bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl">
          <div className="absolute left-0 top-0 w-64 h-64 bg-primary/20 rounded-full blur-[100px]"></div>
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8 text-right">
            <div className="flex items-center gap-6">
              <div
                className="w-28 h-28 bg-white/10 backdrop-blur-md rounded-[2.5rem] flex items-center justify-center border border-white/20 shadow-inner group cursor-pointer overflow-hidden relative"
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  type="file"
                  title="Upload avatar"
                  ref={fileInputRef}
                  onChange={handleAvatarUpload}
                  accept="image/*"
                  className="hidden"
                />

                {uploadingAvatar ? (
                  <Loader2 className="animate-spin text-white" size={32} />
                ) : (userProfile as any)?.avatar_url ? (
                  <img src={(userProfile as any).avatar_url} alt="Profile" className="w-full h-full object-cover" />
                ) : userProfile?.full_name ? (
                  <span className="text-5xl font-black text-blue-400">{userProfile.full_name.charAt(0)}</span>
                ) : <User size={48} />}

                <div className="absolute inset-0 bg-blue-600/80 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                  <ImageIcon className="text-white" size={32} />
                </div>
              </div>
              <div>
                <h1 className="text-4xl font-black mb-2">{form.full_name || t('partner_carrier')}</h1>
                <div className="flex items-center justify-end gap-3 flex-wrap">
                  <Badge className={`border-none py-1.5 px-4 rounded-xl flex items-center gap-2 font-bold shadow-lg ${(userProfile as any)?.is_verified ? 'bg-blue-500 text-white shadow-blue-500/20' : 'bg-amber-500 text-white shadow-amber-500/20'}`}>
                    <ShieldCheck size={14} /> {(userProfile as any)?.is_verified ? t('certified_carrier') : t('pending_approval')}
                  </Badge>
                  <Badge className={`border-none py-1.5 px-4 rounded-xl flex items-center gap-2 font-bold shadow-lg ${(userProfile as any)?.status === 'suspended' ? 'bg-rose-500 text-white shadow-rose-500/20' : 'bg-emerald-500 text-white shadow-emerald-500/20'}`}>
                    <CheckCircle2 size={14} /> {(userProfile as any)?.status === 'suspended' ? t('suspended') : t('active_account')}
                  </Badge>
                  {isVerified ? (
                    <Badge className="bg-emerald-500 text-white border-none py-1.5 px-4 rounded-xl flex items-center gap-2 font-bold shadow-lg shadow-emerald-500/20">
                      <ShieldCheck size={14} /> حساب موثق
                    </Badge>
                  ) : (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setShowVerifyModal(true)}
                      className="h-9 px-4 bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100 font-bold rounded-xl flex items-center gap-2"
                    >
                      <Mail size={14} /> توثيق الآن
                    </Button>
                  )}
                  <span className="text-slate-400 font-bold">{form.email}</span>
                </div>
              </div>
            </div>
            <Button onClick={handleSave} disabled={saving} className="h-16 rounded-[1.5rem] bg-blue-600 hover:bg-blue-700 px-10 text-xl font-black gap-3 shadow-xl shadow-blue-500/20 transition-all transform hover:scale-105">
              {saving ? <Loader2 className="animate-spin" /> : t('save_changes')}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Sidebar Info */}
          <div className="space-y-6">
            <Card className="rounded-[2.5rem] border-none shadow-xl bg-white p-8">
              <h3 className="font-black text-xl mb-6 flex items-center gap-2 text-right justify-end">{t('career_summary')} <Briefcase size={20} className="text-blue-500" /></h3>
              <div className="space-y-6">
                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 text-right">
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-1">{t('registration_date')}</p>
                  <p className="font-bold text-slate-800">{t('january')} 2024</p>
                </div>
                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 text-right">
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-1">{t('completed_trips')}</p>
                  <p className="font-bold text-slate-800">{t('trips_count', { count: 45 })}</p>
                </div>
                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 text-right">
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-1">{t('overall_rating')}</p>
                  <div className="flex items-center gap-1 justify-end">
                    <span className="font-bold text-amber-500">4.9 / 5</span>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Personal Form */}
          <div className="lg:col-span-2 space-y-8">
            <Card className="rounded-[3rem] border-none shadow-xl bg-white p-10">
              <div className="mb-10 text-right border-b border-slate-50 pb-6">
                <h3 className="text-2xl font-black text-slate-900">{t('personal_info')}</h3>
                <p className="text-slate-400 font-bold">{t('personal_info_desc')}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-right">
                <div className="space-y-3">
                  <Label className="font-black text-sm text-slate-700 mr-2 uppercase tracking-wide">{t('full_name')}</Label>
                  <Input value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))} className="h-14 rounded-2xl bg-slate-50 border-slate-100 font-bold px-6 focus:ring-blue-200" />
                </div>
                <div className="space-y-3">
                  <Label className="font-black text-sm text-slate-700 mr-2 uppercase tracking-wide">{t('phone')}</Label>
                  <div className="relative">
                    <Input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} className="h-14 rounded-2xl bg-slate-50 border-slate-100 font-black px-6 pl-20" dir="ltr" />
                    <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-emerald-500 text-xs flex items-center gap-1">
                      <CheckCircle2 size={12} /> {t('verified')}
                    </span>
                  </div>
                </div>
                <div className="space-y-3 md:col-span-2">
                  <Label className="font-black text-sm text-slate-700 mr-2 uppercase tracking-wide">{t('email')}</Label>
                  <Input value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} className="h-14 rounded-2xl bg-slate-50 border-slate-100 font-bold px-6" dir="ltr" />
                  <p className="text-[10px] text-slate-400 mr-2 mt-1 font-bold">يمكنك تغيير وتوثيق البريد الإلكتروني في أي وقت</p>
                </div>
              </div>

              <div className="mt-12 pt-10 border-t border-slate-50">
                <div className="flex items-center gap-3 mb-8 text-amber-600 justify-end">
                  <h4 className="text-xl font-black">{t('login_protection')}</h4>
                  <ShieldCheck size={24} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-end text-right">
                  <div className="space-y-3">
                    <Label className="font-black text-sm text-slate-700 mr-2">{t('update_password')}</Label>
                    <Input type="password" placeholder="••••••••" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} className="h-14 rounded-2xl bg-slate-50 border-slate-100 font-bold px-6" dir="ltr" />
                  </div>
                  <p className="text-[10px] text-slate-400 font-bold pb-4">{t('password_hint')}</p>
                </div>
              </div>

              {/* Driver & Truck Details */}
              <div className="mt-12 pt-10 border-t border-slate-50">
                <div className="flex items-center gap-3 mb-8 text-blue-600 justify-end">
                  <h4 className="text-xl font-black">{t('carrier_truck_info')}</h4>
                  <Truck size={24} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-right">
                  <div className="space-y-3">
                    <Label className="font-black text-sm text-slate-700 mr-2 uppercase tracking-wide">{t('id_number')}</Label>
                    <Input value={form.id_number} onChange={e => setForm(p => ({ ...p, id_number: e.target.value }))} className="h-14 rounded-2xl bg-slate-50 border-slate-100 font-bold px-6" />
                  </div>
                  <div className="space-y-3">
                    <Label className="font-black text-sm text-slate-700 mr-2 uppercase tracking-wide">{t('plate_number')}</Label>
                    <Input value={form.plate_number} onChange={e => setForm(p => ({ ...p, plate_number: e.target.value }))} className="h-14 rounded-2xl bg-slate-50 border-slate-100 font-bold px-6 text-center" dir="ltr" />
                  </div>
                </div>
              </div>

              {/* Bank Details Section */}
              <div className="mt-12 pt-10 border-t border-slate-50">
                <div className="flex items-center gap-3 mb-8 text-emerald-600 justify-end">
                  <h4 className="text-xl font-black">{t('bank_details_title')}</h4>
                  <Building size={24} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-right">
                  <div className="space-y-3">
                    <Label className="font-black text-sm text-slate-700 mr-2 uppercase tracking-wide">{t('bank_name')}</Label>
                    <Input placeholder={t('bank_name_placeholder')} value={form.bank_name} onChange={e => setForm(p => ({ ...p, bank_name: e.target.value }))} className="h-14 rounded-2xl bg-slate-50 border-slate-100 font-bold px-6" />
                  </div>
                  <div className="space-y-3">
                    <Label className="font-black text-sm text-slate-700 mr-2 uppercase tracking-wide">{t('account_holder_name')}</Label>
                    <Input placeholder={t('account_holder_placeholder')} value={form.account_name} onChange={e => setForm(p => ({ ...p, account_name: e.target.value }))} className="h-14 rounded-2xl bg-slate-50 border-slate-100 font-bold px-6" />
                  </div>
                  <div className="space-y-3">
                    <Label className="font-black text-sm text-slate-700 mr-2 uppercase tracking-wide">{t('account_number')}</Label>
                    <Input placeholder={t('account_number_placeholder')} value={form.account_number} onChange={e => setForm(p => ({ ...p, account_number: e.target.value }))} className="h-14 rounded-2xl bg-slate-50 border-slate-100 font-bold px-6 text-center" dir="ltr" />
                  </div>
                  <div className="space-y-3">
                    <Label className="font-black text-sm text-slate-700 mr-2 uppercase tracking-wide">{t('iban_label')}</Label>
                    <Input placeholder="SA..." value={form.iban} onChange={e => setForm(p => ({ ...p, iban: e.target.value }))} className="h-14 rounded-2xl bg-slate-50 border-slate-100 font-bold px-6 text-center" dir="ltr" />
                  </div>
                </div>
              </div>

              {/* Official Documents Upload Section */}
              <div className="mt-12 pt-10 border-t border-slate-50">
                <div className="flex items-center gap-3 mb-8 text-emerald-600 justify-end">
                  <h4 className="text-xl font-black">{t('official_docs_title')}</h4>
                  <FileCheck size={24} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-right">
                  {/* رخصة القيادة */}
                  <div
                    className={`p-6 rounded-[2rem] border-2 border-dashed ${uploadingDoc === 'driving_license_url' ? 'border-blue-400 bg-blue-50' : (userProfile as any)?.driving_license_url ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-200 bg-slate-50'} hover:bg-slate-100 transition-colors flex flex-col justify-center items-center gap-3 cursor-pointer group`}
                    onClick={() => licenseInputRef.current?.click()}
                  >
                    <input type="file" title="Upload driving license" ref={licenseInputRef} onChange={(e) => handleDocumentUpload(e, 'driving_license_url')} accept=".pdf,image/*" className="hidden" />
                    <div className={`w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm transition-colors ${uploadingDoc === 'driving_license_url' ? 'text-blue-500' : (userProfile as any)?.driving_license_url ? 'text-emerald-500' : 'text-slate-400 group-hover:text-blue-600'}`}>
                      {uploadingDoc === 'driving_license_url' ? <Loader2 className="animate-spin" size={24} /> : (userProfile as any)?.driving_license_url ? <CheckCircle2 size={24} /> : <FileUp size={24} />}
                    </div>
                    <p className="font-black text-slate-700">{t('driving_license')}</p>
                    <p className="text-[10px] text-slate-400 font-bold">{(userProfile as any)?.driving_license_url ? t('upload_success') : 'PDF, JPG, PNG (Max 5MB)'}</p>
                    <Button variant="outline" size="sm" className="mt-2 rounded-xl border-slate-200 text-xs font-bold w-full">{t('update_doc')}</Button>
                  </div>

                  {/* الهوية الوطنية / الإقامة */}
                  <div
                    className={`p-6 rounded-[2rem] border-2 border-dashed ${uploadingDoc === 'id_document_url' ? 'border-amber-400 bg-amber-50' : (userProfile as any)?.id_document_url ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-200 bg-slate-50'} hover:bg-slate-100 transition-colors flex flex-col justify-center items-center gap-3 cursor-pointer group`}
                    onClick={() => idInputRef.current?.click()}
                  >
                    <input type="file" title="Upload ID document" ref={idInputRef} onChange={(e) => handleDocumentUpload(e, 'id_document_url')} accept=".pdf,image/*" className="hidden" />
                    <div className={`w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm transition-colors ${uploadingDoc === 'id_document_url' ? 'text-amber-500' : (userProfile as any)?.id_document_url ? 'text-emerald-500' : 'text-slate-400 group-hover:text-amber-600'}`}>
                      {uploadingDoc === 'id_document_url' ? <Loader2 className="animate-spin" size={24} /> : (userProfile as any)?.id_document_url ? <CheckCircle2 size={24} /> : <FileUp size={24} />}
                    </div>
                    <p className="font-black text-slate-700">{t('id_card')}</p>
                    <p className="text-[10px] text-slate-400 font-bold">{(userProfile as any)?.id_document_url ? t('upload_success') : 'PDF, JPG, PNG (Max 5MB)'}</p>
                    <Button variant="outline" size="sm" className="mt-2 rounded-xl border-slate-200 text-xs font-bold w-full">{t('update_doc')}</Button>
                  </div>

                  {/* تأمين المركبة */}
                  <div
                    className={`p-6 rounded-[2rem] border-2 border-dashed ${uploadingDoc === 'vehicle_insurance_url' ? 'border-emerald-400 bg-emerald-100' : (userProfile as any)?.vehicle_insurance_url ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-200 bg-slate-50'} hover:bg-slate-100 transition-colors flex flex-col justify-center items-center gap-3 cursor-pointer group`}
                    onClick={() => insuranceInputRef.current?.click()}
                  >
                    <input type="file" title="Upload vehicle insurance" ref={insuranceInputRef} onChange={(e) => handleDocumentUpload(e, 'vehicle_insurance_url')} accept=".pdf,image/*" className="hidden" />
                    <div className={`w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm transition-colors ${uploadingDoc === 'vehicle_insurance_url' ? 'text-emerald-500' : (userProfile as any)?.vehicle_insurance_url ? 'text-emerald-500' : 'text-slate-400 group-hover:text-emerald-600'}`}>
                      {uploadingDoc === 'vehicle_insurance_url' ? <Loader2 className="animate-spin" size={24} /> : (userProfile as any)?.vehicle_insurance_url ? <CheckCircle2 size={24} /> : <FileUp size={24} />}
                    </div>
                    <p className="font-black text-emerald-800">{t('vehicle_insurance')}</p>
                    <p className="text-[10px] text-emerald-600 font-bold">{(userProfile as any)?.vehicle_insurance_url ? t('upload_success') : 'PDF, JPG, PNG (Max 5MB)'}</p>
                    <Button variant="outline" size="sm" className="mt-2 rounded-xl border-emerald-200 text-emerald-700 text-xs font-bold bg-white w-full hover:bg-emerald-100 hover:text-emerald-800">{t('update_doc')}</Button>
                  </div>

                  {/* صورة الشاحنة */}
                  <div
                    className={`p-6 rounded-[2rem] border-2 border-dashed ${uploadingDoc === 'truck_image_url' ? 'border-primary/40 bg-primary/5' : (userProfile as any)?.truck_image_url ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-200 bg-slate-50'} hover:bg-slate-100 transition-colors flex flex-col justify-center items-center gap-3 cursor-pointer group`}
                    onClick={() => truckImageInputRef.current?.click()}
                  >
                    <input type="file" title="Upload truck image" ref={truckImageInputRef} onChange={(e) => handleDocumentUpload(e, 'truck_image_url')} accept="image/*" className="hidden" />
                    <div className={`w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm transition-colors ${uploadingDoc === 'truck_image_url' ? 'text-primary' : (userProfile as any)?.truck_image_url ? 'text-emerald-500' : 'text-slate-400 group-hover:text-primary'}`}>
                      {uploadingDoc === 'truck_image_url' ? <Loader2 className="animate-spin" size={24} /> : (userProfile as any)?.truck_image_url ? <CheckCircle2 size={24} /> : <ImageIcon size={24} />}
                    </div>
                    <p className="font-black text-slate-700">{t('truck_pic')}</p>
                    <p className="text-[10px] text-slate-400 font-bold">{(userProfile as any)?.truck_image_url ? t('upload_success') : 'JPG, PNG (Max 5MB)'}</p>
                    <Button variant="outline" size="sm" className="mt-2 rounded-xl border-slate-200 text-xs font-bold w-full">{t('update_img')}</Button>
                  </div>
                </div>
              </div>
              
              <div className="mt-12 pt-10 border-t border-slate-50">
                <div className="flex flex-col gap-4">
                  <Link to="/terms" className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-100 transition-colors group justify-end">
                    <span className="font-bold text-slate-700 group-hover:text-blue-600 transition-colors">{t('terms_conditions')}</span>
                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-slate-500 group-hover:text-blue-600 shadow-sm">
                      <FileText size={20} />
                    </div>
                  </Link>
                  <Link to="/privacy" className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-100 transition-colors group justify-end">
                    <span className="font-bold text-slate-700 group-hover:text-blue-600 transition-colors">{t('privacy_policy')}</span>
                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-slate-500 group-hover:text-blue-600 shadow-sm">
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
              <Button onClick={handleSendOtp} disabled={verifying} className="w-full h-12 rounded-xl bg-blue-600 text-white font-black shadow-lg">
                {verifying ? <Loader2 className="animate-spin" /> : "إرسال الرمز"}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-slate-500 font-bold text-sm text-center">أدخل الرمز المكون من 6 أرقام المرسل إلى {form.email}</p>
              <Input 
                value={otpCode} 
                onChange={e => setOtpCode(e.target.value)} 
                className="h-14 text-center text-2xl tracking-[0.5em] font-black rounded-xl bg-slate-50 border-2" 
                placeholder="------"
                maxLength={6}
                dir="ltr"
              />
              <Button onClick={handleVerifyOtp} disabled={verifying} className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black shadow-lg">
                {verifying ? <Loader2 className="animate-spin" /> : "تأكيد التوثيق"}
              </Button>
              <Button variant="ghost" onClick={() => setVerifyStep('email')} className="w-full font-bold">رجوع</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
