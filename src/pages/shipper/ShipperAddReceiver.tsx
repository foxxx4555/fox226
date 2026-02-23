import { useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Users, Plus, Save, Phone, MapPin, User, Trash2, Edit2 } from 'lucide-react';

export default function ShipperAddReceiver() {
    const [receivers, setReceivers] = useState([
        { id: 1, name: 'مؤسسة الأفق للتجارة', phone: '0501234567', address: 'الرياض, حي العليا' },
        { id: 2, name: 'شركة الإمداد السريع', phone: '0559876543', address: 'جدة, المنطقة الصناعية' }
    ]);

    const [form, setForm] = useState({ name: '', phone: '', address: '' });

    const handleSave = () => {
        if (!form.name || !form.phone || !form.address) {
            toast.error('الرجاء إكمال جميع الحقول');
            return;
        }

        setReceivers([{ ...form, id: Date.now() }, ...receivers]);
        setForm({ name: '', phone: '', address: '' });
        toast.success('تم إضافة العميل بنجاح');
    };

    const handleDelete = (id: number) => {
        setReceivers(receivers.filter(r => r.id !== id));
        toast.success('تم حذف العميل');
    };

    return (
        <AppLayout>
            <div className="max-w-5xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-black mb-2 flex items-center gap-3">
                            <Users className="text-primary" size={32} /> إضافة عميل (مستلم)
                        </h1>
                        <p className="text-muted-foreground font-medium">سجل بيانات عملائك المعتادين لتسهيل إصدار بوليصات الشحن مستقبلاً</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Card className="lg:col-span-1 border-none shadow-xl rounded-[2rem] bg-white h-fit">
                        <CardHeader className="p-6 border-b border-slate-100">
                            <CardTitle className="flex items-center gap-2 text-xl font-black">
                                <Plus className="text-primary bg-primary/10 rounded-full p-1" size={28} /> تسجيل عميل جديد
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-5">
                            <div className="space-y-2">
                                <Label className="font-bold flex items-center gap-2 text-slate-700">
                                    <User size={16} /> اسم المستلم / الشركة
                                </Label>
                                <Input
                                    value={form.name}
                                    onChange={e => setForm({ ...form, name: e.target.value })}
                                    placeholder="أدخل اسم العميل"
                                    className="h-12 rounded-xl bg-slate-50 border-transparent focus:bg-white transition-all shadow-inner"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="font-bold flex items-center gap-2 text-slate-700">
                                    <Phone size={16} /> رقم الجوال
                                </Label>
                                <Input
                                    value={form.phone}
                                    onChange={e => setForm({ ...form, phone: e.target.value })}
                                    placeholder="05XXXXXXXX"
                                    className="h-12 rounded-xl bg-slate-50 border-transparent focus:bg-white transition-all shadow-inner"
                                    dir="ltr"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="font-bold flex items-center gap-2 text-slate-700">
                                    <MapPin size={16} /> العنوان بالكامل
                                </Label>
                                <Input
                                    value={form.address}
                                    onChange={e => setForm({ ...form, address: e.target.value })}
                                    placeholder="المدينة، الحي، الشارع"
                                    className="h-12 rounded-xl bg-slate-50 border-transparent focus:bg-white transition-all shadow-inner"
                                />
                            </div>

                            <Button onClick={handleSave} className="w-full h-14 rounded-xl font-black text-lg bg-primary hover:bg-primary/90 text-white shadow-xl shadow-primary/20 mt-4">
                                <Save className="me-2" size={20} /> حفظ العميل
                            </Button>
                        </CardContent>
                    </Card>

                    <Card className="lg:col-span-2 border-none shadow-xl rounded-[2rem] bg-white">
                        <CardHeader className="p-6 border-b border-slate-100">
                            <CardTitle className="flex items-center gap-2 text-xl font-black">
                                <Users className="text-amber-500 bg-amber-500/10 rounded-full p-1" size={28} /> قائمة المستلمين المسجلين
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="divide-y divide-slate-100">
                                {receivers.map(receiver => (
                                    <div key={receiver.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
                                        <div className="flex gap-4">
                                            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shrink-0">
                                                <User size={24} />
                                            </div>
                                            <div>
                                                <h3 className="font-black text-lg text-slate-800">{receiver.name}</h3>
                                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm font-medium text-slate-500">
                                                    <span className="flex items-center gap-1"><Phone size={14} /> <span dir="ltr">{receiver.phone}</span></span>
                                                    <span className="flex items-center gap-1"><MapPin size={14} /> {receiver.address}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 sm:ms-auto">
                                            <Button variant="outline" size="icon" className="h-10 w-10 border-blue-200 text-blue-600 hover:bg-blue-50 rounded-xl">
                                                <Edit2 size={18} />
                                            </Button>
                                            <Button variant="outline" size="icon" onClick={() => handleDelete(receiver.id)} className="h-10 w-10 border-rose-200 text-rose-600 hover:bg-rose-50 rounded-xl">
                                                <Trash2 size={18} />
                                            </Button>
                                        </div>
                                    </div>
                                ))}

                                {receivers.length === 0 && (
                                    <div className="p-12 text-center text-slate-500 font-medium">
                                        <Users size={48} className="mx-auto text-slate-300 mb-4 opacity-50" />
                                        لا يوجد عملاء مسجلين بعد. أضف عميلك الأول لتسهيل شحناتك القادمة.
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}
