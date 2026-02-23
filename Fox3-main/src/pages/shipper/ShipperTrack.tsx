import { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { MapPin, Truck, Navigation, CheckCircle2, Clock, PackageCheck, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

const steps = [
  { id: 'pending', label: 'بانتظار سائق', icon: Clock },
  { id: 'in_progress', label: 'جاري التوصيل', icon: Truck },
  { id: 'delivered', label: 'تم التسليم', icon: PackageCheck },
];

export default function ShipperTrack() {
  const [activeLoads, setActiveLoads] = useState<any[]>([]);
  const [selectedLoad, setSelectedLoad] = useState<any | null>(null);

  useEffect(() => {
    const fetchActiveLoads = async () => {
      const { data } = await supabase
        .from('loads')
        .select(`*, driver:profiles!loads_driver_id_fkey(*)`)
        .in('status', ['pending', 'in_progress', 'completed']) // include completed momentarily for demo
        .order('created_at', { ascending: false });

      setActiveLoads(data || []);
      if (data && data.length > 0 && !selectedLoad) {
        setSelectedLoad(data[0]);
      }
    };

    fetchActiveLoads();

    const channel = supabase.channel('tracking')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'loads' }, fetchActiveLoads)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, fetchActiveLoads)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const getStepIndex = (status: string) => {
    switch (status) {
      case 'pending': return 0;
      case 'in_progress': return 1;
      case 'completed':
      case 'delivered': return 2;
      default: return 0;
    }
  };

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-black mb-2 flex items-center gap-3">
            <Navigation className="text-primary" size={32} /> تتبع حالة الشحنة
          </h1>
          <p className="text-muted-foreground font-medium">تابع مسار شحناتك الحالية لحظة بلحظة</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1 rounded-[2rem] border-none shadow-xl bg-white overflow-hidden flex flex-col h-[600px]">
            <CardHeader className="bg-slate-50 border-b border-slate-100 p-6 sticky top-0 z-10">
              <CardTitle className="text-lg font-black flex justify-between items-center">
                الشحنات الجارية
                <span className="bg-primary text-white text-xs px-3 py-1 rounded-full">{activeLoads.length}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-y-auto">
              <div className="divide-y divide-slate-100">
                {activeLoads.length > 0 ? activeLoads.map((load) => (
                  <div
                    key={load.id}
                    onClick={() => setSelectedLoad(load)}
                    className={`p-5 cursor-pointer transition-colors border-l-4 ${selectedLoad?.id === load.id ? 'bg-blue-50/50 border-primary' : 'hover:bg-slate-50 border-transparent'}`}
                  >
                    <p className="font-black text-slate-800 text-base">{load.origin} ← {load.destination}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className={`text-xs font-bold px-2 py-1 rounded-md ${load.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                        load.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                        {steps[getStepIndex(load.status)].label}
                      </span>
                      <span className="text-xs font-bold text-slate-500">{load.price} ر.س</span>
                    </div>
                  </div>
                )) : (
                  <div className="p-10 text-center text-slate-500">
                    <AlertCircle size={40} className="mx-auto text-slate-300 mb-3" />
                    <p className="font-bold">لا توجد شحنات جارية</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="lg:col-span-2 space-y-6 flex flex-col">
            {selectedLoad ? (
              <>
                <Card className="rounded-[2rem] border-none shadow-xl bg-white">
                  <CardContent className="p-8">
                    <h3 className="text-xl font-black mb-6">مراحل التوصيل</h3>
                    <div className="relative flex justify-between items-center">
                      <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-100 -translate-y-1/2 z-0 rounded-full"></div>
                      <div
                        className={`absolute top-1/2 right-0 h-1 bg-primary -translate-y-1/2 z-0 rounded-full transition-all duration-500 ${getStepIndex(selectedLoad.status) === 0 ? 'w-0' :
                            getStepIndex(selectedLoad.status) === 1 ? 'w-1/2' :
                              'w-full'
                          }`}
                      ></div>

                      {steps.map((step, index) => {
                        const isCompleted = index <= getStepIndex(selectedLoad.status);
                        const isCurrent = index === getStepIndex(selectedLoad.status);
                        const Icon = step.icon;

                        return (
                          <div key={step.id} className="relative z-10 flex flex-col items-center gap-2">
                            <motion.div
                              initial={{ scale: 0.8 }}
                              animate={{ scale: isCurrent ? 1.2 : 1 }}
                              className={`w-12 h-12 rounded-full flex items-center justify-center border-4 border-white shadow-sm transition-colors ${isCompleted ? 'bg-primary text-white' : 'bg-slate-200 text-slate-400'
                                }`}
                            >
                              <Icon size={20} />
                            </motion.div>
                            <span className={`text-xs font-bold ${isCompleted ? 'text-slate-800' : 'text-slate-400'}`}>
                              {step.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-[2rem] border-none shadow-xl bg-white overflow-hidden flex-1 min-h-[400px] flex flex-col">
                  <CardHeader className="p-6 border-b border-slate-100 bg-slate-50 flex flex-row items-center justify-between sticky top-0 z-10">
                    <CardTitle className="text-lg font-black flex items-center gap-2">
                      <MapPin className="text-rose-500" size={24} /> التتبع المباشر (GPS)
                    </CardTitle>
                    {selectedLoad.driver && selectedLoad.status === 'in_progress' && (
                      <Button
                        onClick={() => window.open(`https://www.google.com/maps?q=${selectedLoad.driver.latitude},${selectedLoad.driver.longitude}`, '_blank')}
                        className="bg-emerald-600 hover:bg-emerald-700 font-bold h-10 px-4 rounded-xl shadow-md text-white"
                      >
                        فتح في مرشد جوجل
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent className="p-0 flex-1 relative bg-slate-100">
                    {/* Placeholder for actual Maps integration */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center opacity-80 pointer-events-none p-6 text-center">
                      <div className="w-full max-w-md aspect-video bg-white/50 backdrop-blur-sm rounded-3xl border-2 border-white shadow-2xl flex flex-col items-center justify-center p-6 mb-8 transform -rotate-2">
                        <MapPin size={48} className="text-primary mb-4 animate-bounce" />
                        <h4 className="text-xl font-black text-slate-800">خريطة تفاعلية</h4>
                        <p className="text-sm font-bold text-slate-500 mt-2">(سيتم ربطها بـ Google Maps API لعرض مسار الشاحنة)</p>
                      </div>
                    </div>

                    {/* Info Overlay */}
                    <div className="absolute bottom-6 left-6 right-6 bg-white/90 backdrop-blur-md p-6 rounded-3xl shadow-xl border border-white flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">السائق المكلف</p>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary font-black">
                            {selectedLoad.driver?.full_name?.charAt(0) || <Truck size={18} />}
                          </div>
                          <p className="font-black text-slate-800 text-lg">{selectedLoad.driver?.full_name || 'جاري البحث عن سائق'}</p>
                        </div>
                      </div>
                      <div className="hidden md:block w-px h-12 bg-slate-200"></div>
                      <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">تاريخ الإنشاء</p>
                        <p className="font-black text-slate-800">{new Date(selectedLoad.created_at).toLocaleDateString('ar-SA')}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <div className="h-full flex items-center justify-center bg-white rounded-[2rem] shadow-xl border-none p-10">
                <div className="text-center text-slate-400">
                  <Navigation size={64} className="mx-auto mb-4 opacity-30" />
                  <p className="text-xl font-black text-slate-500">اختر شحنة من القائمة لعرض تفاصيل التتبع</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
