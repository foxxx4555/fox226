import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Users, UserPlus, Shield, Phone, Mail, User, Truck, Share2, Copy, Send } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export default function DriverAddDriver() {
    const { userProfile } = useAuth();
    const [loading, setLoading] = useState(false);
    const [trucks, setTrucks] = useState<any[]>([]);
    const [formData, setFormData] = useState({
        full_name: '',
        phone: '',
        id_number: '',
        assigned_truck: ''
    });
    const [shareDialogOpen, setShareDialogOpen] = useState(false);

    const inviteLink = typeof window !== 'undefined' ? `${window.location.origin}/register?invite=${userProfile?.id}` : '';

    const handleCopyCode = () => {
        if (!userProfile?.id) return;
        navigator.clipboard.writeText(userProfile.id);
        toast.success("تم نسخ الرمز بنجاح!");
    };

    const handleWhatsAppShare = () => {
        if (!inviteLink) return;
        const message = encodeURIComponent(`انضم إلى أسطولي في تطبيق كايو كمر بلس.\nاستخدم رابط الدعوة التالي للتسجيل:\n${inviteLink}\n\nأو يمكنك التسجيل بإدخال رمز الدعوة اليدوي:\n${userProfile?.id}`);
        window.open(`https://wa.me/?text=${message}`, '_blank');
    };

    useEffect(() => {
        if (userProfile?.id) {
            supabase.from('trucks').select('*').eq('owner_id', userProfile.id).then(({ data }) => {
                setTrucks(data || []);
            });
        }
    }, [userProfile?.id]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { error } = await supabase.from('sub_drivers' as any).insert([{
                carrier_id: userProfile?.id,
                driver_name: formData.full_name,
                driver_phone: formData.phone,
                id_number: formData.id_number,
                assigned_truck_id: formData.assigned_truck || null
            }]);

            if (error) throw error;

            toast.success("تم إضافة السائق بنجاح 👷🎉");
            setFormData({ full_name: '', phone: '', id_number: '', assigned_truck: '' });
        } catch (err: any) {
            toast.error(`حدث خطأ: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <AppLayout>
            <div className="max-w-4xl mx-auto space-y-8 pb-20 px-4">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg">
                            <UserPlus size={28} />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-slate-900">إضافة سائق جديد</h1>
                            <p className="text-slate-500 font-bold">قم بتوسيع أسطولك بإضافة سائقين تحت إدارتك</p>
                        </div>
                    </div>
                    <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" className="rounded-2xl h-14 px-6 gap-3 shadow-sm font-black text-lg border-2 border-slate-200 text-slate-700 hover:bg-slate-50 transition-all transform hover:scale-105 active:scale-95">
                                <Share2 size={24} className="text-blue-600" /> مشاركة الرمز
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
                                    <p className="text-3xl font-black text-blue-600 tracking-wider" dir="ltr">{userProfile?.id?.substring(0, 8).toUpperCase()}</p>
                                    
                                    {/* Copy layer */}
                                    <div 
                                        onClick={handleCopyCode}
                                        className="absolute inset-0 bg-blue-600/95 text-white flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 cursor-pointer transition-all duration-300 font-bold text-lg"
                                    >
                                        <Copy size={20} /> نسخ الرمز
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
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="rounded-[2rem] border-none shadow-xl bg-white p-6 md:col-span-2">
                        <CardHeader>
                            <CardTitle className="text-xl font-black flex items-center gap-2">
                                <User size={20} className="text-blue-600" /> بيانات السائق الجديد
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-6 text-right">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label className="font-bold pr-2">الاسم الكامل</Label>
                                        <Input required value={formData.full_name} onChange={e => setFormData({ ...formData, full_name: e.target.value })} className="h-12 rounded-xl bg-slate-50 border-slate-100 font-bold px-4" placeholder="اسم السائق" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="font-bold pr-2">رقم الجوال</Label>
                                        <Input required value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="h-12 rounded-xl bg-slate-50 border-slate-100 font-bold px-4 text-left" placeholder="05xxxxxxxx" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="font-bold pr-2">رقم الهوية / الرخصة</Label>
                                        <Input required value={formData.id_number} onChange={e => setFormData({ ...formData, id_number: e.target.value })} className="h-12 rounded-xl bg-slate-50 border-slate-100 font-bold px-4" placeholder="رقم الهوية" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="font-bold pr-2">الشاحنة المرتبطة (اختياري)</Label>
                                        <Select value={formData.assigned_truck} onValueChange={val => setFormData({ ...formData, assigned_truck: val })}>
                                            <SelectTrigger className="h-12 bg-slate-50 border-slate-100 rounded-xl" dir="rtl">
                                                <SelectValue placeholder="اختر شاحنة من الأسطول" />
                                            </SelectTrigger>
                                            <SelectContent dir="rtl">
                                                {trucks.map(t => (
                                                    <SelectItem key={t.id} value={t.id}>{t.plate_number} ({t.truck_type})</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <Button disabled={loading} className="w-full h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 font-black text-lg shadow-xl shadow-blue-100">
                                    {loading ? "جاري الحفظ..." : "حفظ بيانات السائق ✅"}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    <Card className="rounded-[2rem] border-none shadow-xl bg-slate-900 text-white p-8">
                        <div className="space-y-6">
                            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                                <Users className="text-blue-400" />
                            </div>
                            <h3 className="text-xl font-bold italic tracking-tighter">لماذا تضيف سائقين؟</h3>
                            <ul className="space-y-4 text-sm font-medium text-slate-400 leading-relaxed">
                                <li className="flex items-start gap-3"><span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0"></span> إمكانية إدارة أكثر من شاحنة في نفس الوقت.</li>
                                <li className="flex items-start gap-3"><span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0"></span> استقبال عدد أكبر من الشحنات والعروض.</li>
                                <li className="flex items-start gap-3"><span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0"></span> تتبع دقيق لأداء كافة العاملين تحت حسابك.</li>
                            </ul>
                            <div className="pt-4 p-4 bg-white/5 rounded-2xl border border-white/10">
                                <p className="text-[10px] text-slate-500 font-black uppercase mb-1">تنبيه أمني</p>
                                <p className="text-xs text-slate-400 font-bold">يجب إرفاق صور المستندات الرسمية عبر تطبيق المراسلة بعد التقديم.</p>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}
