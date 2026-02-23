import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/services/api';
import AppLayout from '@/components/AppLayout';
import StatCard from '@/components/StatCard';
import { Package, CheckCircle, Star, Truck, ArrowUpRight, TrendingUp } from 'lucide-react';
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
  const [stats, setStats] = useState({ activeLoads: 0, completedTrips: 0, rating: 0 });

  const fetchDriverData = async () => {
    if (!userProfile?.id) return;
    try {
      const s = await api.getDriverStats(userProfile.id);
      setStats(s);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchDriverData();

    const channel = supabase
      .channel('driver-dashboard')
      .on('postgres_changes', { event: '*', table: 'loads', schema: 'public' }, () => fetchDriverData())
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
            <h1 className="text-4xl font-black tracking-tight">{t('welcome')}، {userProfile?.full_name} 👋</h1>
            <p className="text-muted-foreground font-medium text-lg mt-2">إليك ملخص نشاطك اليوم كباش مهندس نقل</p>
          </motion.div>

          <div className="flex items-center gap-3">
            <Button className="rounded-2xl h-12 px-6 font-bold shadow-lg shadow-primary/20" onClick={() => navigate('/driver/loads')}>
              إيجاد شحنة جديدة <ArrowUpRight className="ms-2" size={18} />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard
            title={t('active_loads')}
            value={stats.activeLoads}
            icon={<Package size={28} />}
            color="primary"
            trend={{ value: "12%", isPositive: true }}
          />
          <StatCard
            title={t('completed_trips')}
            value={stats.completedTrips}
            icon={<CheckCircle size={28} />}
            color="accent"
            trend={{ value: "5%", isPositive: true }}
          />
          <StatCard
            title={t('rating')}
            value={stats.rating}
            icon={<Star size={28} />}
            color="secondary"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="rounded-[2.5rem] border-none shadow-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white overflow-hidden relative group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 blur-[100px] -translate-y-1/2 translate-x-1/2 group-hover:bg-primary/30 transition-colors" />
            <CardHeader className="p-8 pb-4">
              <CardTitle className="text-2xl font-black flex items-center gap-3">
                <TrendingUp className="text-primary" />
                أداء الرحلات الأخيرة
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 pt-0">
              <div className="space-y-6 mt-6">
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
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <Card className="cursor-pointer group hover:bg-primary hover:text-white transition-all duration-300 rounded-[2.5rem] border-2 border-primary/10 shadow-xl overflow-hidden" onClick={() => navigate('/driver/loads')}>
              <CardContent className="flex flex-col gap-6 p-8">
                <div className="p-4 rounded-3xl bg-primary/10 group-hover:bg-white/20 w-fit transition-colors">
                  <Package size={32} className="text-primary group-hover:text-white" />
                </div>
                <div>
                  <p className="text-2xl font-black">{t('available_loads')}</p>
                  <p className="text-sm font-medium opacity-60 group-hover:opacity-80">تصفح وجد أفضل الشحنات لرحلتك القادمة</p>
                </div>
              </CardContent>
            </Card>

            <Card className="cursor-pointer group hover:bg-accent hover:text-white transition-all duration-300 rounded-[2.5rem] border-2 border-accent/10 shadow-xl overflow-hidden" onClick={() => navigate('/driver/trucks')}>
              <CardContent className="flex flex-col gap-6 p-8">
                <div className="p-4 rounded-3xl bg-accent/10 group-hover:bg-white/20 w-fit transition-colors">
                  <Truck size={32} className="text-accent group-hover:text-white" />
                </div>
                <div>
                  <p className="text-2xl font-black">{t('my_trucks')}</p>
                  <p className="text-sm font-medium opacity-60 group-hover:opacity-80">أضف ونظم شاحناتك وأسطولك الخاص</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
