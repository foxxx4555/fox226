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
import { Loader2, User, Building, Shield, Image as ImageIcon, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export default function ShipperAccount() {
  const { userProfile } = useAuth();
  const { setUserProfile } = useAppStore();
  const [form, setForm] = useState({
    full_name: userProfile?.full_name || '',
    company_name: (userProfile as any)?.company_name || '',
    commercial_register: (userProfile as any)?.commercial_register || '',
    tax_number: (userProfile as any)?.tax_number || '',
    phone: userProfile?.phone || '',
    email: userProfile?.email || '',
    password: '',
  });
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState({ totalLoads: 0, totalPayments: 0, joinDate: '' });

  useEffect(() => {
    if (userProfile?.id) {
      setForm({
        full_name: userProfile.full_name || '',
        company_name: (userProfile as any).company_name || '',
        commercial_register: (userProfile as any).commercial_register || '',
        tax_number: (userProfile as any).tax_number || '',
        phone: userProfile.phone || '',
        email: userProfile.email || '',
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
    }
  }, [userProfile]);

  const handleSave = async () => {
    if (!userProfile?.id) return;
    setSaving(true);
    try {
      const updatedData = await api.updateProfile(userProfile.id, {
        full_name: form.full_name,
        phone: form.phone,
        email: form.email,
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
        if (error) throw error;
      }

      toast.success('تم حفظ التغييرات بنجاح');
      setForm(p => ({ ...p, password: '' }));
    } catch (err: any) {
      toast.error(err.message || 'حدث خطأ أثناء الحفظ');
    }
    finally { setSaving(false); }
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
                  <Badge className="bg-emerald-500 text-white border-none py-1.5 px-4 rounded-xl flex items-center gap-2 font-bold shadow-lg shadow-emerald-500/20">
                    <Shield size={14} /> حساب موثق
                  </Badge>
                  <span className="text-slate-400 font-bold">{form.email}</span>
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
              </div>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
