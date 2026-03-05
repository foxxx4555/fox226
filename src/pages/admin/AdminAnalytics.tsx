import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    LineChart, Line, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import {
    TrendingUp, Users, Truck, CheckCircle2, AlertTriangle,
    Calendar, ArrowUpRight, ArrowDownRight, Activity
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminAnalytics() {
    const { data: stats, isLoading } = useQuery({
        queryKey: ['admin-stats'],
        queryFn: async () => {
            const [
                { count: totalLoads },
                { count: activeLoads },
                { count: completedLoads },
                { count: totalDrivers },
                { data: recentLoads }
            ] = await Promise.all([
                supabase.from('loads').select('*', { count: 'exact', head: true }),
                supabase.from('loads').select('*', { count: 'exact', head: true }).eq('status', 'in_progress'),
                supabase.from('loads').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
                supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'driver'),
                supabase.from('loads').select('created_at, status, price').order('created_at', { ascending: false }).limit(100)
            ]);

            // Grouping for charts (mock logic for demo if no real time series)
            const dailyData = [
                { name: 'السبت', value: 12 },
                { name: 'الأحد', value: 18 },
                { name: 'الاثنين', value: 15 },
                { name: 'الثلاثاء', value: 25 },
                { name: 'الأربعاء', value: 22 },
                { name: 'الخميس', value: 30 },
                { name: 'الجمعة', value: 20 },
            ];

            const statusData = [
                { name: 'مكتملة', value: completedLoads || 0, color: '#10b981' },
                { name: 'قيد التنفيذ', value: activeLoads || 0, color: '#3b82f6' },
                { name: 'متاحة', value: (totalLoads || 0) - (completedLoads || 0) - (activeLoads || 0), color: '#f59e0b' },
            ];

            return { totalLoads, activeLoads, completedLoads, totalDrivers, dailyData, statusData };
        }
    });

    if (isLoading) return (
        <div className="p-10 space-y-8 animate-pulse">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 rounded-[2rem] bg-slate-100" />)}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Skeleton className="h-[400px] rounded-[2rem] bg-slate-100" />
                <Skeleton className="h-[400px] rounded-[2rem] bg-slate-100" />
            </div>
        </div>
    );

    const StatCard = ({ title, value, icon, trend, color }: any) => (
        <Card className="rounded-[2rem] border-none shadow-xl shadow-slate-200/50 overflow-hidden group hover:scale-[1.02] transition-transform duration-300">
            <CardContent className="p-8">
                <div className="flex justify-between items-start">
                    <div className={`p-4 rounded-2xl ${color} text-white shadow-lg`}>
                        {icon}
                    </div>
                    <div className={`flex items-center gap-1 text-sm font-bold ${trend > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {trend > 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                        {Math.abs(trend)}%
                    </div>
                </div>
                <div className="mt-6">
                    <p className="text-slate-500 font-bold text-sm mb-1">{title}</p>
                    <h3 className="text-4xl font-black text-slate-800">{value}</h3>
                </div>
            </CardContent>
        </Card>
    );

    return (
        <div className="p-6 md:p-10 space-y-10 bg-[#f8fafc]/50 min-h-screen" dir="rtl">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h1 className="text-5xl font-black text-slate-900 tracking-tighter">ذكاء الأسطول <span className="text-blue-600">Analytics</span></h1>
                    <p className="text-slate-500 font-bold mt-2">نظرة استراتيجية شاملة على أداء العمليات والشحنات</p>
                </div>
                <div className="flex gap-2">
                    <button className="px-6 py-3 bg-white border-2 border-slate-100 rounded-2xl font-black text-slate-600 hover:bg-slate-50 transition-all flex items-center gap-2">
                        <Calendar size={18} /> آخر 7 أيام
                    </button>
                    <button className="px-6 py-3 bg-[#0f172a] text-white rounded-2xl font-black hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/10">
                        تحديث البيانات
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                <StatCard title="إجمالي الشحنات" value={stats?.totalLoads} icon={<Truck size={28} />} trend={12} color="bg-blue-600" />
                <StatCard title="شحنات نشطة" value={stats?.activeLoads} icon={<Activity size={28} />} trend={5} color="bg-emerald-500" />
                <StatCard title="السائقين المسجلين" value={stats?.totalDrivers} icon={<Users size={28} />} trend={8} color="bg-violet-600" />
                <StatCard title="الطلبات المكتملة" value={stats?.completedLoads} icon={<CheckCircle2 size={28} />} trend={-2} color="bg-amber-500" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <Card className="rounded-[2.5rem] border-none shadow-2xl bg-white overflow-hidden">
                    <CardHeader className="p-8 border-b border-slate-50">
                        <CardTitle className="text-xl font-black flex items-center gap-2">
                            <TrendingUp className="text-blue-600" /> حجم الشحنات الأسبوعي
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-8 h-[400px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={stats?.dailyData}>
                                <defs>
                                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontWeight: 'bold' }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontWeight: 'bold' }} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
                                />
                                <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={4} fillOpacity={1} fill="url(#colorValue)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card className="rounded-[2.5rem] border-none shadow-2xl bg-white overflow-hidden">
                    <CardHeader className="p-8 border-b border-slate-50">
                        <CardTitle className="text-xl font-black flex items-center gap-2">
                            <CheckCircle2 className="text-emerald-500" /> توزيع حالات الشحن
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-8 flex items-center justify-center h-[400px]">
                        <div className="w-full h-full flex flex-col md:flex-row items-center gap-8">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={stats?.statusData}
                                        innerRadius={80}
                                        outerRadius={120}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {stats?.statusData.map((entry: any, index: number) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="space-y-4 w-full md:w-48">
                                {stats?.statusData.map((item: any) => (
                                    <div key={item.name} className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                                            <span className="text-sm font-bold text-slate-600">{item.name}</span>
                                        </div>
                                        <span className="text-sm font-black text-slate-800">{item.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
