import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/services/api';
import AppLayout from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Truck,
  MapPin,
  Navigation,
  CheckCircle2,
  Clock,
  PackageCheck,
  AlertCircle,
  Calendar,
  ChevronRight,
  ShieldCheck,
  Phone,
  Search,
  MessageCircle,
  Box
} from 'lucide-react';
import { toast } from 'sonner';

const ORDER_STEPS = [
  { id: 'created', label: 'تم إنشاء الطلب', icon: Clock, description: 'تم استلام طلبك بنجاح' },
  { id: 'pending', label: 'جاري البحث عن ناقل', icon: Search, description: 'يتم الآن عرض شحنتك على الناقلين' },
  { id: 'loading', label: 'جاري التحميل', icon: Box, description: 'السائق بدأ عملية تحميل البضاعة' },
  { id: 'in_progress', label: 'في الطريق', icon: Truck, description: 'الشحنة في طريقها إلى وجهة التسليم' },
  { id: 'delivered', label: 'تم التسليم بنجاح', icon: CheckCircle2, description: 'وصلت الشحنة وتم تأكيد الاستلام' },
];

export default function ShipperTrack() {
  const { userProfile } = useAuth();
  const [activeLoads, setActiveLoads] = useState<any[]>([]);
  const [selectedLoad, setSelectedLoad] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchActiveLoads = async () => {
    if (!userProfile?.id) return;
    try {
      const data = await api.getUserLoads(userProfile.id);
      // تصفية الشحنات النشطة فقط (ليست ملغاة)
      const filtered = data.filter((l: any) => l.status !== 'cancelled');
      setActiveLoads(filtered || []);
      if (filtered.length > 0 && !selectedLoad) {
        setSelectedLoad(filtered[0]);
      }
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveLoads();
    const interval = setInterval(fetchActiveLoads, 5000); // تحديث أسرع للتتبع
    return () => clearInterval(interval);
  }, [userProfile?.id]);

  const getStepIndex = (status: string) => {
    const indices: Record<string, number> = {
      'available': 1,
      'pending': 1,
      'assigned': 1,
      'loading': 2,
      'in_progress': 3,
      'completed': 4,
      'delivered': 4
    };
    // إذا كانت متاحة (available) ولم يبدأ البحث فعلياً (مؤقت)، نعتبرها في الخطوة 0 أو 1
    return indices[status] !== undefined ? indices[status] : 0;
  };

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-6 pb-20">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-4xl font-black mb-2 flex items-center gap-3 text-slate-900">
            <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center text-white shadow-lg shadow-primary/20">
              <Navigation size={28} />
            </div>
            تتبع شحناتك المباشرة
          </h1>
          <p className="text-slate-500 font-bold mr-14">تابع تحركات الناقلين وحالة بضائعك فوراً</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Sidebar: Load List */}
          <Card className="lg:col-span-1 border-none shadow-2xl bg-white/80 backdrop-blur-xl rounded-[2.5rem] overflow-hidden flex flex-col h-[750px] border border-white/20">
            <CardHeader className="bg-slate-900 p-8 sticky top-0 z-10">
              <CardTitle className="text-white text-xl font-black flex justify-between items-center">
                الشحنات النشطة
                <span className="bg-primary px-4 py-1.5 rounded-2xl text-sm font-black shadow-lg shadow-primary/30">
                  {activeLoads.length}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-y-auto custom-scrollbar">
              <div className="p-4 space-y-3">
                {activeLoads.length > 0 ? activeLoads.map((load) => (
                  <motion.div
                    key={load.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedLoad(load)}
                    className={`p-6 cursor-pointer rounded-3xl transition-all border-2 relative overflow-hidden group ${selectedLoad?.id === load.id
                      ? 'bg-slate-900 border-primary shadow-xl shadow-slate-200'
                      : 'bg-white border-slate-100 hover:border-primary/30'
                      }`}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className={`p-3 rounded-2xl ${selectedLoad?.id === load.id ? 'bg-white/10' : 'bg-slate-100'}`}>
                        <Box size={20} className={selectedLoad?.id === load.id ? 'text-white' : 'text-slate-600'} />
                      </div>
                      <Badge className={
                        load.status === 'completed' ? 'bg-emerald-500 hover:bg-emerald-500' :
                          load.status === 'in_progress' ? 'bg-blue-500 animate-pulse' : 'bg-amber-500'
                      }>
                        {ORDER_STEPS[getStepIndex(load.status)].label}
                      </Badge>
                    </div>

                    <p className={`font-black text-lg mb-1 ${selectedLoad?.id === load.id ? 'text-white' : 'text-slate-800'}`}>
                      {load.origin}
                    </p>
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`w-1 h-4 rounded-full ${selectedLoad?.id === load.id ? 'bg-white/30' : 'bg-slate-200'}`} />
                      <p className={`font-black text-lg ${selectedLoad?.id === load.id ? 'text-white' : 'text-slate-800'}`}>
                        {load.destination}
                      </p>
                    </div>

                    <div className="flex items-center justify-between mt-6 pt-4 border-t border-dashed border-slate-200/20">
                      <span className={`text-xs font-bold leading-none ${selectedLoad?.id === load.id ? 'text-slate-400' : 'text-slate-500'}`}>
                        قيمة الشحن
                      </span>
                      <span className={`text-lg font-black ${selectedLoad?.id === load.id ? 'text-primary' : 'text-slate-900'}`}>
                        {load.price} ر.س
                      </span>
                    </div>
                  </motion.div>
                )) : (
                  <div className="py-20 text-center opacity-40">
                    <Box size={60} className="mx-auto mb-4" />
                    <p className="font-black text-lg">لا توجد رحلات نشطة</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Main: Tracking Detail */}
          <div className="lg:col-span-2 space-y-6 flex flex-col">
            {selectedLoad ? (
              <>
                {/* Timeline Card */}
                <Card className="rounded-[2rem] border-none shadow-xl bg-white overflow-hidden">
                  <div className="bg-slate-900 p-6 text-white flex justify-between items-center">
                    <h3 className="text-lg font-black">متابعة حالة الطلب</h3>
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                      <Calendar size={14} /> موعد التسليم المتوقع: خلال 24 ساعة
                    </div>
                  </div>
                  <CardContent className="p-10">
                    <div className="relative flex justify-between items-center px-4">
                      {/* Progress Line Background */}
                      <div className="absolute top-1/2 left-10 right-10 h-[2px] bg-slate-100 -translate-y-1/2 z-0"></div>

                      {/* Active Progress Line */}
                      <motion.div
                        className="absolute top-1/2 right-10 h-[2px] bg-primary -translate-y-1/2 z-0"
                        initial={{ width: 0 }}
                        animate={{ width: `${(getStepIndex(selectedLoad.status) / 4) * 100}%` }}
                        transition={{ duration: 0.7, ease: "easeOut" }}
                        aria-hidden="true"
                      />

                      {ORDER_STEPS.map((step, index) => {
                        const isCompleted = index <= getStepIndex(selectedLoad.status);
                        const isCurrent = index === getStepIndex(selectedLoad.status);
                        const Icon = step.icon;

                        return (
                          <div key={step.id} className="relative z-10 flex flex-col items-center gap-4">
                            <motion.div
                              initial={{ scale: 0.8 }}
                              animate={{
                                scale: isCurrent ? 1.3 : 1,
                                boxShadow: isCurrent ? '0 0 20px rgba(59, 130, 246, 0.4)' : 'none'
                              }}
                              className={`w-14 h-14 rounded-[1.25rem] flex items-center justify-center border-4 border-white shadow-lg transition-all duration-500 ${isCompleted ? 'bg-primary text-white' : 'bg-slate-100 text-slate-400'
                                }`}
                            >
                              <Icon size={24} />
                            </motion.div>
                            <div className="text-center w-24">
                              <p className={`text-xs font-black ${isCompleted ? 'text-slate-900' : 'text-slate-400'}`}>
                                {step.label}
                              </p>
                              {isCurrent && (
                                <motion.p
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  className="text-[9px] font-bold text-primary mt-1 leading-tight"
                                >
                                  {step.description}
                                </motion.p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Map Section */}
                <Card className="rounded-[2.5rem] border-none shadow-2xl bg-white overflow-hidden flex-1 min-h-[450px] flex flex-col group relative border border-white">
                  <div className="absolute top-6 left-6 right-6 z-20 flex justify-between items-center pointer-events-none">
                    <div className="bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-white pointer-events-auto">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-rose-500 rounded-xl flex items-center justify-center text-white">
                          <MapPin size={20} />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase">الموقع الحالي</p>
                          <p className="text-sm font-black text-slate-800">{selectedLoad.destination}</p>
                        </div>
                      </div>
                    </div>
                    {selectedLoad.driver && (
                      <div className="flex gap-2 pointer-events-auto">
                        <Button size="icon" className="w-12 h-12 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg">
                          <Phone size={20} />
                        </Button>
                        <Button size="icon" className="w-12 h-12 rounded-2xl bg-blue-500 hover:bg-blue-600 text-white shadow-lg">
                          <MessageCircle size={20} />
                        </Button>
                      </div>
                    )}
                  </div>

                  <CardContent className="p-0 flex-1 relative bg-slate-50">
                    {/* Placeholder for Maps */}
                    <div className="absolute inset-0 bg-[#f8fafc] flex items-center justify-center p-12 overflow-hidden">
                      <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#3b82f6_1.5px,transparent_0)] bg-[length:30px_30px]" />
                      <div className="relative text-center max-w-sm">
                        <div className="w-32 h-32 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                          <Truck size={64} className="text-primary animate-bounce" />
                        </div>
                        <h4 className="text-2xl font-black text-slate-800 mb-2">رادار تتبع الشحنة</h4>
                        <p className="text-sm font-bold text-slate-500 leading-relaxed">
                          {['in_progress', 'completed'].includes(selectedLoad.status)
                            ? 'بيانات التتبع والموقع متاحة الآن. يمكنك فتح خرائط جوجل لمتابعة الإحداثيات.'
                            : 'بيانات التتبع ستظهر فور تحرك الشحنة وبدء الرحلة.'}
                        </p>
                        {selectedLoad.driver && ['in_progress', 'completed'].includes(selectedLoad.status) && (
                          <Button
                            variant="outline"
                            className="mt-8 h-12 px-8 rounded-2xl border-2 border-primary text-primary font-black hover:bg-primary hover:text-white transition-all"
                            onClick={() => window.open(`https://www.google.com/maps?q=${selectedLoad.driver.latitude || 24.7136},${selectedLoad.driver.longitude || 46.6753}`, '_blank')}
                          >
                            فتح التتبع في خرائط جوجل
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <div className="h-full flex items-center justify-center bg-white/50 backdrop-blur-sm rounded-[3rem] border-2 border-dashed border-slate-200">
                <div className="text-center">
                  <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Navigation size={48} className="text-slate-300 opacity-50" />
                  </div>
                  <p className="text-xl font-black text-slate-500">اختر طلبك لمتابعة المسار</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
