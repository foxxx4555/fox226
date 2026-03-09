import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { api } from '@/services/api';
import AdminLayout from '@/components/AdminLayout';
import StatCard from '@/components/StatCard';
import {
  Users,
  Package,
  Truck,
  ShieldCheck,
  Activity,
  BarChart3,
  AlertCircle,
  DollarSign,
  TrendingUp,
  Calendar,
  ChevronLeft,
  Wrench
} from 'lucide-react';
import { AdminStats } from '@/types';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { supabase } from '@/integrations/supabase/client';

function AdminDashboard() {
  const { t } = useTranslation();

  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalSubDrivers: 0,
    totalShippers: 0,
    totalCarriers: 0,
    totalTrucks: 0,
    activeLoads: 0,
    completedTrips: 0,
    totalCommissions: 0,
    monthlyTarget: 0,
    totalReceivers: 0
  });

  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<any[]>([]);

  const fetchData = async () => {
    try {
      const [statsData, tickets, cData] = await Promise.all([
        api.getAdminStats(),
        api.getTickets(),
        api.getAdminChartData()
      ]);

      setStats(statsData);
      setAlerts(tickets.slice(0, 4));
      setChartData(cData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel('admin-refresh')
      .on(
        'postgres_changes',
        { event: '*', table: 'loads', schema: 'public' },
        fetchData
      )
      .on(
        'postgres_changes',
        { event: '*', table: 'support_tickets', schema: 'public' },
        fetchData
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Data fetched from getAdminChartData() will populate this view

  return (
    <AdminLayout>
      <div className="space-y-10 pb-20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <h1 className="text-4xl font-black tracking-tight flex items-center gap-4 text-slate-900">
              <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-500/20">
                <ShieldCheck className="text-white" size={32} />
              </div>
              لوحة التحكم الإدارية
            </h1>
            <p className="text-slate-400 font-bold text-lg mt-2 mr-16">
              مرحباً بك، مراقبة حية لكامل عمليات المنصة
            </p>
          </motion.div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="h-14 px-6 rounded-2xl font-bold border-2 gap-2"
              onClick={() => window.location.reload()}
            >
              <Calendar size={20} />
              آخر 30 يوم
            </Button>
            <Link to="/admin/reports">
              <Button className="h-14 px-8 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black shadow-xl shadow-blue-500/20 gap-2">
                <BarChart3 size={20} />
                تصدير التقارير
              </Button>
            </Link>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <Link to="/admin/users" className="block transition-transform hover:scale-105 active:scale-95 duration-200">
            <StatCard
              title="إجمالي المستخدمين"
              value={stats.totalUsers}
              icon={<Users size={28} />}
              color="primary"
            />
          </Link>
          <Link to="/admin/loads?status=active" className="block transition-transform hover:scale-105 active:scale-95 duration-200">
            <StatCard
              title="الشحنات النشطة"
              value={stats.activeLoads}
              icon={<Activity size={28} />}
              color="destructive"
            />
          </Link>
          <Link to="/admin/loads?status=completed" className="block transition-transform hover:scale-105 active:scale-95 duration-200">
            <StatCard
              title="الشحنات المكتملة"
              value={stats.completedTrips || 0}
              icon={<Package size={28} />}
              color="secondary"
            />
          </Link>
          <Link to="/admin/maintenance" className="block transition-transform hover:scale-105 active:scale-95 duration-200">
            <StatCard
              title="طلبات الصيانة"
              value="إدارة"
              icon={<Wrench size={28} />}
              color="accent"
            />
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Chart Card */}
          <Card className="lg:col-span-2 rounded-[3rem] shadow-2xl border-none p-10 bg-white group transition-all duration-500 hover:shadow-blue-500/5">
            <CardHeader className="px-0 pt-0 flex flex-row items-center justify-between mb-8">
              <div>
                <CardTitle className="text-2xl font-black flex items-center gap-2">
                  <BarChart3 className="text-blue-600" />
                  تحليل أداء الشحن
                </CardTitle>
                <CardDescription className="font-bold text-slate-400 mt-1">
                  معدل نمو الطلبات والإيرادات خلال الأسبوع الحالي
                </CardDescription>
              </div>
              <div className="flex gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-100">
                <div className="px-4 py-2 rounded-lg bg-white shadow-sm font-bold text-xs cursor-pointer">اليومي</div>
                <div className="px-4 py-2 rounded-lg text-slate-400 font-bold text-xs cursor-pointer hover:bg-white transition-all">الشهري</div>
              </div>
            </CardHeader>

            <CardContent className="h-[400px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontWeight: 'bold', fontSize: 12 }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontWeight: 'bold', fontSize: 12 }}
                    dx={-10}
                  />
                  <Tooltip
                    contentStyle={{ borderRadius: '1.5rem', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#2563eb"
                    strokeWidth={4}
                    fillOpacity={1}
                    fill="url(#colorRevenue)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Side Panels */}
          <div className="space-y-8">
            {/* User Breakdown Card */}
            <Card className="rounded-[2.5rem] shadow-xl border-none p-8 bg-slate-900 text-white overflow-hidden relative">
              <div className="absolute right-0 top-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl"></div>
              <CardHeader className="px-0 pt-0 relative z-10">
                <CardTitle className="text-xl font-black">توزيع المستخدمين</CardTitle>
              </CardHeader>
              <CardContent className="px-0 space-y-5 relative z-10 mt-6">
                <Link to="/admin/users?role=driver" className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10 group hover:bg-white/10 transition-all cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                      <Truck size={18} className="text-blue-400" />
                    </div>
                    <span className="font-bold">الناقلين</span>
                  </div>
                  <span className="text-xl font-black">{stats.totalSubDrivers || 0}</span>
                </Link>
                <Link to="/admin/users?role=shipper" className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10 group hover:bg-white/10 transition-all cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center">
                      <Package size={18} className="text-amber-400" />
                    </div>
                    <span className="font-bold">الشاحنين</span>
                  </div>
                  <span className="text-xl font-black">{stats.totalShippers}</span>
                </Link>
                <Link to="/admin/users?role=receiver" className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10 group hover:bg-white/10 transition-all cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                      <ShieldCheck size={18} className="text-emerald-400" />
                    </div>
                    <span className="font-bold">المستلمين</span>
                  </div>
                  <span className="text-xl font-black">{stats.totalReceivers || 0}</span>
                </Link>
              </CardContent>
            </Card>

            {/* Recent Tickets Panel */}
            <Card className="rounded-[2.5rem] shadow-xl border-none p-8 bg-white border border-slate-100">
              <CardHeader className="px-0 pt-0 flex flex-row items-center justify-between">
                <CardTitle className="text-xl font-black flex items-center gap-2">
                  <AlertCircle className="text-rose-500" size={20} />
                  بلاغات الدعم
                </CardTitle>
                <Badge className="bg-rose-50 text-rose-600 border-none font-bold">نشط</Badge>
              </CardHeader>
              <CardContent className="px-0 mt-6 space-y-4">
                {alerts.length > 0 ? (
                  alerts.map((alert, i) => (
                    <div key={i} className="flex gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:border-blue-200 transition-all cursor-pointer group">
                      <div className={cn(
                        'w-1.5 h-full rounded-full transition-all',
                        alert.status === 'open' ? 'bg-rose-500 group-hover:bg-rose-600' : 'bg-emerald-500'
                      )} />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-slate-800 truncate">{alert.description || alert.subject || `بلاغ #${alert.id.slice(0, 5)}`}</p>
                        <p className="text-[10px] text-slate-400 font-bold mt-1">
                          منذ 5 ساعات
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-10 opacity-30 font-bold">لا توجد بلاغات حالية</div>
                )}
                <Link to="/admin/support" className="block mt-4">
                  <Button variant="ghost" className="w-full h-12 rounded-xl text-blue-600 font-black hover:bg-blue-50 transition-all">
                    فتح مركز الدعم
                    <ChevronLeft size={16} className="mr-1" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

export default AdminDashboard;
