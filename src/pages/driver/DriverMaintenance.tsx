import { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/services/api';
import { toast } from 'sonner';
import { Wrench, Plus, Loader2, AlertTriangle, CheckCircle2, FileText, Truck } from 'lucide-react';

export default function DriverMaintenance() {
    const { userProfile, isSubDriver } = useAuth();
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [isAddOpen, setIsAddOpen] = useState(false);

    // Truck list for sub-drivers
    const [assignedTrucks, setAssignedTrucks] = useState<any[]>([]);

    // Form state
    const [truckId, setTruckId] = useState('');
    const [issueType, setIssueType] = useState('breakdown');
    const [priority, setPriority] = useState('high');
    const [description, setDescription] = useState('');

    const fetchRequests = async () => {
        if (!userProfile?.id) return;
        setLoading(true);
        try {
            const data = await api.getDriverMaintenanceRequests(userProfile.id);
            setRequests(data);

            // Fetch driver's assigned truck(s)
            // If they are a sub-driver, we check if they have an assigned_truck_id
            // Currently, profiles don't directly link to assigned trucks, so we'll grab all trucks they own or are assigned to
            let trucksData = [];
            if (isSubDriver) {
                const { data: subDriverData } = await (api as any).supabase.from('sub_drivers').select('*, trucks(*)').eq('id', userProfile.id).single();
                if (subDriverData?.trucks) {
                    trucksData = [subDriverData.trucks];
                }
            } else {
                const { data: myTrucks } = await (api as any).supabase.from('trucks').select('*').eq('owner_id', userProfile.id);
                trucksData = myTrucks || [];
            }
            setAssignedTrucks(trucksData);

        } catch (err: any) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, [userProfile?.id]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!truckId) {
            toast.error("الرجاء اختيار الشاحنة");
            return;
        }

        setSubmitting(true);
        try {
            // Determine Carrier ID - if it's an independent driver, carrier = driver. If sub-driver, carrier = their owner
            let carrier_id = userProfile?.id;
            if (isSubDriver) {
                const { data: sub } = await (api as any).supabase.from('sub_drivers').select('carrier_id').eq('id', userProfile!.id).single();
                if (sub?.carrier_id) carrier_id = sub.carrier_id;
            }

            const payloadData = {
                driver_id: userProfile?.id,
                carrier_id: carrier_id,
                truck_id: truckId,
                issue_type: issueType,
                priority: priority,
                description: description,
                status: 'pending'
            };

            await api.submitMaintenanceRequest(payloadData);
            toast.success("تم إرسال بلاغ الصيانة للإدارة بنجاح");
            setIsAddOpen(false);
            setDescription('');
            fetchRequests();
        } catch (err: any) {
            toast.error(err.message || "فشل إرسال البلاغ");
        } finally {
            setSubmitting(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending': return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-200">بانتظار الموافقة</Badge>;
            case 'in_progress': return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200">جاري الإصلاح</Badge>;
            case 'resolved': return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200"><CheckCircle2 size={14} className="ml-1" /> تم الإصلاح</Badge>;
            default: return <Badge>{status}</Badge>;
        }
    };

    return (
        <AppLayout>
            <div className="max-w-5xl mx-auto pb-20 px-4 space-y-8">

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
                            <Wrench className="text-rose-500" size={32} /> بلاغات الصيانة والأعطال
                        </h1>
                        <p className="text-slate-500 font-bold mt-1">سجل تقارير أعطال الشاحنة وأرسلها للإدارة الفنية</p>
                    </div>
                    <Button onClick={() => setIsAddOpen(true)} className="h-14 rounded-2xl bg-slate-900 hover:bg-slate-800 font-black px-6 gap-2">
                        <Plus size={20} /> رفع طلب صيانة جديد
                    </Button>
                </div>

                {loading ? (
                    <div className="py-20 text-center"><Loader2 className="animate-spin mx-auto text-blue-600" size={40} /></div>
                ) : requests.length === 0 ? (
                    <div className="py-24 bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200 text-center flex flex-col items-center justify-center p-10">
                        <div className="w-20 h-20 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mb-4">
                            <FileText size={40} />
                        </div>
                        <h3 className="text-xl font-black text-slate-600">سجلك نظيف!</h3>
                        <p className="text-slate-400 font-bold mt-2">لا توجد بلاغات صيانة سابقة لك.</p>
                    </div>
                ) : (
                    <div className="grid gap-6">
                        {requests.map((req) => (
                            <Card key={req.id} className="rounded-[2rem] border-none shadow-lg bg-white overflow-hidden relative">
                                <div className={`absolute top-0 right-0 w-2 h-full ${req.status === 'resolved' ? 'bg-emerald-500' : req.priority === 'critical' ? 'bg-rose-500' : 'bg-amber-500'}`}></div>
                                <div className="p-6 md:p-8 flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
                                    <div className="flex items-start gap-4">
                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${req.priority === 'critical' ? 'bg-rose-50 text-rose-500' : 'bg-slate-50 text-slate-500'}`}>
                                            {req.priority === 'critical' ? <AlertTriangle size={28} /> : <Wrench size={28} />}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-3 mb-2">
                                                <h3 className="text-xl font-black text-slate-800">
                                                    {req.issue_type === 'breakdown' ? 'عطل مفاجئ' : req.issue_type === 'oil_change' ? 'تغيير زيت وصيانة' : req.issue_type === 'tires' ? 'مشكلة إطارات' : 'أخرى'}
                                                </h3>
                                                {getStatusBadge(req.status)}
                                            </div>
                                            <p className="text-slate-600 font-medium leading-relaxed max-w-2xl text-right line-clamp-2">{req.description}</p>

                                            <div className="flex items-center gap-4 mt-4 text-xs font-bold text-slate-400">
                                                <span className="flex items-center gap-1"><Truck size={14} /> شاحنة: {req.truck?.plate_number || 'غير محدد'}</span>
                                                <span className="flex items-center gap-1">⌚ {new Date(req.created_at).toLocaleDateString('ar-SA')}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="w-full md:w-auto text-left">
                                        <Badge className={`px-4 py-2 text-sm ${req.priority === 'critical' ? 'bg-rose-500 hover:bg-rose-600' : req.priority === 'high' ? 'bg-orange-500' : 'bg-slate-500'}`}>
                                            الأولوية: {req.priority === 'critical' ? 'حرجة جداً' : req.priority === 'high' ? 'مرتفعة' : 'عادية'}
                                        </Badge>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}

                <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                    <DialogContent className="max-w-lg rounded-[3rem] p-0 overflow-hidden border-none bg-white shadow-2xl">
                        <div className="p-6 bg-[#0f172a] text-white">
                            <h2 className="text-2xl font-black flex items-center gap-3"><Wrench size={24} className="text-rose-400" /> تقديم بلاغ جديد</h2>
                            <p className="text-slate-400 font-medium mt-1 text-sm">سيتم رفع التقرير فوراً إلى قسم الصيانة والإدارة</p>
                        </div>
                        <form onSubmit={handleSubmit} className="p-8 space-y-6 text-right" dir="rtl">

                            <div className="space-y-2">
                                <Label className="font-bold text-slate-700">تحديد الشاحنة</Label>
                                <Select value={truckId} onValueChange={setTruckId} required>
                                    <SelectTrigger className="h-14 bg-slate-50 border-slate-200 rounded-2xl px-4"><SelectValue placeholder="اختر الشاحنة المعطلة..." /></SelectTrigger>
                                    <SelectContent>
                                        {assignedTrucks.length === 0 ? (
                                            <div className="p-4 text-center text-sm text-slate-500 font-bold">لا توجد شاحنات مسندة إليك</div>
                                        ) : (
                                            assignedTrucks.map(t => (
                                                <SelectItem key={t.id} value={t.id} className="font-bold text-right">{t.plate_number} - {t.brand}</SelectItem>
                                            ))
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="font-bold text-slate-700">نوع البلاغ</Label>
                                    <Select value={issueType} onValueChange={setIssueType}>
                                        <SelectTrigger className="h-14 bg-slate-50 border-slate-200 rounded-2xl"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="breakdown">عطل مفاجئ بالطريق</SelectItem>
                                            <SelectItem value="oil_change">صيانة دورية / زيوت</SelectItem>
                                            <SelectItem value="tires">مشاكل إطارات</SelectItem>
                                            <SelectItem value="other">أعطال أخرى</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="font-bold text-slate-700">مستوى الخطورة</Label>
                                    <Select value={priority} onValueChange={setPriority}>
                                        <SelectTrigger className="h-14 bg-slate-50 border-slate-200 rounded-2xl"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="critical" className="text-rose-600 font-black">حرج (توقف تام)</SelectItem>
                                            <SelectItem value="high" className="text-orange-500 font-bold">مرتفع (يحتاج تدخل سريع)</SelectItem>
                                            <SelectItem value="low">منخفض (أعطال بسيطة)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="font-bold text-slate-700">وصف المشكلة بالتفصيل</Label>
                                <textarea
                                    required
                                    className="w-full h-32 p-4 bg-slate-50 border border-slate-200 rounded-2xl resize-none focus:ring-2 focus:ring-rose-500 outline-none"
                                    placeholder="اشرح المشكلة أو الأعراض التي تظهر على الشاحنة..."
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                />
                            </div>

                            <Button type="submit" disabled={submitting} className="w-full h-14 rounded-2xl bg-rose-600 hover:bg-rose-700 font-black text-lg text-white">
                                {submitting ? <Loader2 className="animate-spin" /> : "إرسال البلاغ عاجلاً"}
                            </Button>

                        </form>
                    </DialogContent>
                </Dialog>

            </div>
        </AppLayout>
    );
}
