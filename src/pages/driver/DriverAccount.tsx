import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
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
import { FileUp, FileCheck } from 'lucide-react';
import { useRef } from 'react';
export default function DriverAccount() {
  const { userProfile } = useAuth();
  const { setUserProfile } = useAppStore();
  const [form, setForm] = useState({
    full_name: userProfile?.full_name || '',
    phone: userProfile?.phone || '',
    email: userProfile?.email || '',
    id_number: (userProfile as any)?.id_number || '',
    plate_number: (userProfile as any)?.plate_number || '',
    password: '',
  });
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const licenseInputRef = useRef<HTMLInputElement>(null);
  const idInputRef = useRef<HTMLInputElement>(null);
  const insuranceInputRef = useRef<HTMLInputElement>(null);

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>, docType: 'driving_license_url' | 'id_document_url' | 'vehicle_insurance_url') => {
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
        id_number: form.id_number,
        plate_number: form.plate_number
      });

      if (updatedData) {
        setUserProfile(updatedData);
      }

      if (form.password) {
        const { error } = await supabase.auth.updateUser({ password: form.password });
        if (error) throw error;
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
                <h1 className="text-4xl font-black mb-2">{form.full_name || 'الناقل الشريك'}</h1>
                <div className="flex items-center justify-end gap-3 flex-wrap">
                  <Badge className={`border-none py-1.5 px-4 rounded-xl flex items-center gap-2 font-bold shadow-lg ${(userProfile as any)?.is_verified ? 'bg-blue-500 text-white shadow-blue-500/20' : 'bg-amber-500 text-white shadow-amber-500/20'}`}>
                    <ShieldCheck size={14} /> {(userProfile as any)?.is_verified ? 'ناقل معتمد' : 'بانتظار الاعتماد'}
                  </Badge>
                  <Badge className={`border-none py-1.5 px-4 rounded-xl flex items-center gap-2 font-bold shadow-lg ${(userProfile as any)?.status === 'suspended' ? 'bg-rose-500 text-white shadow-rose-500/20' : 'bg-emerald-500 text-white shadow-emerald-500/20'}`}>
                    <CheckCircle2 size={14} /> {(userProfile as any)?.status === 'suspended' ? 'موقوف مؤقتاً' : 'حساب مفعل'}
                  </Badge>
                  <span className="text-slate-400 font-bold">{form.email}</span>
                </div>
              </div>
            </div>
            <Button onClick={handleSave} disabled={saving} className="h-16 rounded-[1.5rem] bg-blue-600 hover:bg-blue-700 px-10 text-xl font-black gap-3 shadow-xl shadow-blue-500/20 transition-all transform hover:scale-105">
              {saving ? <Loader2 className="animate-spin" /> : "حفظ التغييرات"}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Sidebar Info */}
          <div className="space-y-6">
            <Card className="rounded-[2.5rem] border-none shadow-xl bg-white p-8">
              <h3 className="font-black text-xl mb-6 flex items-center gap-2 text-right justify-end">ملخص المهنة <Briefcase size={20} className="text-blue-500" /></h3>
              <div className="space-y-6">
                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 text-right">
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-1">تاريخ التسجيل</p>
                  <p className="font-bold text-slate-800">يناير 2024</p>
                </div>
                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 text-right">
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-1">الرحلات المكتملة</p>
                  <p className="font-bold text-slate-800">45 رحلة</p>
                </div>
                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 text-right">
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-1">التقييم العام</p>
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
                <h3 className="text-2xl font-black text-slate-900">المعلومات الشخصية</h3>
                <p className="text-slate-400 font-bold">إدارة بيانات التواصل والتوثيق الأمني</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-right">
                <div className="space-y-3">
                  <Label className="font-black text-sm text-slate-700 mr-2 uppercase tracking-wide">الاسم الكامل</Label>
                  <Input value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))} className="h-14 rounded-2xl bg-slate-50 border-slate-100 font-bold px-6 focus:ring-blue-200" />
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
                <div className="space-y-3 md:col-span-2">
                  <Label className="font-black text-sm text-slate-700 mr-2 uppercase tracking-wide">البريد الإلكتروني</Label>
                  <Input value={form.email} disabled className="h-14 rounded-2xl bg-slate-50 border-slate-100 font-bold px-6 opacity-60" dir="ltr" />
                  <p className="text-[10px] text-slate-400 mr-2 mt-1 font-bold">لا يمكن تغيير البريد المرتبط بالحساب حالياً</p>
                </div>
              </div>

              <div className="mt-12 pt-10 border-t border-slate-50">
                <div className="flex items-center gap-3 mb-8 text-amber-600 justify-end">
                  <h4 className="text-xl font-black">حماية الدخول</h4>
                  <ShieldCheck size={24} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-end text-right">
                  <div className="space-y-3">
                    <Label className="font-black text-sm text-slate-700 mr-2">تحديث كلمة المرور</Label>
                    <Input type="password" placeholder="••••••••" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} className="h-14 rounded-2xl bg-slate-50 border-slate-100 font-bold px-6" dir="ltr" />
                  </div>
                  <p className="text-[10px] text-slate-400 font-bold pb-4">اترك هذا الحقل فارغاً في حال لم ترغب في تغيير كلمة المرور.</p>
                </div>
              </div>

              {/* Driver & Truck Details */}
              <div className="mt-12 pt-10 border-t border-slate-50">
                <div className="flex items-center gap-3 mb-8 text-blue-600 justify-end">
                  <h4 className="text-xl font-black">بيانات الناقل والمركبة</h4>
                  <Truck size={24} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-right">
                  <div className="space-y-3">
                    <Label className="font-black text-sm text-slate-700 mr-2 uppercase tracking-wide">رقم الهوية / الإقامة</Label>
                    <Input value={form.id_number} onChange={e => setForm(p => ({ ...p, id_number: e.target.value }))} className="h-14 rounded-2xl bg-slate-50 border-slate-100 font-bold px-6" />
                  </div>
                  <div className="space-y-3">
                    <Label className="font-black text-sm text-slate-700 mr-2 uppercase tracking-wide">رقم اللوحة</Label>
                    <Input value={form.plate_number} onChange={e => setForm(p => ({ ...p, plate_number: e.target.value }))} className="h-14 rounded-2xl bg-slate-50 border-slate-100 font-bold px-6 text-center" dir="ltr" />
                  </div>
                </div>
              </div>

              {/* Official Documents Upload Section */}
              <div className="mt-12 pt-10 border-t border-slate-50">
                <div className="flex items-center gap-3 mb-8 text-emerald-600 justify-end">
                  <h4 className="text-xl font-black">المستندات الرسمية والتراخيص</h4>
                  <FileCheck size={24} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-right">
                  {/* رخصة القيادة */}
                  <div
                    className={`p-6 rounded-[2rem] border-2 border-dashed ${uploadingDoc === 'driving_license_url' ? 'border-blue-400 bg-blue-50' : (userProfile as any)?.driving_license_url ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-200 bg-slate-50'} hover:bg-slate-100 transition-colors flex flex-col justify-center items-center gap-3 cursor-pointer group`}
                    onClick={() => licenseInputRef.current?.click()}
                  >
                    <input type="file" ref={licenseInputRef} onChange={(e) => handleDocumentUpload(e, 'driving_license_url')} accept=".pdf,image/*" className="hidden" />
                    <div className={`w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm transition-colors ${uploadingDoc === 'driving_license_url' ? 'text-blue-500' : (userProfile as any)?.driving_license_url ? 'text-emerald-500' : 'text-slate-400 group-hover:text-blue-600'}`}>
                      {uploadingDoc === 'driving_license_url' ? <Loader2 className="animate-spin" size={24} /> : (userProfile as any)?.driving_license_url ? <CheckCircle2 size={24} /> : <FileUp size={24} />}
                    </div>
                    <p className="font-black text-slate-700">رخصة القيادة</p>
                    <p className="text-[10px] text-slate-400 font-bold">{(userProfile as any)?.driving_license_url ? 'تم الرفع بنجاح' : 'PDF, JPG, PNG (Max 5MB)'}</p>
                    <Button variant="outline" size="sm" className="mt-2 rounded-xl border-slate-200 text-xs font-bold w-full">تحديث المستند</Button>
                  </div>

                  {/* الهوية الوطنية / الإقامة */}
                  <div
                    className={`p-6 rounded-[2rem] border-2 border-dashed ${uploadingDoc === 'id_document_url' ? 'border-amber-400 bg-amber-50' : (userProfile as any)?.id_document_url ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-200 bg-slate-50'} hover:bg-slate-100 transition-colors flex flex-col justify-center items-center gap-3 cursor-pointer group`}
                    onClick={() => idInputRef.current?.click()}
                  >
                    <input type="file" ref={idInputRef} onChange={(e) => handleDocumentUpload(e, 'id_document_url')} accept=".pdf,image/*" className="hidden" />
                    <div className={`w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm transition-colors ${uploadingDoc === 'id_document_url' ? 'text-amber-500' : (userProfile as any)?.id_document_url ? 'text-emerald-500' : 'text-slate-400 group-hover:text-amber-600'}`}>
                      {uploadingDoc === 'id_document_url' ? <Loader2 className="animate-spin" size={24} /> : (userProfile as any)?.id_document_url ? <CheckCircle2 size={24} /> : <FileUp size={24} />}
                    </div>
                    <p className="font-black text-slate-700">الهوية / الإقامة</p>
                    <p className="text-[10px] text-slate-400 font-bold">{(userProfile as any)?.id_document_url ? 'تم الرفع بنجاح' : 'PDF, JPG, PNG (Max 5MB)'}</p>
                    <Button variant="outline" size="sm" className="mt-2 rounded-xl border-slate-200 text-xs font-bold w-full">تحديث المستند</Button>
                  </div>

                  {/* تأمين المركبة */}
                  <div
                    className={`p-6 rounded-[2rem] border-2 border-dashed ${uploadingDoc === 'vehicle_insurance_url' ? 'border-emerald-400 bg-emerald-100' : (userProfile as any)?.vehicle_insurance_url ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-200 bg-slate-50'} hover:bg-slate-100 transition-colors flex flex-col justify-center items-center gap-3 cursor-pointer group`}
                    onClick={() => insuranceInputRef.current?.click()}
                  >
                    <input type="file" ref={insuranceInputRef} onChange={(e) => handleDocumentUpload(e, 'vehicle_insurance_url')} accept=".pdf,image/*" className="hidden" />
                    <div className={`w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm transition-colors ${uploadingDoc === 'vehicle_insurance_url' ? 'text-emerald-500' : (userProfile as any)?.vehicle_insurance_url ? 'text-emerald-500' : 'text-slate-400 group-hover:text-emerald-600'}`}>
                      {uploadingDoc === 'vehicle_insurance_url' ? <Loader2 className="animate-spin" size={24} /> : (userProfile as any)?.vehicle_insurance_url ? <CheckCircle2 size={24} /> : <FileUp size={24} />}
                    </div>
                    <p className="font-black text-emerald-800">تأمين المركبة</p>
                    <p className="text-[10px] text-emerald-600 font-bold">{(userProfile as any)?.vehicle_insurance_url ? 'تم الرفع بنجاح' : 'PDF, JPG, PNG (Max 5MB)'}</p>
                    <Button variant="outline" size="sm" className="mt-2 rounded-xl border-emerald-200 text-emerald-700 text-xs font-bold bg-white w-full hover:bg-emerald-100 hover:text-emerald-800">تحديث المستند</Button>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
