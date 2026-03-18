import { useEffect, useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { exportToExcel } from '@/lib/exportUtils';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, TrendingUp, Users, Truck, PackageCheck, BarChart4, TrendingDown, Download, PieChart as PieChartIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell
} from 'recharts';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
const BG_COLORS_CLASSES = ['bg-[#6366f1]', 'bg-[#10b981]', 'bg-[#f59e0b]', 'bg-[#ef4444]', 'bg-[#8b5cf6]'];

export default function AdminReports() {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalUsers: 0,
        totalDrivers: 0,
        totalShippers: 0,
        totalLoads: 0,
        completedLoads: 0,
    });

    const [chartData, setChartData] = useState<any[]>([]);
    const [truckTypesData, setTruckTypesData] = useState<any[]>([]);

    const fetchReportsData = async () => {
        try {
            // Fetch user metrics (استخدام count لتسريع الأداء)
            const { count: uCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
            const { count: dCount } = await supabase.from('user_roles').select('*', { count: 'exact', head: true }).eq('role', 'driver');
            const { count: sCount } = await supabase.from('user_roles').select('*', { count: 'exact', head: true }).eq('role', 'shipper');

            // Fetch load metrics لجلب البيانات وتجميعها
            const { data: allLoads, error: loadErr } = await supabase.from('loads').select('*');

            if (loadErr) throw loadErr;

            const lCount = allLoads?.length || 0;
            const completedCount = allLoads?.filter((l: any) => l.status === 'completed').length || 0;

            setStats({
                totalUsers: uCount || 0,
                totalDrivers: dCount || 0,
                totalShippers: sCount || 0,
                totalLoads: lCount || 0,
                completedLoads: completedCount
            });

            // معالجة البيانات وتجميعها شهرياً في الـ Frontend
            const monthlyData = (allLoads || []).reduce((acc: any, load) => {
                const month = new Date(load.created_at).toLocaleString('ar-SA', { month: 'long' });
                if (!acc[month]) acc[month] = { name: month, الشحنات: 0, الأرباح: 0 };
                acc[month].الشحنات += 1;
                if (load.status === 'completed') acc[month].الأرباح += 300; // افترضنا عمولة ثابتة 300 ريال
                return acc;
            }, {});

            setChartData(Object.values(monthlyData));

            // تجميع توزيع أنواع الشاحنات
            const truckData = (allLoads || []).reduce((acc: any, load: any) => {
                const type = load.truck_type?.replace('_', ' ') || 'غير محدد';
                if (!acc[type]) acc[type] = { name: type, value: 0 };
                acc[type].value += 1;
                return acc;
            }, {});

            setTruckTypesData(Object.values(truckData));

        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const exportToExcelData = () => {
        // Prepare data for export
        const exportData = chartData.map(row => ({
            'الشهر': row.name,
            'عدد الشحنات': row.الشحنات,
            'الأرباح (ر.س)': row.الأرباح
        }));

        // Set column widths to 15
        const colWidths = [
            { wch: 15 }, // الشهر
            { wch: 15 }, // عدد الشحنات
            { wch: 15 }  // الأرباح (ر.س)
        ];

        exportToExcel(exportData, `تقرير_أداء_المنصة_${new Date().toLocaleDateString('en-GB').replace(/\//g, '-')}`, 'تقرير الأداء', colWidths);
    };

    useEffect(() => {
        fetchReportsData();
    }, []);

    return (
        <AdminLayout>
            <div className="space-y-8 max-w-7xl mx-auto pb-20">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                            <BarChart4 className="text-indigo-600" size={32} />
                            التقارير والتحليلات
                        </h1>
                        <p className="text-muted-foreground font-medium mt-2">نظرة شاملة على أداء المنصة ومعدلات النمو والمشاركة</p>
                    </div>

                    {/* أزرار التصدير */}
                    <Button onClick={exportToExcelData} className="h-12 rounded-xl font-bold bg-white text-slate-700 border-2 border-slate-200 hover:bg-slate-50 transition-all shadow-sm">
                        <Download size={18} className="me-2 text-indigo-500" /> تصدير التقرير (Excel)
                    </Button>
                </div>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <Loader2 className="animate-spin text-indigo-600" size={48} />
                    </div>
                ) : (
                    <>
                        {/* Quick Stats Grid */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <Card className="rounded-[2rem] border-none shadow-sm bg-white">
                                <CardContent className="p-6">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-bold text-slate-500 mb-1">إجمالي المستخدمين</p>
                                            <h3 className="text-3xl font-black text-slate-800">{stats.totalUsers}</h3>
                                        </div>
                                        <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                                            <Users size={20} />
                                        </div>
                                    </div>
                                    <p className="text-xs font-bold text-emerald-500 mt-4 flex items-center gap-1">
                                        <TrendingUp size={14} /> +12% هذا الشهر
                                    </p>
                                </CardContent>
                            </Card>

                            <Card className="rounded-[2rem] border-none shadow-sm bg-white">
                                <CardContent className="p-6">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-bold text-slate-500 mb-1">السائقين المسجلين</p>
                                            <h3 className="text-3xl font-black text-slate-800">{stats.totalDrivers}</h3>
                                        </div>
                                        <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                            <Truck size={20} />
                                        </div>
                                    </div>
                                    <p className="text-xs font-bold text-emerald-500 mt-4 flex items-center gap-1">
                                        <TrendingUp size={14} /> +8% هذا الشهر
                                    </p>
                                </CardContent>
                            </Card>

                            <Card className="rounded-[2rem] border-none shadow-sm bg-white">
                                <CardContent className="p-6">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-bold text-slate-500 mb-1">الشحنات الكلية</p>
                                            <h3 className="text-3xl font-black text-slate-800">{stats.totalLoads}</h3>
                                        </div>
                                        <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
                                            <PackageCheck size={20} />
                                        </div>
                                    </div>
                                    <p className="text-xs font-bold text-emerald-500 mt-4 flex items-center gap-1">
                                        <TrendingUp size={14} /> +24% اعلى من المتوقع
                                    </p>
                                </CardContent>
                            </Card>

                            <Card className="rounded-[2rem] border-none shadow-sm bg-white">
                                <CardContent className="p-6">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-bold text-slate-500 mb-1">معدل الإنجاز</p>
                                            <h3 className="text-3xl font-black text-slate-800">
                                                {stats.totalLoads ? Math.round((stats.completedLoads / stats.totalLoads) * 100) : 0}%
                                            </h3>
                                        </div>
                                        <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
                                            <TrendingUp size={20} />
                                        </div>
                                    </div>
                                    <Badge className="mt-4 bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none font-bold">
                                        أداء ممتاز
                                    </Badge>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Charts Section */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                            <Card className="rounded-[2.5rem] border border-slate-100 shadow-xl bg-white">
                                <CardHeader className="p-6 pb-2">
                                    <CardTitle className="font-black text-xl text-slate-800 flex items-center gap-2">
                                        <TrendingUp className="text-indigo-500" /> معدل نمو الطلبات الشهري
                                    </CardTitle>
                                    <CardDescription className="font-bold">توزيع عدد الشحنات المنشورة بناءً على التواريخ الحقيقية</CardDescription>
                                </CardHeader>
                                <CardContent className="p-6">
                                    <div className="h-72 w-full" dir="ltr">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12, fontWeight: 'bold' }} dy={10} />
                                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12, fontWeight: 'bold' }} />
                                                <Tooltip
                                                    contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
                                                    itemStyle={{ color: '#0f172a' }}
                                                />
                                                <Line type="monotone" name="الطلبات الكلية" dataKey="الشحنات" stroke="#6366f1" strokeWidth={4} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 8 }} />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="rounded-[2.5rem] border border-slate-100 shadow-xl bg-white">
                                <CardHeader className="p-6 pb-2">
                                    <CardTitle className="font-black text-xl text-slate-800 flex items-center gap-2">
                                        <BarChart4 className="text-emerald-500" /> العوائد المالية الشهرية للفترات
                                    </CardTitle>
                                    <CardDescription className="font-bold">تقديرات الأرباح المكتملة بناءً على العمولات</CardDescription>
                                </CardHeader>
                                <CardContent className="p-6">
                                    <div className="h-72 w-full" dir="ltr">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12, fontWeight: 'bold' }} dy={10} />
                                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12, fontWeight: 'bold' }} />
                                                <Tooltip
                                                    contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
                                                    itemStyle={{ color: '#0f172a' }}
                                                    cursor={{ fill: '#f8fafc' }}
                                                />
                                                <Bar name="الأرباح (ريال)" dataKey="الأرباح" fill="#10b981" radius={[8, 8, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* قطاع دائري يوضح نسب الشاحنات */}
                            <Card className="lg:col-span-2 rounded-[2.5rem] border border-slate-100 shadow-xl bg-white mt-2">
                                <CardHeader className="p-6 pb-2">
                                    <CardTitle className="font-black text-xl text-slate-800 flex items-center gap-2">
                                        <PieChartIcon className="text-amber-500" /> توزيع المتطلبات من الشاحنات في السوق
                                    </CardTitle>
                                    <CardDescription className="font-bold">أنواع الشاحنات الأكثر طلباً من التجار على مستوى المنصة</CardDescription>
                                </CardHeader>
                                <CardContent className="p-6 flex flex-col md:flex-row items-center justify-center gap-8">
                                    <div className="h-72 w-full md:w-1/2" dir="ltr">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={truckTypesData}
                                                    cx="50%"
                                                    cy="50%"
                                                    labelLine={false}
                                                    label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                                                    outerRadius={100}
                                                    innerRadius={60}
                                                    fill="#8884d8"
                                                    dataKey="value"
                                                    paddingAngle={5}
                                                >
                                                    {truckTypesData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip contentStyle={{ borderRadius: '1rem', fontWeight: 'bold' }} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="flex flex-col gap-3 w-full md:w-1/3">
                                        {truckTypesData.map((entry, index) => (
                                            <div key={index} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100 hover:border-slate-300 transition-all font-bold">
                                                <div className="flex items-center gap-3">
                                                    <span className={`w-4 h-4 rounded-full ${BG_COLORS_CLASSES[index % BG_COLORS_CLASSES.length]}`}></span>
                                                    <span className="text-slate-700 capitalize">{entry.name}</span>
                                                </div>
                                                <span className="text-slate-400 bg-white px-3 py-1 rounded-xl shadow-sm text-sm">{entry.value} طلب</span>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </>
                )}
            </div>
        </AdminLayout>
    );
}
