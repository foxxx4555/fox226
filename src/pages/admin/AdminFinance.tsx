import { useState, useEffect } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Download, TrendingUp, DollarSign, CreditCard, ArrowUpRight, ArrowDownRight, FileText, CheckCircle2, Clock, Loader2 } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { api } from '@/services/api';
import { supabase } from '@/integrations/supabase/client';
import { AdminStats } from '@/types';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useAuth } from '@/hooks/useAuth';

// بيانات تاريخية لتمثيل المخطط البياني (يمكن ربطها مستقبلاً بقاعدة البيانات)
const revenueData = [
    { name: '1 أكتوبر', revenue: 15400, expected: 12000 },
    { name: '5 أكتوبر', revenue: 18900, expected: 15000 },
    { name: '10 أكتوبر', revenue: 12800, expected: 14000 },
    { name: '15 أكتوبر', revenue: 24700, expected: 18000 },
    { name: '20 أكتوبر', revenue: 21000, expected: 20000 },
    { name: '25 أكتوبر', revenue: 28900, expected: 25000 },
    { name: '30 أكتوبر', revenue: 34500, expected: 28000 },
];

export default function AdminFinance() {
    const { userProfile } = useAuth();
    const [searchQuery, setSearchQuery] = useState('');
    const [transactions, setTransactions] = useState<any[]>([]);
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [chartData, setChartData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // دالة إنشاء وإصدار تقرير الـ PDF باستخدام التقاط واجهة المستخدم
    const generatePDF = async () => {
        const input = document.getElementById('finance-report-content');
        if (!input) {
            toast.error("حدث خطأ أثناء تحديد محتوى التقرير");
            return;
        }

        try {
            toast.loading("يتم الآن تجهيز التقرير...", { id: 'pdf-toast' });

            // تحويل الـ div لصورة عشان نتفادى مشاكل الخط العربي
            const canvas = await html2canvas(input, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff'
            });
            const imgData = canvas.toDataURL('image/png');

            // نحسب أبعاد الـ PDF لتناسب الصورة
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

            // إضافة الصورة للـ PDF (التقرير بالكامل)
            pdf.addImage(imgData, 'PNG', 0, 10, pdfWidth, pdfHeight);
            pdf.save(`finance_report_${new Date().getTime()}.pdf`);

            toast.success("تم تشكيل وتنزيل التقرير المالي بنجاح", { id: 'pdf-toast' });
        } catch (error) {
            console.error("Error generating PDF:", error);
            toast.error("فشل تصدير التقرير", { id: 'pdf-toast' });
        }
    };

    useEffect(() => {
        const fetchFinanceData = async () => {
            try {
                const [trxData, statsData, chartRawData] = await Promise.all([
                    api.getAllTransactions(),
                    api.getAdminStats(),
                    api.getFinancialChartData()
                ]);
                setTransactions(trxData || []);
                setStats(statsData);
                setChartData(chartRawData);
            } catch (error) {
                console.error("Error fetching finance data:", error);
                toast.error("فشل في تحميل البيانات المالية");
            } finally {
                setLoading(false);
            }
        };

        fetchFinanceData();

        // مستمع الـ Realtime لإصدار صوت الـ Ka-ching للأرباح الجديدة
        const financeChannel = supabase
            .channel('finance-tracker')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'transactions',
                    filter: `type=eq.commission`
                },
                (payload) => {
                    // تشغيل الصوت
                    try {
                        const audio = new Audio('/kaching.mp3'); // يجب وضع ملف بهذا الاسم في مجلد public
                        audio.play();
                    } catch (e) {
                        console.log("Audio not supported or file missing");
                    }

                    toast.success('تم تسجيل إيرادات (عمولة) جديدة! 💰', {
                        description: `قيمة العمولة: ${payload.new.amount} ر.س`,
                        duration: 5000,
                    });
                    // تحديث البيانات لعرض المعاملة الجديدة فوراً
                    fetchFinanceData();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(financeChannel);
        };
    }, []);

    const filteredTransactions = transactions.filter(trx => {
        const userName = trx.profiles?.full_name || 'مستخدم غير معروف';
        return userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            trx.id.toLowerCase().includes(searchQuery.toLowerCase());
    });

    if (loading) {
        return (
            <AdminLayout>
                <div className="h-full flex items-center justify-center min-h-[60vh]">
                    <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <div className="space-y-8 max-w-7xl mx-auto pb-20">

                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                            <div className="p-2 bg-blue-100 rounded-xl text-blue-600">
                                <DollarSign size={28} />
                            </div>
                            العمليات المالية
                        </h1>
                        <p className="text-muted-foreground font-medium mt-2">متابعة الإيرادات، التحصيلات، والفواتير المستحقة</p>
                    </div>

                    <div className="flex gap-3">
                        <Button variant="outline" className="h-12 rounded-xl font-bold border-slate-200 text-slate-700 bg-white">
                            <FileText size={18} className="me-2 text-blue-500" />
                            إصدار سجل الفواتير
                        </Button>
                        <Button onClick={generatePDF} className="h-12 rounded-xl font-black bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20">
                            <Download size={18} className="me-2" />
                            تصدير التقرير المالي
                        </Button>
                    </div>
                </div>

                {/* إضافة الـ ID للقسم المراد تصويره كـ PDF */}
                <div id="finance-report-content" className="space-y-8 bg-slate-50 p-4 rounded-3xl">
                    {/* Financial KPI Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card className="rounded-[2rem] border-none shadow-xl bg-gradient-to-br from-blue-600 to-blue-800 text-white overflow-hidden relative">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                            <CardContent className="p-8 relative z-10">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-bold text-blue-100 mb-2">إجمالي الإيرادات (الشهر الحالي)</p>
                                        <h3 className="text-4xl font-black tracking-tight">{stats?.totalCommissions?.toLocaleString() || 0} <span className="text-xl font-bold text-blue-200">ر.س</span></h3>
                                    </div>
                                    <div className="p-3 bg-white/20 rounded-2xl">
                                        <TrendingUp size={24} className="text-white" />
                                    </div>
                                </div>
                                <div className="mt-6 flex items-center gap-2 text-sm font-bold text-emerald-300">
                                    <ArrowUpRight size={16} />
                                    <span>يتم احتساب إيرادات المنصة بناءً على العمولات</span>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="rounded-[2rem] border-none shadow-xl bg-white">
                            <CardContent className="p-8">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-bold text-slate-400 mb-2">التحصيلات المعلقة</p>
                                        <h3 className="text-3xl font-black text-slate-900 tracking-tight">0 <span className="text-lg font-bold text-slate-400">ر.س</span></h3>
                                    </div>
                                    <div className="p-3 bg-amber-50 rounded-2xl border border-amber-100">
                                        <Clock size={24} className="text-amber-500" />
                                    </div>
                                </div>
                                <div className="mt-6 flex items-center gap-2 text-sm font-bold text-slate-400">
                                    <span>قريبًا - سيتم ربطها بنظام الدفع المستقبلي</span>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="rounded-[2rem] border-none shadow-xl bg-white">
                            <CardContent className="p-8">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-bold text-slate-400 mb-2">مستحقات السائقين (للصرف)</p>
                                        <h3 className="text-3xl font-black text-slate-900 tracking-tight">0 <span className="text-lg font-bold text-slate-400">ر.س</span></h3>
                                    </div>
                                    <div className="p-3 bg-rose-50 rounded-2xl border border-rose-100">
                                        <CreditCard size={24} className="text-rose-500" />
                                    </div>
                                </div>
                                <div className="mt-6 flex items-center gap-2 text-sm font-bold text-slate-400">
                                    <span>قريبًا - حساب المستحقات من المحافظ</span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Charts & Tables Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                        {/* Revenue Chart */}
                        <Card className="lg:col-span-2 rounded-[2.5rem] shadow-xl border-none p-2 bg-white">
                            <CardHeader className="pb-2 px-6 pt-6">
                                <CardTitle className="text-xl font-black text-slate-800">تحليل الإيرادات والتحصيلات</CardTitle>
                                <CardDescription className="font-bold text-slate-400">مقارنة بين التحصيل الفعلي والمستهدف لشهر أكتوبر</CardDescription>
                            </CardHeader>
                            <CardContent className="h-[350px] w-full mt-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2} />
                                                <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="colorExpected" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.1} />
                                                <stop offset="95%" stopColor="#94a3b8" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontWeight: 'bold', fontSize: 12 }} dy={10} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontWeight: 'bold', fontSize: 12 }} dx={-10} />
                                        <Tooltip contentStyle={{ borderRadius: '1.5rem', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }} />
                                        <Area type="monotone" dataKey="expected" stroke="#cbd5e1" strokeWidth={2} strokeDasharray="5 5" fillOpacity={1} fill="url(#colorExpected)" name="المستهدف" />
                                        <Area type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={4} fillOpacity={1} fill="url(#colorActual)" name="التحصيل الفعلي" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>

                        {/* Recent Transactions Panel */}
                        <Card className="rounded-[2.5rem] shadow-xl border-none p-6 bg-white flex flex-col">
                            <CardHeader className="px-2 pt-2 pb-4 border-b border-slate-50 flex flex-row items-center justify-between">
                                <CardTitle className="text-xl font-black text-slate-800">سجل الحركات الأخير</CardTitle>
                            </CardHeader>

                            <div className="mt-4 mb-4 relative">
                                <Input
                                    placeholder="ابحث برقم الحركة أو الاسم..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="h-12 pl-10 pr-4 bg-slate-50 border-none rounded-xl font-bold"
                                />
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            </div>

                            <CardContent className="p-0 flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar max-h-[350px]">
                                {filteredTransactions.length === 0 ? (
                                    <div className="text-center py-10 opacity-50 font-bold">لا يوجد حركات لعرضها</div>
                                ) : filteredTransactions.map((trx, index) => (
                                    <div key={index} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:border-blue-100 transition-all cursor-pointer">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${trx.type === 'commission' ? 'bg-amber-100 text-amber-600' : trx.type === 'deposit' || trx.type === 'collection' ? 'bg-emerald-100 text-emerald-600' :
                                                trx.type === 'withdrawal' || trx.type === 'payout' ? 'bg-rose-100 text-rose-600' : 'bg-slate-200 text-slate-600'
                                                }`}>
                                                {trx.type === 'commission' ? <DollarSign size={20} /> : trx.type === 'deposit' || trx.type === 'collection' ? <ArrowDownRight size={20} /> :
                                                    trx.type === 'withdrawal' || trx.type === 'payout' ? <ArrowUpRight size={20} /> : <FileText size={20} />}
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-800 text-sm">{trx.profiles?.full_name || 'مستخدم غير معروف'}</p>
                                                <p className="text-xs text-slate-400 font-bold mt-1" dir="ltr">{trx.id.substring(0, 10).toUpperCase()} - {trx.type === 'commission' ? 'عمولة' : trx.type}</p>
                                            </div>
                                        </div>
                                        <div className="text-left">
                                            <p className={`font-black tracking-tight ${trx.amount > 0 ? 'text-emerald-600' : 'text-slate-800'}`} dir="ltr">
                                                {trx.amount > 0 ? '+' : ''}{trx.amount?.toLocaleString()} ر.س
                                            </p>
                                            <div className="mt-1 flex justify-end">
                                                {trx.status === 'completed' ? (
                                                    <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-none text-[10px] px-2 py-0">مكتمل</Badge>
                                                ) : (
                                                    <Badge variant="outline" className="bg-amber-50 text-amber-600 border-none text-[10px] px-2 py-0">معلق</Badge>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </CardContent>

                            <Button variant="ghost" className="w-full mt-4 text-blue-600 font-bold hover:bg-blue-50 h-10 rounded-xl">
                                عرض كل المعاملات
                            </Button>
                        </Card>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
