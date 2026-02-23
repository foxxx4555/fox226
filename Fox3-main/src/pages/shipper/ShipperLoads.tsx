import { useState, useEffect } from 'react';
import { api } from '@/services/api';
import { useAuth } from '@/hooks/useAuth';
import AppLayout from '@/components/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, MapPin, Package, Clock, Truck, Navigation, Trash2, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export default function ShipperLoads() {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const [activeLoads, setActiveLoads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLoads = async () => {
    if (userProfile?.id) {
      try {
        const data = await api.getUserLoads(userProfile.id);
        const active = data.filter((l: any) => ['pending', 'in_progress'].includes(l.status));
        setActiveLoads(active);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchLoads();

    // Realtime updates
    const channel = supabase.channel('shipper_active_loads')
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'loads', filter: `shipper_id=eq.${userProfile?.id}` }, fetchLoads)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userProfile]);

  const handleCancelLoad = async (id: string, currentStatus: string) => {
    if (confirm("هل أنت متأكد من رغبتك في إلغاء هذه الشحنة؟")) {
      try {
        await supabase.from('loads').update({ status: 'cancelled' }).eq('id', id);
        toast.success("تم إلغاء الشحنة");
        fetchLoads();
      } catch (e) {
        toast.error("حدث خطأ أثناء الإلغاء");
      }
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <div className="flex items-center gap-2 bg-amber-100 text-amber-700 px-4 py-2 rounded-full font-bold text-sm"><Clock size={16} /> بانتظار العروض</div>;
      // تم إزالة حالة accepted لأنها غير موجودة بالـ Enum
      case 'in_progress':
        return <div className="flex items-center gap-2 bg-emerald-100 text-emerald-700 px-4 py-2 rounded-full font-bold text-sm"><Truck size={16} /> قيد التوصيل</div>;
      default:
        return null;
    }
  };

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-2xl text-primary"><Package size={32} /></div>
            <div>
              <h1 className="text-4xl font-black tracking-tight">الطلبات الحالية (شحناتي)</h1>
              <p className="text-muted-foreground font-medium mt-1">تابع شحناتك النشطة وتواصل مع السائقين</p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-32"><Loader2 className="animate-spin text-primary" size={48} /></div>
        ) : activeLoads.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-[3rem] border-2 border-dashed border-muted shadow-sm flex flex-col items-center justify-center">
            <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6">
              <Package size={40} className="text-slate-300" />
            </div>
            <p className="text-xl font-black text-slate-700">لا توجد شحنات نشطة حالياً</p>
            <p className="text-slate-500 mt-2 font-medium">ابدأ بإضافة شحنة جديدة لعرضها هنا</p>
            <Button onClick={() => navigate('/shipper/post')} className="mt-6 bg-primary font-bold h-12 px-8 rounded-xl shadow-lg hover:bg-primary/90 text-white">إضافة شحنة الان</Button>
          </div>
        ) : (
          <div className="grid gap-6">
            {activeLoads.map(load => (
              <Card key={load.id} className="rounded-[2rem] border-none shadow-sm hover:shadow-xl transition-all bg-white overflow-hidden">
                <CardContent className="p-0">
                  <div className="p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-slate-50">
                    <div className="flex flex-col gap-3">
                      <div className="flex flex-wrap items-center gap-3 mb-2">
                        {getStatusBadge(load.status)}
                        <span className="font-bold text-xs text-slate-400">رقم: #{load.id.substring(0, 8).toUpperCase()}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-black text-xl md:text-2xl text-slate-800 flex items-center gap-2"><MapPin className="text-primary" size={20} /> {load.origin}</span>
                        <div className="h-px bg-slate-300 w-6 md:w-16"></div>
                        <span className="font-black text-xl md:text-2xl text-slate-800 flex items-center gap-2"><MapPin className="text-emerald-500" size={20} /> {load.destination}</span>
                      </div>
                    </div>
                    <div className="text-right bg-slate-50 p-4 md:p-6 rounded-2xl w-full md:w-auto">
                      <p className="text-sm font-bold text-slate-400 mb-1">المبلغ المعروض</p>
                      <p className="font-black text-3xl text-emerald-500">{load.price} <span className="text-lg">ر.س</span></p>
                    </div>
                  </div>

                  <div className="p-6 md:px-8 bg-white flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex flex-wrap gap-4 md:gap-6 text-sm font-bold text-slate-600 bg-slate-50 p-3 rounded-xl w-full md:w-auto">
                      <span className="bg-white px-3 py-1 rounded-md shadow-sm">الوزن: {load.weight} طن</span>
                      <span className="bg-white px-3 py-1 rounded-md shadow-sm">البضاعة: {load.package_type || 'غير محدد'}</span>
                    </div>
                    <div className="flex w-full md:w-auto gap-3">
                      {load.status === 'pending' && (
                        <Button onClick={() => handleCancelLoad(load.id, load.status)} variant="outline" className="flex-1 md:flex-none h-12 rounded-xl font-bold border-rose-200 text-rose-500 hover:bg-rose-50 hover:border-rose-300">
                          <Trash2 size={18} className="me-2" /> إلغاء الشحنة
                        </Button>
                      )}
                      {load.status !== 'pending' && (
                        <Button onClick={() => navigate('/shipper/track')} className="flex-1 md:flex-none h-12 rounded-xl font-bold bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20">
                          <Navigation size={18} className="me-2" /> تتبع السائق
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
