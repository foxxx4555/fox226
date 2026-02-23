import { useEffect, useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, TrendingUp, DollarSign, Wallet, ArrowDownRight, ArrowUpRight, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function AdminFinance() {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalRevenue: 0,
        completedCount: 0,
        activeValue: 0,
        activeCount: 0
    });
    const [recentTransactions, setRecentTransactions] = useState<any[]>([]);

    const fetchFinanceData = async () => {
        try {
            // Fetch completed loads to calculate total historic revenue
            const { data: completedLoads, error: compErr } = await supabase
                .from('loads')
                .select('price, id, created_at, origin, destination')
                .eq('status', 'completed')
                .order('created_at', { ascending: false });

            // Fetch in_progress/accepted loads for expected active value
            const { data: activeLoads, error: actErr } = await supabase
                .from('loads')
                .select('price')
                .in('status', ['pending', 'in_progress']);

            if (compErr || actErr) throw compErr || actErr;

            const totalRev = completedLoads?.reduce((sum, load) => sum + (Number(load.price) || 0), 0) || 0;
            const actVal = activeLoads?.reduce((sum, load) => sum + (Number(load.price) || 0), 0) || 0;

            setStats({
                totalRevenue: totalRev,
                completedCount: completedLoads?.length || 0,
                activeValue: actVal,
                activeCount: activeLoads?.length || 0
            });

            // Use the latest 10 completed loads as "Recent Transactions"
            setRecentTransactions(completedLoads?.slice(0, 10) || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFinanceData();
    }, []);

    return (
        <AdminLayout>
            <div className="space-y-8 max-w-7xl mx-auto pb-20">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <DollarSign className="text-emerald-600" size={32} />
                        العمليات المالية
                    </h1>
                    <p className="text-muted-foreground font-medium mt-2">نظرة عامة على الإيرادات وحركة المبالغ داخل النظام</p>
                </div>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <Loader2 className="animate-spin text-emerald-600" size={48} />
                    </div>
                ) : (
                    <>
                        {/* بطاقات الإحصائيات */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <Card className="rounded-[2rem] border-none shadow-md bg-white relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-full h-1 bg-emerald-500"></div>
                                <CardContent className="p-8">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="font-bold text-slate-500">إجمالي إيرادات النظام</h3>
                                        <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center">
                                            <Wallet className="text-emerald-500" size={24} />
                                        </div>
                                    </div>
                                    <h2 className="text-4xl font-black text-slate-800 tracking-tight mb-2">
                                        {stats.totalRevenue.toLocaleString()} <span className="text-lg text-emerald-500">ر.س</span>
                                    </h2>
                                    <p className="text-sm font-bold text-emerald-600 flex items-center gap-1">
                                        <TrendingUp size={16} /> بناءً على {stats.completedCount} شحنة مكتملة
                                    </p>
                                </CardContent>
                            </Card>

                            <Card className="rounded-[2rem] border-none shadow-md bg-white relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-full h-1 bg-blue-500"></div>
                                <CardContent className="p-8">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="font-bold text-slate-500">المبالغ المعلقة (شحنات نشطة)</h3>
                                        <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center">
                                            <ArrowUpRight className="text-blue-500" size={24} />
                                        </div>
                                    </div>
                                    <h2 className="text-4xl font-black text-slate-800 tracking-tight mb-2">
                                        {stats.activeValue.toLocaleString()} <span className="text-lg text-blue-500">ر.س</span>
                                    </h2>
                                    <p className="text-sm font-bold text-blue-600 flex items-center gap-1">
                                        من إجمالي {stats.activeCount} شحنة قيد التنفيذ
                                    </p>
                                </CardContent>
                            </Card>

                            <Card className="rounded-[2rem] border-none shadow-md bg-white relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-full h-1 bg-amber-500"></div>
                                <CardContent className="p-8">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="font-bold text-slate-500">صافي أرباح المنصة (نسبة 5% متوقعة)</h3>
                                        <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center">
                                            <DollarSign className="text-amber-500" size={24} />
                                        </div>
                                    </div>
                                    <h2 className="text-4xl font-black text-slate-800 tracking-tight mb-2">
                                        {(stats.totalRevenue * 0.05).toLocaleString()} <span className="text-lg text-amber-500">ر.س</span>
                                    </h2>
                                    <p className="text-sm font-bold text-slate-400">
                                        تقدير مبني على نسبة عمولة افتراضية
                                    </p>
                                </CardContent>
                            </Card>
                        </div>

                        {/* جدول أحدث العمليات */}
                        <h2 className="text-2xl font-black text-slate-800 mt-12 mb-6 border-b pb-4">أحدث العمليات المالية المكتملة</h2>

                        {recentTransactions.length === 0 ? (
                            <div className="text-center py-24 bg-white rounded-[3rem] border-2 border-dashed border-slate-200">
                                <FileText size={64} className="mx-auto text-slate-300 mb-4" />
                                <p className="font-bold text-slate-500 text-lg">لم تسجل أي عمليات مالية بعد</p>
                            </div>
                        ) : (
                            <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-right border-collapse">
                                        <thead>
                                            <tr className="bg-slate-50 border-b border-slate-100">
                                                <th className="p-4 font-black text-slate-500">رقم العملية</th>
                                                <th className="p-4 font-black text-slate-500">المسار</th>
                                                <th className="p-4 font-black text-slate-500">التاريخ</th>
                                                <th className="p-4 font-black text-slate-500">القيمة</th>
                                                <th className="p-4 font-black text-slate-500">الحالة</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {recentTransactions.map((tx: any, i) => (
                                                <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                                    <td className="p-4 font-bold text-slate-600 font-mono tracking-wider">#{tx.id.substring(0, 8)}</td>
                                                    <td className="p-4 font-bold text-slate-800">{tx.origin} إلى {tx.destination}</td>
                                                    <td className="p-4 text-slate-500 font-medium" dir="ltr">
                                                        {new Date(tx.created_at).toLocaleDateString('ar-SA')}
                                                    </td>
                                                    <td className="p-4 font-black text-emerald-600">{Number(tx.price).toLocaleString()} <span className="text-xs">ر.س</span></td>
                                                    <td className="p-4"><Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none">مكتمل ومسدد</Badge></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </AdminLayout>
    );
}
