import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/services/api';
import AppLayout from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, User, Building, Shield, Image as ImageIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export default function ShipperAccount() {
  const { userProfile } = useAuth();
  const [form, setForm] = useState({
    full_name: userProfile?.full_name || '',
    company_name: '', // Should be fetched from profile if exists
    commercial_register: '', // Should be fetched from profile
    tax_number: '',       // Should be fetched from profile
    phone: userProfile?.phone || '',
    email: userProfile?.email || '',
    password: '',
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!userProfile?.id) return;
    setSaving(true);
    try {
      // In a real app we would update the extended profile fields here too
      await api.updateProfile(userProfile.id, {
        full_name: form.full_name,
        phone: form.phone,
        email: form.email,
        // other fields would be saved to a specific table or auth metadata
      });

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
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-black mb-2 flex items-center gap-3">
            <User className="text-primary" size={32} /> الملف الشخصي
          </h1>
          <p className="text-muted-foreground font-medium">إدارة بيانات حسابك ومعلومات شركتك</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="md:col-span-1 rounded-[2rem] border-none shadow-xl bg-white overflow-hidden text-center h-fit">
            <CardContent className="p-8">
              <div className="w-32 h-32 mx-auto bg-slate-100 rounded-full flex items-center justify-center mb-6 relative group cursor-pointer border-4 border-white shadow-lg">
                {userProfile?.full_name ? (
                  <span className="text-4xl font-black text-slate-400">{userProfile.full_name.charAt(0)}</span>
                ) : (
                  <User size={48} className="text-slate-300" />
                )}
                <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <ImageIcon className="text-white" />
                </div>
              </div>
              <h2 className="text-xl font-bold">{userProfile?.full_name || 'مستخدم جديد'}</h2>
              <p className="text-muted-foreground text-sm mt-1">{userProfile?.email}</p>
              <Button variant="outline" className="w-full mt-6 rounded-xl font-bold">
                تغيير الصورة
              </Button>
            </CardContent>
          </Card>

          <Card className="md:col-span-2 rounded-[2rem] border-none shadow-xl bg-white">
            <CardHeader className="p-8 pb-4 border-b border-slate-100">
              <CardTitle className="text-xl font-black flex items-center gap-2">
                <Building className="text-primary" size={24} /> بيانات الشركة والاتصال
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="font-bold">اسم الشركة</Label>
                  <Input placeholder="أدخل اسم شركتك" value={form.company_name} onChange={e => setForm(p => ({ ...p, company_name: e.target.value }))} className="h-12 rounded-xl bg-slate-50 focus:bg-white transition-colors" />
                </div>
                <div className="space-y-2">
                  <Label className="font-bold">اسم المسؤول (المرسل)</Label>
                  <Input value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))} className="h-12 rounded-xl bg-slate-50 focus:bg-white transition-colors" />
                </div>

                <div className="space-y-2">
                  <Label className="font-bold">رقم السجل التجاري</Label>
                  <Input placeholder="1010XXXXXX" value={form.commercial_register} onChange={e => setForm(p => ({ ...p, commercial_register: e.target.value }))} className="h-12 rounded-xl bg-slate-50 focus:bg-white transition-colors" dir="ltr" />
                </div>
                <div className="space-y-2">
                  <Label className="font-bold">الرقم الضريبي</Label>
                  <Input placeholder="300XXXXXXX00003" value={form.tax_number} onChange={e => setForm(p => ({ ...p, tax_number: e.target.value }))} className="h-12 rounded-xl bg-slate-50 focus:bg-white transition-colors" dir="ltr" />
                </div>

                <div className="space-y-2">
                  <Label className="font-bold">رقم الجوال</Label>
                  <Input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} className="h-12 rounded-xl bg-slate-50 focus:bg-white transition-colors" dir="ltr" />
                </div>
                <div className="space-y-2">
                  <Label className="font-bold">البريد الإلكتروني</Label>
                  <Input value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} className="h-12 rounded-xl bg-slate-50 focus:bg-white transition-colors" dir="ltr" />
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100">
                <div className="flex items-center gap-2 mb-4">
                  <Shield className="text-amber-500" size={24} />
                  <h3 className="font-black text-lg">إعدادات الأمان</h3>
                </div>
                <div className="space-y-2">
                  <Label className="font-bold">تغيير كلمة المرور</Label>
                  <Input type="password" placeholder="اترك الحقل فارغاً إذا لم ترغب بالتغيير" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} className="h-12 rounded-xl bg-slate-50 focus:bg-white transition-colors" dir="ltr" />
                </div>
              </div>

              <Button onClick={handleSave} disabled={saving} className="w-full h-14 rounded-xl font-black text-lg shadow-xl shadow-primary/20 hover:shadow-primary/40 transition-all mt-6">
                {saving ? <Loader2 className="animate-spin" /> : "حفظ التغييرات"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
