import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/services/api';
import AppLayout from '@/components/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, MapPin, Phone, MessageCircle, X, CheckCircle2, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';

export default function DriverTasks() {
  const { userProfile } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = async () => {
    if (!userProfile?.id) return;
    try {
      // جلب كل شحنات السائق
      const data = await api.getUserLoads(userProfile.id);
      // فلترة الشحنات اللي "قيد التنفيذ" فقط
      const activeTasks = data.filter((l: any) => l.status === 'in_progress');
      setTasks(activeTasks);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
    // تحديث لحظي لو الحالة اتغيرت
    const channel = supabase.channel('driver-tasks-sync')
      .on('postgres_changes', { event: '*', table: 'loads' }, () => fetchTasks())
      .subscribe();
    
    return () => { supabase.removeChannel(channel); };
  }, [userProfile?.id]);

  const handleComplete = async (id: string) => {
    if (!confirm("هل تم تسليم الشحنة بنجاح؟")) return;
    try {
      await api.completeLoad(id);
      toast.success("تم إنهاء الرحلة بنجاح 🏁");
      fetchTasks();
    } catch (e) { toast.error("فشل التحديث"); }
  };

  const handleCancel = async (id: string) => {
    if (!confirm("هل تريد إلغاء المهمة وإعادتها للسوق العام؟")) return;
    try {
      await api.cancelLoad(id);
      toast.info("تم إلغاء المهمة");
      fetchTasks();
    } catch (e) { toast.error("فشل الإلغاء"); }
  };

  return (
    <AppLayout>
      <div className="space-y-8 max-w-4xl mx-auto pb-20">
        <h1 className="text-3xl font-black text-slate-900 text-right">مهامي الحالية</h1>
        
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-blue-600" size={48} />
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-[3rem] border-2 border-dashed border-slate-200 text-slate-400 font-bold">
            <Clock size={64} className="mx-auto mb-4 opacity-20" />
            <p>لا توجد مهام نشطة حالياً</p>
            <p className="text-sm font-medium mt-2">اذهب لصفحة "البحث عن عمل" لقبول شحنة جديدة</p>
          </div>
        ) : (
          <div className="grid gap-6">
            <AnimatePresence>
              {tasks.map((task) => (
                <motion.div key={task.id} layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}>
                  <Card className="rounded-[2.5rem] border-none shadow-xl bg-white overflow-hidden relative border-r-8 border-r-emerald-500">
                    <Button 
                      variant="ghost" size="icon" 
                      className="absolute top-4 left-4 h-10 w-10 rounded-full bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white" 
                      onClick={() => handleCancel(task.id)}
                    >
                      <X size={20} />
                    </Button>
                    <CardContent className="p-8">
                      <div className="flex flex-col md:flex-row justify-between gap-8">
                        <div className="flex-1 space-y-6">
                          <div className="flex items-center gap-4 justify-end">
                            <p className="font-black text-xl">{task.origin}</p>
                            <div className="flex-1 h-px bg-blue-100 relative min-w-[60px]">
                              <MapPin size={16} className="absolute inset-0 m-auto text-blue-600 bg-white" />
                            </div>
                            <p className="font-black text-xl">{task.destination}</p>
                          </div>
                          
                          <div className="bg-slate-50 p-4 rounded-2xl flex justify-between items-center">
                             <div>
                               <p className="text-[10px] font-black text-slate-400 uppercase">صاحب الشحنة</p>
                               <p className="font-black text-slate-700">{task.owner?.full_name || 'غير متوفر'}</p>
                             </div>
                             <div className="flex gap-2">
                                <Button size="icon" className="rounded-full bg-blue-600 h-10 w-10" onClick={() => window.location.href=`tel:${task.owner?.phone}`}><Phone size={18}/></Button>
                                <Button size="icon" className="rounded-full bg-emerald-500 h-10 w-10" onClick={() => window.open(`https://wa.me/966${task.owner?.phone?.substring(1)}`, '_blank')}><MessageCircle size={18}/></Button>
                             </div>
                          </div>
                        </div>
                        
                        <div className="md:w-56 flex flex-col gap-3 justify-center md:border-r md:pr-6 text-center">
                           <p className="text-3xl font-black text-blue-600">{task.price} <span className="text-sm">ريال</span></p>
                           <Button onClick={() => handleComplete(task.id)} className="w-full h-14 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-lg gap-2 shadow-lg shadow-emerald-100">
                             <CheckCircle2 size={22} /> إنهاء الرحلة
                           </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
