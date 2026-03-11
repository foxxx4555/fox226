import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/services/api';
import AppLayout from '@/components/AppLayout';
import StatCard from '@/components/StatCard';
import { Package, CheckCircle, Star, Truck, ArrowUpRight, TrendingUp, Bell as BellIcon, Wallet } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import { supabase } from '@/integrations/supabase/client';

export default function DriverDashboard() {
  const { t } = useTranslation();
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ activeLoads: 0, completedTrips: 0, rating: 0, bidsCount: 0 });
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [wallet, setWallet] = useState<any>(null);

  const fetchDriverData = async () => {
    if (!userProfile?.id) return;
    try {
      const [s, n, w] = await Promise.all([
        api.getDriverStats(userProfile.id),
        api.getNotifications(userProfile.id),
        api.getWalletBalance(userProfile.id, 'driver')
      ]);
      setStats(s);
      setNotifications(n.slice(0, 4));
      setWallet(w);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDriverData();

    const channel = supabase
      .channel('driver-dashboard')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'loads' },
        () => {
          console.log("⚡ تحديث لحظي للإحصائيات...");
          fetchDriverData();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userProfile?.id}` },
        () => {
          console.log("⚡ تحديث لحظي للإشعارات...");
          fetchDriverData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userProfile]);

  return (
    <AppLayout>
      <div className="space-y-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <h1 className="text-4xl font-black tracking-tight">مرحباً بك، {userProfile?.full_name} 👋</h1>
            <p className="text-muted-foreground font-medium text-lg mt-2">إليك ملخص نشاطك اليوم كباش مهندس نقل</p>
          </motion.div>

          <div className="flex items-center gap-3">
            <Button className="rounded-2xl h-14 px-8 font-black text-lg shadow-xl shadow-primary/20 bg-primary text-white" onClick={() => navigate('/driver/loads')}>
              إيجاد شحنة جديدة <ArrowUpRight className="ms-2" size={24} />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="عدد العروض المقدمة"
            value={stats.bidsCount}
            icon={<TrendingUp size={28} />}
            color="info"
          />
          <StatCard
            title="عدد الشحنات النشطة"
            value={stats.activeLoads}
            icon={<Package size={28} />}
            color="primary"
          />
          <StatCard
            title="إشعارات المرسلين"
            value={notifications.length}
            icon={<BellIcon size={28} />}
            color="warning"
          />

          <Card className="rounded-[2rem] shadow-xl border-none bg-gradient-to-br from-blue-600 to-blue-800 text-white p-6 relative overflow-hidden group cursor-pointer" onClick={() => navigate('/driver/statement')}>
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all"></div>
            <div className="flex justify-between items-center relative z-10">
              <div>
                <p className="text-blue-100 font-bold text-xs uppercase tracking-widest mb-1">المحفظة / الأرباح</p>
                <h3 className="text-3xl font-black">{wallet?.balance?.toLocaleString() || 0} <span className="text-sm font-bold opacity-60">ر.س</span></h3>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-white">
                <Wallet size={24} />
              </div>
            </div>
            <div className="mt-4 flex items-center text-xs font-bold text-blue-100 group-hover:gap-2 transition-all">
              عرض كشف الحساب والسحب <ArrowUpRight size={14} className="ms-1" />
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="lg:col-span-2 rounded-[2.5rem] border-none shadow-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white overflow-hidden relative group p-8">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 blur-[100px] -translate-y-1/2 translate-x-1/2 group-hover:bg-primary/30 transition-colors" />
            <CardHeader className="p-0 pb-8">
              <CardTitle className="text-2xl font-black flex items-center gap-3">
                <TrendingUp className="text-primary" />
                أداء الرحلات الأخيرة
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="space-y-6">
                {[
                  { label: 'الالتزام بالمواعيد', value: 98, color: 'bg-emerald-500' },
                  { label: 'سلامة الشحنات', value: 95, color: 'bg-blue-500' },
                  { label: 'تقييم العملاء', value: stats.rating * 20, color: 'bg-amber-500' },
                ].map((item, i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex justify-between text-sm font-bold opacity-80 uppercase tracking-widest">
                      <span>{item.label}</span>
                      <span>{item.value}%</span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${item.value}%` }}
                        transition={{ duration: 1, delay: i * 0.2 }}
                        className={cn("h-full rounded-full", item.color)}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-10 grid grid-cols-2 gap-4">
                <Button className="h-14 rounded-2xl bg-white/10 border border-white/20 text-white" onClick={() => navigate('/driver/statement')}>كشف الحساب</Button>
                <Button className="h-14 rounded-2xl bg-primary text-white font-black" onClick={() => navigate('/driver/history')}>سجل الرحلات</Button>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[2.5rem] shadow-2xl border-none bg-white p-8">
            <CardHeader className="p-0 pb-8">
              <CardTitle className="text-2xl font-black flex items-center gap-3">🔔 إشعارات المرسلين</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="space-y-4">
                {notifications.length > 0 ? (
                  notifications.map((n) => (
                    <div key={n.id} className="p-4 rounded-2xl bg-muted/20 border-r-4 border-primary">
                      <p className="font-black text-sm text-slate-800">{n.title}</p>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{n.message}</p>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 text-muted-foreground font-bold">لا توجد إشعارات جديدة</div>
                )}
                <Button variant="outline" className="w-full mt-4 rounded-xl font-black" onClick={() => navigate('/driver/support')}>مركز التنبيهات</Button>
              </div>

              <div className="mt-10 grid grid-cols-1 gap-4">
                <div className="p-6 rounded-[2rem] bg-accent/10 border border-accent/20">
                  <div className="flex items-center gap-4 mb-3">
                    <Truck className="text-accent" />
                    <span className="font-black">أسطول الشاحنات</span>
                  </div>
                  <p className="text-sm text-muted-foreground font-bold mb-4">أضف شاحنة جديدة لتحسين فرصك في الحصول على شحنات</p>
                  <Button variant="outline" className="w-full rounded-xl border-accent text-accent font-black" onClick={() => navigate('/driver/trucks')}>إضافة شاحنة</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
