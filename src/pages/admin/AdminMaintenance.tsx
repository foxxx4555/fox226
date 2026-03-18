import { useState, useEffect } from 'react';
import MaintenanceChat from '@/components/MaintenanceChat';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import AdminLayout from '@/components/AdminLayout';
import { useNavigate } from 'react-router-dom';
import {
    Wrench,
    CheckCircle2,
    XCircle,
    Clock,
    Eye,
    MessageCircle,
    Download,
    AlertCircle,
    TrendingDown,
    FileText,
    User,
    Truck,
    Package,
    Loader2,
    ChevronRight,
    ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from '@/components/ui/textarea';
import * as XLSX from 'xlsx';

export default function AdminMaintenance() {
    const { userProfile } = useAuth() as any;
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedRequest, setSelectedRequest] = useState<any>(null);
    const [adminNote, setAdminNote] = useState('');
    const navigate = useNavigate();

    const handleExportExcel = () => {
        if (requests.length === 0) {
            toast.error("لا توجد بيانات لتصديرها");
            return;
        }

        const worksheetData = requests.map(req => ({
            'التاريخ': new Date(req.created_at).toLocaleDateString('ar-SA'),
            'السائق': req.driver?.full_name || 'غير معروف',
            'الهاتف': req.driver?.phone || '-',
            'الشاحنة': req.truck ? `${req.truck.plate_number} (${req.truck.brand})` : '-',
            'الفئة': categoryMap[req.category] || req.category,
            'الشحنة': req.load ? `${req.load.origin} - ${req.load.destination}` : '-',
            'الوصف': req.description,
            'التكلفة (ر.س)': req.repair_cost,
            'الحالة': req.status === 'approved' ? 'معتمد' : req.status === 'rejected' ? 'مرفوض' : 'قيد الانتظار',
            'ملاحظات الإدارة': req.admin_notes || '-'
        }));

        const worksheet = XLSX.utils.json_to_sheet(worksheetData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "طلبات الصيانة");
        XLSX.writeFile(workbook, `تقارير_الصيانة_${new Date().toISOString().split('T')[0]}.xlsx`);
        toast.success("تم تصدير ملف Excel بنجاح");
    };

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('maintenance_requests' as any)
                .select(`
                    *,
                    driver:profiles!driver_id(full_name, phone),
                    load:loads(origin, destination),
                    truck:trucks(plate_number, brand, model_year)
                `)
                .order('created_at', { ascending: false });

            if (error) {
                // Fallback: If join fails because migration not applied yet, get raw data
                if (error.code === 'PGRST200') {
                    const { data: rawData, error: rawError } = await supabase
                        .from('maintenance_requests' as any)
                        .select('*')
                        .order('created_at', { ascending: false });
                    if (rawError) throw rawError;
                    setRequests(rawData || []);
                    return;
                }
                throw error;
            }
            setRequests(data || []);
        } catch (err: any) {
            toast.error("فشل تحميل طلبات الصيانة");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();

        // Realtime update
        const channel = supabase.channel('admin-maintenance')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'maintenance_requests' }, () => fetchRequests())
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    const handleUpdateStatus = async (id: string, status: string) => {
        try {
            // محاولة التحديث الكامل بما في ذلك حالة الدفع
            const { error: fullError } = await supabase
                .from('maintenance_requests' as any)
                .update({
                    status,
                    admin_notes: adminNote,
                    payment_status: status === 'resolved' ? 'paid' : 'unpaid'
                } as any)
                .eq('id', id);

            // إذا كان الخطأ بسبب عدم وجود العمود (PGRST204)
            if (fullError && (fullError as any).code === 'PGRST204') {
                console.warn("Column payment_status missing, falling back to basic update");
                const { error: fallbackError } = await supabase
                    .from('maintenance_requests' as any)
                    .update({
                        status,
                        admin_notes: adminNote
                    } as any)
                    .eq('id', id);

                if (fallbackError) throw fallbackError;
            } else if (fullError) {
                throw fullError;
            }

            let successMsg = "تم تحديث الحالة";
            if (status === 'approved') successMsg = "تم اعتماد الطلب بنجاح ✅";
            if (status === 'rejected') successMsg = "تم رفض الطلب";
            if (status === 'resolved') successMsg = "تم إغلاق البلاغ نهائياً ✅";

            toast.success(successMsg);
            setSelectedRequest(null);
            setAdminNote('');
            fetchRequests();
        } catch (err: any) {
            toast.error("فشل التحديث: " + (err.message || "خطأ غير معروف"));
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'approved': return <Badge className="bg-blue-500 text-white gap-1"><Clock size={12} /> معتمد - قيد الإصلاح</Badge>;
            case 'repaired': return <Badge className="bg-amber-500 text-white gap-1"><AlertCircle size={12} /> بانتظار استلام الإصلاح</Badge>;
            case 'resolved': return <Badge className="bg-emerald-500 text-white gap-1"><CheckCircle2 size={12} /> تم الإصلاح نهائياً</Badge>;
            case 'rejected': return <Badge className="bg-rose-500 text-white gap-1"><XCircle size={12} /> مرفوض</Badge>;
            default: return <Badge className="bg-slate-500 text-white gap-1"><Clock size={12} /> بانتظار الاعتماد</Badge>;
        }
    };

    const categoryMap: any = {
        fuel: 'وقود / بنزين',
        tire: 'إطارات / كاوتش',
        mechanical: 'عطل ميكانيكي',
        oil: 'تغيير زيت',
        other: 'أخرى'
    };

    return (
        <AdminLayout>
            <div className="space-y-8 p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="rounded-full hover:bg-slate-100"
                            onClick={() => navigate(-1)}
                        >
                            <ArrowRight className="text-slate-400" />
                        </Button>
                        <div className="p-3 bg-orange-600/10 rounded-2xl text-orange-600"><Wrench size={32} /></div>
                        <div>
                            <h1 className="text-3xl font-black text-slate-800 tracking-tight">إدارة صيانة الشاحنات</h1>
                            <p className="text-muted-foreground font-bold">مراجعة طلبات السائقين واعتماد فواتير الإصلاح</p>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <Button
                            variant="outline"
                            onClick={handleExportExcel}
                            className="bg-emerald-50 border-emerald-100 text-emerald-700 hover:bg-emerald-100 font-bold rounded-xl h-12 px-6 transition-all"
                        >
                            <Download size={20} className="ml-2" /> تصدير إكسل
                        </Button>
                        <Card className="px-6 py-3 border-none bg-emerald-50 shadow-sm flex items-center gap-3">
                            <div className="text-right">
                                <p className="text-[10px] font-black text-emerald-600 uppercase">إجمالي المعتمد</p>
                                <p className="text-xl font-black text-emerald-700">
                                    {requests.filter(r => r.status === 'approved').reduce((acc, curr) => acc + (parseFloat(curr.repair_cost) || 0), 0).toLocaleString()} <span className="text-xs">ر.س</span>
                                </p>
                            </div>
                            <TrendingDown className="text-emerald-500" />
                        </Card>
                    </div>
                </div>

                <div className="grid gap-6">
                    <AnimatePresence>
                        {loading ? (
                            <div className="flex justify-center py-20"><Loader2 className="animate-spin text-orange-600" size={48} /></div>
                        ) : requests.length === 0 ? (
                            <div className="text-center py-20 bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200">
                                <p className="text-slate-400 font-bold">لا توجد طلبات صيانة حالياً</p>
                            </div>
                        ) : (
                            requests.map((req) => (
                                <motion.div key={req.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                                    <Card className="rounded-[2rem] border-none shadow-xl hover:shadow-2xl transition-all cursor-pointer group bg-white overflow-hidden" onClick={() => setSelectedRequest(req)}>
                                        <CardContent className="p-0">
                                            <div className="flex flex-col md:flex-row">
                                                {/* Driver Info Sidebar */}
                                                <div className="w-full md:w-64 bg-slate-50 p-6 border-l border-slate-100 flex flex-col justify-between">
                                                    <div className="space-y-3">
                                                        <div className="flex items-center gap-2 text-slate-400"><User size={14} /><span className="text-xs font-black uppercase">السائق</span></div>
                                                        <p className="font-black text-slate-800">{req.driver?.full_name}</p>
                                                        <p className="text-xs text-slate-500 font-bold">{req.driver?.phone}</p>
                                                    </div>
                                                    <div className="mt-4 pt-4 border-t border-slate-200">
                                                        <p className="text-[10px] text-slate-400 font-black mb-1">تاريخ الطلب</p>
                                                        <p className="text-xs font-bold text-slate-600">{new Date(req.created_at).toLocaleDateString('ar-SA')}</p>
                                                    </div>
                                                </div>

                                                {/* Request Content */}
                                                <div className="flex-1 p-8 flex flex-col md:flex-row justify-between items-center gap-8">
                                                    <div className="space-y-4 flex-1">
                                                        <div className="flex items-center gap-3">
                                                            <Badge variant="outline" className="rounded-lg h-8 px-3 border-orange-200 text-orange-600 font-black">
                                                                {categoryMap[req.category] || req.category}
                                                            </Badge>
                                                            {getStatusBadge(req.status)}
                                                        </div>
                                                        <p className="text-lg font-bold text-slate-800 line-clamp-2">{req.description}</p>
                                                        <div className="flex items-center gap-2 text-blue-600 bg-blue-50 px-3 py-1.5 rounded-xl w-fit">
                                                            <Truck size={14} />
                                                            <span className="text-xs font-black">
                                                                الشاحنة: {req.truck?.plate_number} ({req.truck?.brand})
                                                            </span>
                                                        </div>
                                                        {req.load && (
                                                            <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl w-fit">
                                                                <Package size={14} />
                                                                <span className="text-xs font-black">رحلة: {req.load.origin} ← {req.load.destination}</span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="flex items-center gap-8">
                                                        <div className="text-center">
                                                            <p className="text-[10px] font-black text-slate-400 mb-1">مبلغ الفاتورة</p>
                                                            <p className="text-3xl font-black text-slate-900">{req.repair_cost.toLocaleString()} <span className="text-sm">ر.س</span></p>
                                                        </div>
                                                        <Button size="icon" className="w-14 h-14 rounded-2xl bg-slate-900 hover:bg-black text-white shadow-lg">
                                                            <Eye />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            ))
                        )}
                    </AnimatePresence>
                </div>

                {/* Details Modal */}
                <Dialog open={!!selectedRequest} onOpenChange={(val) => !val && setSelectedRequest(null)}>
                    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-[2.5rem] border-none p-0 bg-white">
                        <DialogTitle className="sr-only">تفاصيل طلب الصيانة</DialogTitle>
                        {selectedRequest && (
                            <div className="flex flex-col">
                                <div className="p-8 bg-slate-50 border-b flex justify-between items-center">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-orange-600 text-white rounded-2xl"><Wrench /></div>
                                        <div>
                                            <h2 className="text-2xl font-black">تفاصيل طلب الصيانة</h2>
                                            <p className="text-xs font-bold text-slate-500">تم الطلب بواسطة {selectedRequest.driver?.full_name}</p>
                                        </div>
                                    </div>
                                    {getStatusBadge(selectedRequest.status)}
                                </div>

                                <div className="p-8 space-y-10">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                        <div className="space-y-6">
                                            <div className="space-y-4">
                                                <Label className="font-black text-lg">وصف المشكلة من السائق</Label>
                                                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 italic text-slate-700 font-medium">
                                                    "{selectedRequest.description}"
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                <Label className="font-black text-lg">الصور المرفقة (لقطات حية)</Label>
                                                <div className="grid grid-cols-2 gap-4">
                                                    {selectedRequest.images.map((img: string, i: number) => (
                                                        <div key={i} className="rounded-2xl overflow-hidden shadow-lg aspect-square border-2 border-slate-100">
                                                            <img src={img} alt={`صورة صيانة - ${i + 1}`} className="w-full h-full object-cover cursor-zoom-in" onClick={() => window.open(img, '_blank')} />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* محادثة الصيانة */}
                                            <div className="pt-4">
                                                <MaintenanceChat
                                                    requestId={selectedRequest.id}
                                                    currentUserId={userProfile?.id}
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-8">
                                            <div className="space-y-4">
                                                <Label className="font-black text-lg">صورة الفاتورة المرفرفة</Label>
                                                <div className="rounded-3xl overflow-hidden shadow-2xl border-4 border-white aspect-[3/4] relative group">
                                                    <img src={selectedRequest.invoice_image} alt="صورة الفاتورة" className="w-full h-full object-cover" />
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                        <Button variant="outline" className="text-white border-white font-black" onClick={() => window.open(selectedRequest.invoice_image, '_blank')}>عرض الصورة كاملة</Button>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="p-8 bg-emerald-50 rounded-[2rem] border border-emerald-100 flex justify-between items-center">
                                                <div className="space-y-1">
                                                    <p className="text-sm font-black text-emerald-600">القيمة الإجمالية</p>
                                                    <p className="text-4xl font-black text-emerald-800">{selectedRequest.repair_cost.toLocaleString()} <span className="text-lg">ر.س</span></p>
                                                </div>
                                                <FileText className="text-emerald-300" size={48} />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-8 border-t space-y-6">
                                        <Label className="font-black text-lg">ملاحظات الإدارة والرد</Label>
                                        <Textarea
                                            placeholder="اكتب ملاحظاتك للسائق أو سبب الرفض/القبول..."
                                            className="rounded-2xl min-h-[100px]"
                                            value={adminNote}
                                            onChange={e => setAdminNote(e.target.value)}
                                        />

                                        <div className="flex gap-4">
                                            {selectedRequest.status === 'pending' && (
                                                <>
                                                    <Button
                                                        className="h-16 flex-1 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-lg gap-2"
                                                        onClick={() => handleUpdateStatus(selectedRequest.id, 'approved')}
                                                    >
                                                        <CheckCircle2 /> اعتماد الطلب (بدء الإصلاح)
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        className="h-16 flex-1 rounded-2xl border-rose-200 text-rose-600 hover:bg-rose-50 font-black text-lg gap-2"
                                                        onClick={() => handleUpdateStatus(selectedRequest.id, 'rejected')}
                                                    >
                                                        <XCircle /> رفض الطلب
                                                    </Button>
                                                </>
                                            )}

                                            {selectedRequest.status === 'repaired' && (
                                                <Button
                                                    className="h-16 w-full rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-lg gap-2 shadow-xl shadow-emerald-100"
                                                    onClick={() => handleUpdateStatus(selectedRequest.id, 'resolved')}
                                                >
                                                    <CheckCircle2 /> تأكيد استلام الشاحنة وإغلاق البلاغ ✅
                                                </Button>
                                            )}

                                            {(selectedRequest.status === 'resolved' || selectedRequest.status === 'rejected') && (
                                                <div className={`w-full text-center p-6 rounded-2xl border font-bold ${selectedRequest.status === 'resolved' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-rose-50 border-rose-200 text-rose-700'}`}>
                                                    {selectedRequest.status === 'resolved' ? 'تم إصلاح هذا العطل وإغلاق الملف بنجاح.' : 'تم رفض هذا الطلب.'}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
            </div>
        </AdminLayout>
    );
}
