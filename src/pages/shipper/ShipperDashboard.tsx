import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/services/api';
import AppLayout from '@/components/AppLayout';
import StatCard from '@/components/StatCard';
import { Package, CheckCircle, Plus, Search, MapPin, Loader2, ArrowRight, Users, Trash2, Wallet, CreditCard } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
  const [stats, setStats] = useState({ activeLoads: 0, completedTrips: 0, pendingLoads: 0, cancelledLoads: 0 });
  const [recentLoads, setRecentLoads] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [wallet, setWallet] = useState<any>(null);

  const handleResetAccount = async () => {
    if (!confirm("تنبيه: سيتم حذف كافة الشحنات والعمليات بصفة نهائية. هل أنت متأكد؟")) return;
    setLoading(true);
    try {
      await api.deleteAllUserLoads(userProfile.id);
      toast.success("تم تصفية الحساب بنجاح");
      fetchDashboardData();
    } catch (err) {
      console.error(err);
      toast.error("حدث خطأ أثناء التصفية");
    } finally {
      setLoading(false);
    }
  };

  const fetchDashboardData = async () => {
    if (!userProfile?.id) return;
    try {
      const [s, l, n, w] = await Promise.all([
        api.getShipperStats(userProfile.id),
        api.getUserLoads(userProfile.id),
        api.getNotifications(userProfile.id),
        api.getWalletBalance(userProfile.id, 'shipper')
      ]);
      setStats(s);
      setRecentLoads(l.slice(0, 3));
      setNotifications(n.slice(0, 4));
      setWallet(w);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchDashboardData();
    const channel = supabase.channel('shipper-dash')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'loads', filter: `owner_id=eq.${userProfile?.id}` },
        () => {
          console.log("⚡ تحديث لحظي للإحصائيات والشحنات...");
          fetchDashboardData();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userProfile?.id}` },
        () => {
          console.log("⚡ تحديث لحظي للإشعارات...");
          fetchDashboardData();
        }
      )
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
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="rounded-2xl h-14 px-6 border-rose-200 text-rose-600 hover:bg-rose-50 font-black"
              onClick={handleResetAccount}
            >
              <Trash2 className="me-2" size={20} /> تصفية الحساب
            </Button>
            <Button className="rounded-2xl h-14 px-8 font-black text-lg bg-primary shadow-xl text-white" onClick={() => navigate('/shipper/post')}>
              <Plus className="me-2" size={24} /> نشر شحنة
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <StatCard title="قيد التنفيذ" value={stats.activeLoads} icon={<Package size={24} />} color="primary" />
          <StatCard title="مكتملة" value={stats.completedTrips} icon={<CheckCircle size={24} />} color="success" />

          <Card className="rounded-[2rem] shadow-xl border-none bg-gradient-to-br from-slate-900 to-slate-800 text-white p-6 relative overflow-hidden group cursor-pointer" onClick={() => navigate('/shipper/statement')}>
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl group-hover:bg-primary/20 transition-all"></div>
            <div className="flex justify-between items-center relative z-10">
              <div>
                <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-1">المحفظة / المديونية</p>
                <h3 className="text-3xl font-black">{wallet?.balance?.toLocaleString() || 0} <span className="text-sm font-bold opacity-60">ر.س</span></h3>
              </div>
              <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-primary">
                <Wallet size={24} />
              </div>
            </div>
            <div className="mt-4 flex items-center text-xs font-bold text-primary group-hover:gap-2 transition-all">
              عرض كشف الحساب والفواتير <ArrowRight size={14} className="ms-1" />
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
                    <div key={load.id} className="flex justify-between items-center p-6 rounded-[2rem] bg-muted/30 border-2 border-transparent hover:border-primary/20 transition-all cursor-pointer" onClick={() => navigate('/shipper/track')}>
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

          <Card className="rounded-[2.5rem] shadow-2xl border-none bg-white p-8">
            <CardHeader className="px-0 pt-0">
              <CardTitle className="text-2xl font-black flex items-center gap-3">🔔 الإشعارات الحديثة</CardTitle>
            </CardHeader>
            <CardContent className="px-0">
              <div className="space-y-4 text-slate-700">
                {notifications.length > 0 ? (
                  notifications.map((n) => (
                    <div key={n.id} className="p-4 rounded-2xl bg-muted/20 border-r-4 border-primary">
                      <p className="font-black text-sm">{n.title}</p>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{n.message}</p>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-10 text-muted-foreground">لا توجد إشعارات حالية</div>
                )}
                <Button variant="outline" className="w-full mt-4 rounded-xl font-bold" onClick={() => navigate('/shipper/bids')}>عرض كل العروض</Button>
              </div>

              <div className="mt-8 pt-8 border-t border-slate-100">
                <Button className="w-full h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-700 text-white font-black shadow-xl" onClick={() => navigate('/shipper/post')}>
                  + نشر شحنة جديدة
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
