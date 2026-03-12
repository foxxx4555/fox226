import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/services/api';
import AppLayout from '@/components/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2, UserPlus, Users, Share2, Copy, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SubDriver } from '@/types';

export default function DriverSubDrivers() {
  const { t } = useTranslation();
  const { userProfile } = useAuth();
  const [drivers, setDrivers] = useState<SubDriver[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [form, setForm] = useState({ driver_name: '', driver_phone: '', id_number: '', license_number: '' });
  const [submitting, setSubmitting] = useState(false);

  const fetchDrivers = async () => {
    if (!userProfile?.id) return;
    try {
      const data = await api.getSubDrivers(userProfile.id);
      setDrivers(data as SubDriver[]);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchDrivers(); }, [userProfile]);

  const handleAdd = async () => {
    if (!userProfile?.id) return;
    setSubmitting(true);
    try {
      await api.addSubDriver(form, userProfile.id);
      toast.success(t('success'));
      setDialogOpen(false);
      setForm({ driver_name: '', driver_phone: '', id_number: '', license_number: '' });
      fetchDrivers();
    } catch (err: any) { toast.error(err.message); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteSubDriver(id);
      toast.success(t('success'));
      fetchDrivers();
    } catch (err: any) { toast.error(err.message); }
  };

  const inviteLink = typeof window !== 'undefined' ? `${window.location.origin}/register?invite=${userProfile?.id}` : '';

  const handleCopyLink = () => {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink);
    toast.success("تم نسخ الرابط بنجاح!");
  };

  const handleWhatsAppShare = () => {
    if (!inviteLink) return;
    const message = encodeURIComponent(`انضم إلى أسطولي في تطبيق كايو كمر بلس.\nاستخدم رابط الدعوة التالي للتسجيل:\n${inviteLink}\n\nأو يمكنك التسجيل بإدخال رمز الدعوة اليدوي:\n${userProfile?.id}`);
    window.open(`https://wa.me/?text=${message}`, '_blank');
  };

  return (
    <AppLayout>
      <div className="space-y-8 max-w-5xl mx-auto pb-20 px-4">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex justify-between items-center bg-white p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/50">
          <div className="text-right">
            <h1 className="text-3xl font-black text-slate-900 mb-1">إدارة السائقين</h1>
            <p className="text-slate-500 font-bold">قم بإضافة وإدارة سائقي الأسطول الخاص بك</p>
          </div>
          <div className="flex items-center gap-3">
            <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="rounded-2xl h-14 px-6 gap-3 shadow-sm font-black text-lg border-2 border-slate-200 text-slate-700 hover:bg-slate-50 transition-all transform hover:scale-105 active:scale-95">
                  <Share2 size={24} className="text-primary" /> مشاركة الرمز
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md rounded-[3rem] p-0 overflow-hidden border-none bg-white shadow-2xl text-center">
                <div className="p-8 pb-4">
                  <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                    <Share2 size={36} />
                  </div>
                  <h2 className="text-2xl font-black text-slate-900 mb-2">رمز الدعوة الخاص بك</h2>
                  <p className="text-sm font-bold text-slate-500 mb-8">
                    يرجى نشر هذا الرمز مع سائقيك أو مشاركة الرابط بالضغط على الزر للتخفيف من عملية الإضافة اليدوية
                  </p>
                  
                  <div className="bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 mb-6 relative group overflow-hidden">
                    <p className="text-[11px] text-slate-400 font-black uppercase mb-1">رمز الدعوة</p>
                    <p className="text-3xl font-black text-primary tracking-wider" dir="ltr">{userProfile?.id?.substring(0, 8).toUpperCase()}</p>
                    
                    {/* Copy layer */}
                    <div 
                      onClick={handleCopyLink}
                      className="absolute inset-0 bg-primary/95 text-white flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 cursor-pointer transition-all duration-300 font-bold text-lg"
                    >
                      <Copy size={20} /> نسخ الرابط
                    </div>
                  </div>

                  <Button onClick={handleWhatsAppShare} className="w-full h-16 rounded-2xl bg-[#25D366] hover:bg-[#20bd5a] font-black text-xl gap-3 shadow-xl shadow-[#25D366]/20 transition-all text-white">
                    <Send size={24} /> إرسال إلى السائق (WhatsApp)
                  </Button>
                </div>
                <div className="bg-slate-50 p-6 text-xs text-slate-400 font-bold border-t border-slate-100">
                  سيتم ربط أي سائق يسجل بهذا الرمز بأسطولك بشكل آلي.
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="rounded-2xl bg-primary hover:bg-primary/90 h-14 px-8 gap-3 shadow-xl shadow-primary/20 font-black text-lg text-white transition-all transform hover:scale-105 active:scale-95">
                  <Plus size={24} /> إضافة سائق يدوي
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-md rounded-[3rem] p-0 overflow-hidden border-none bg-white shadow-2xl">
              <div className="p-8 bg-slate-900 text-white">
                <div className="flex items-center gap-4 mb-2">
                  <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
                    <UserPlus size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black">بيانات السائق الجديد</h2>
                    <p className="text-xs text-slate-400 font-bold">أدخل المعلومات المطلوبة بدقة</p>
                  </div>
                </div>
              </div>
              <div className="p-8 space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="font-bold text-slate-700 mr-2">اسم السائق الثنائي</Label>
                    <Input value={form.driver_name} onChange={e => setForm(p => ({ ...p, driver_name: e.target.value }))} className="h-14 rounded-2xl bg-slate-50 border-slate-200 font-bold px-5 focus:ring-primary focus:border-primary" placeholder="مثال: محمد العمري" />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold text-slate-700 mr-2">رقم الجوال</Label>
                    <div className="flex">
                      <span className="flex items-center px-4 bg-slate-100 border rounded-r-2xl h-14 font-black">+966</span>
                      <Input value={form.driver_phone} onChange={e => setForm(p => ({ ...p, driver_phone: e.target.value }))} className="h-14 rounded-l-2xl rounded-r-none bg-slate-50 border-slate-200 font-black text-lg px-5 focus:ring-primary focus:border-primary" placeholder="5xxxxxxxx" dir="ltr" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="font-bold text-slate-700 mr-2">رقم الهوية</Label>
                      <Input value={form.id_number} onChange={e => setForm(p => ({ ...p, id_number: e.target.value }))} className="h-14 rounded-2xl bg-slate-50 border-slate-200 font-bold px-5" placeholder="10xxxxxxxx" dir="ltr" />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-bold text-slate-700 mr-2">رقم الرخصة</Label>
                      <Input value={form.license_number} onChange={e => setForm(p => ({ ...p, license_number: e.target.value }))} className="h-14 rounded-2xl bg-slate-50 border-slate-200 font-bold px-5" placeholder="License No." dir="ltr" />
                    </div>
                  </div>
                </div>
                <Button onClick={handleAdd} disabled={submitting} className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 font-black text-lg gap-2 shadow-xl shadow-primary/20 transition-all text-white">
                  {submitting ? <Loader2 className="animate-spin" /> : "حفظ بيانات السائق"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          </div>
        </motion.div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-primary" size={60} />
          </div>
        ) : drivers.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-[3rem] border-2 border-dashed border-slate-200 text-slate-400 font-bold">
            <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Users size={48} className="opacity-20" />
            </div>
            <p className="text-xl">لا يوجد سائقون مسجلون بعد</p>
            <p className="text-sm font-medium mt-2">ابدأ بإضافة السائقين لإدارة أسطولك بشكل أفضل</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence>
              {drivers.map((driver, index) => (
                <motion.div
                  key={driver.id}
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                >
                  <Card className="rounded-[2.5rem] border-none shadow-xl bg-white hover:shadow-2xl transition-all duration-300 group overflow-hidden border-b-8 border-b-primary/10">
                    <CardContent className="p-8">
                      <div className="flex items-start justify-between mb-6">
                        <div className="w-16 h-16 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform duration-500">
                          <span className="text-2xl font-black">{driver.driver_name.charAt(0)}</span>
                        </div>
                        <Button variant="ghost" size="icon" className="h-12 w-12 rounded-full bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white transition-all shadow-sm border border-rose-100" onClick={() => handleDelete(driver.id)}>
                          <Trash2 size={20} />
                        </Button>
                      </div>

                      <div className="space-y-4 text-right">
                        <div>
                          <p className="font-black text-2xl text-slate-900">{driver.driver_name}</p>
                          <p className="text-primary font-bold text-lg" dir="ltr">{driver.driver_phone}</p>
                        </div>

                        <div className="pt-4 border-t border-dashed border-slate-100 grid grid-cols-2 gap-2 text-right">
                          <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase">رقم الهوية</p>
                            <p className="text-xs font-black text-slate-700">{driver.id_number || '---'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase">رقم الرخصة</p>
                            <p className="text-xs font-black text-slate-700">{driver.license_number || '---'}</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
