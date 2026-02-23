import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/services/api';
import AppLayout from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, User, Phone, Mail, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';

export default function DriverAccount() {
  const { userProfile } = useAuth();
  const [form, setForm] = useState({
    full_name: userProfile?.full_name || '',
    phone: userProfile?.phone || '',
    email: userProfile?.email || '',
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!userProfile?.id) return;
    setSaving(true);
    try {
      await api.updateProfile(userProfile.id, form);
      toast.success("تم تحديث بيانات ملفك الشخصي بنجاح ✅");
    } catch (err: any) { 
      toast.error("حدث خطأ أثناء الحفظ"); 
    } finally { 
      setSaving(false); 
    }
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-8 pt-6">
        <div className="text-right">
          <h1 className="text-4xl font-black tracking-tight text-slate-900">إعدادات الحساب</h1>
          <p className="text-muted-foreground font-medium mt-1">إدارة معلوماتك الشخصية وبيانات التواصل</p>
        </div>

        <Card className="rounded-[2.5rem] border-none shadow-xl bg-white overflow-hidden">
          <CardHeader className="bg-slate-900 text-white p-8">
            <CardTitle className="flex items-center gap-3 text-2xl font-black">
              <User className="text-blue-400" /> الملف الشخصي
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            <div className="space-y-2">
              <Label className="font-black text-slate-700">الاسم الكامل</Label>
              <div className="relative">
                <User className="absolute start-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <Input value={form.full_name} onChange={e => setForm(p => ({...p, full_name: e.target.value}))} className="h-14 rounded-2xl border-2 ps-12 font-bold" />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="font-black text-slate-700">البريد الإلكتروني</Label>
              <div className="relative">
                <Mail className="absolute start-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <Input value={form.email} disabled className="h-14 rounded-2xl border-2 ps-12 font-bold bg-slate-50 opacity-60" dir="ltr" />
              </div>
              <p className="text-[10px] text-slate-400 font-bold mr-1">لا يمكن تغيير البريد الإلكتروني الأساسي</p>
            </div>

            <div className="space-y-2">
              <Label className="font-black text-slate-700">رقم الجوال</Label>
              <div className="relative">
                <Phone className="absolute start-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <Input value={form.phone} onChange={e => setForm(p => ({...p, phone: e.target.value}))} className="h-14 rounded-2xl border-2 ps-12 font-bold" dir="ltr" />
              </div>
            </div>

            <Button 
              onClick={handleSave} 
              disabled={saving} 
              className="w-full h-16 mt-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xl shadow-lg shadow-blue-100 transition-all active:scale-95"
            >
              {saving ? <Loader2 className="animate-spin" /> : <><ShieldCheck className="me-2"/> حفظ التغييرات</>}
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
