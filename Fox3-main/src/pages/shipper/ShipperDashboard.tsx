import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/services/api';
import AppLayout from '@/components/AppLayout';
import StatCard from '@/components/StatCard';
import { Package, CheckCircle, Plus, Search, MapPin, Loader2, ArrowRight, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';

// قاموس ثابت لترجمة الحالات عشان نمنع خطأ "t is not defined"
const statusTranslations: Record<string, string> = {
  available: 'متاحة',
  pending: 'معلقة',
  in_progress: 'قيد التنفيذ',
  completed: 'مكتملة',
  cancelled: 'ملغاة',
};

export default function ShipperDashboard() {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ activeLoads: 0, completedTrips: 0 });
  const [recentLoads, setRecentLoads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    if (!userProfile?.id) return;
    try {
      const [s, l] = await Promise.all([
        api.getShipperStats(userProfile.id),
        api.getUserLoads(userProfile.id)
      ]);
      setStats(s);
      setRecentLoads(l.slice(0, 3));
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchDashboardData();
    const channel = supabase.channel('shipper-dash')
      .on('postgres_changes' as any, { event: '*', table: 'loads' }, () => fetchDashboardData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userProfile]);

  return (
    <AppLayout>
      <div className="space-y-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <h1 className="text-4xl font-black tracking-tight">مرحباً بك، {userProfile?.full_name} ✨</h1>
            <p className="text-muted-foreground font-medium text-lg mt-2">نظم شحناتك وراقب أعمالك بكل سهولة وذكاء</p>
          </motion.div>
          <Button className="rounded-2xl h-14 px-8 font-black text-lg bg-primary shadow-xl text-white" onClick={() => navigate('/shipper/post')}>
            <Plus className="me-2" size={24} /> نشر شحنة
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <StatCard title="الشحنات النشطة" value={stats.activeLoads} icon={<Package size={28} />} color="primary" />
          <StatCard title="الرحلات المكتملة" value={stats.completedTrips} icon={<CheckCircle size={28} />} color="accent" />

          <Card className="rounded-[2.5rem] bg-gradient-to-tr from-blue-600 to-indigo-700 text-white shadow-2xl border-none p-8 relative overflow-hidden group">
            <div className="relative z-10 flex flex-col justify-between h-full">
              <div>
                <p className="text-sm font-bold opacity-60 uppercase">تتبع سريع</p>
                <p className="text-xl font-black">ابحث عن شحنتك برقم البوليصة</p>
              </div>
              <div className="relative mt-4">
                <Search className="absolute end-4 top-1/2 -translate-y-1/2 opacity-50" size={18} />
                <input type="text" placeholder="رقم الشحنة..." className="w-full h-12 rounded-xl bg-white/10 border border-white/20 px-4 focus:outline-none font-bold placeholder:text-white/50" />
              </div>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="lg:col-span-2 rounded-[2.5rem] shadow-2xl border-none p-8 bg-white">
            <CardHeader className="px-0 pt-0 flex flex-row items-center justify-between pb-8">
              <CardTitle className="text-2xl font-black">آخر الشحنات</CardTitle>
              <Button variant="ghost" className="font-black text-primary" onClick={() => navigate('/shipper/history')}>
                عرض سجل الشحنات <ArrowRight className="ms-2" size={18} />
              </Button>
            </CardHeader>
            <CardContent className="px-0">
              <div className="space-y-4">
                {loading ? (
                  <div className="flex justify-center py-10"><Loader2 className="animate-spin text-primary" size={40} /></div>
                ) : recentLoads.length > 0 ? (
                  recentLoads.map((load) => (
                    <div key={load.id} className="flex justify-between items-center p-6 rounded-[2rem] bg-muted/30 border-2 border-transparent hover:border-primary/20 transition-all">
                      <div className="flex items-center gap-5">
                        <div className="w-12 h-12 rounded-xl bg-white shadow-md flex items-center justify-center text-primary"><Package size={24} /></div>
                        <div>
                          <p className="font-black text-lg text-slate-800">{load.origin} ← {load.destination}</p>
                          <p className="text-xs text-muted-foreground font-bold">{statusTranslations[load.status] || load.status}</p>
                        </div>
                      </div>
                      <div className="text-end">
                        <p className="font-black text-primary text-xl">{load.price} ر.س</p>
                        <Badge variant="outline" className="text-[10px] font-bold">{statusTranslations[load.status] || load.status}</Badge>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 bg-muted/10 rounded-[2rem] border-2 border-dashed font-bold text-muted-foreground">لا توجد بيانات حالية</div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[2.5rem] shadow-2xl border-none bg-emerald-500 text-white p-8 relative overflow-hidden">
            <div className="absolute bottom-0 left-0 w-full h-1/2 bg-white/5 skew-y-12 translate-y-20" />
            <CardHeader className="px-0 pt-0 relative z-10">
              <CardTitle className="text-2xl font-black flex items-center gap-3"><Users size={28} /> إدارة السائقين</CardTitle>
            </CardHeader>
            <CardContent className="px-0 relative z-10">
              <p className="font-medium text-white/80 leading-relaxed mb-8">تابع السائقين المسجلين في برنامجك أو أرسل دعوات انضمام لسائقين جدد.</p>
              <div className="space-y-4">
                <Button className="w-full h-14 rounded-2xl bg-white text-emerald-600 hover:bg-white/90 font-black shadow-xl">+ دعوة سائق جديد</Button>
                <Button variant="ghost" className="w-full h-14 rounded-2xl border-2 border-white/20 text-white font-black" onClick={() => navigate('/shipper/drivers')}>إدارة السائقين</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
