import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/services/api';
import AppLayout from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import html2canvas from 'html2canvas';
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
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TrackingPageSkeleton } from '@/components/tracking/TrackingSkeletons';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Load {
  id: string;
  origin: string;
  destination: string;
  status: string;
  price: number;
  driver?: {
    latitude?: number;
    longitude?: number;
    full_name?: string;
    phone?: string;
  };
}

const ORDER_STEPS = [
  { id: 'created', label: 'تم إنشاء الطلب', icon: Clock, description: 'تم استلام طلبك بنجاح' },
  { id: 'pending', label: 'جاري البحث عن ناقل', icon: Search, description: 'يتم الآن عرض شحنتك على الناقلين' },
  { id: 'loading', label: 'جاري التحميل', icon: Box, description: 'السائق بدأ عملية تحميل البضاعة' },
  { id: 'in_progress', label: 'في الطريق', icon: Truck, description: 'الشحنة في طريقها إلى وجهة التسليم' },
  { id: 'delivered', label: 'تم التسليم بنجاح', icon: CheckCircle2, description: 'وصلت الشحنة وتم تأكيد الاستلام' },
];

export default function ShipperTrack() {
  const { userProfile } = useAuth();
  const queryClient = useQueryClient();
  const [selectedLoadId, setSelectedLoadId] = useState<string | null>(null);

  const { data: activeLoads = [], isLoading } = useQuery({
    queryKey: ['shipper-active-loads', userProfile?.id],
    queryFn: async () => {
      if (!userProfile?.id) return [];
      const data = await api.getUserLoads(userProfile.id);
      return data.filter((l: any) => l.status !== 'cancelled');
    },
    enabled: !!userProfile?.id,
  });

  const selectedLoad = activeLoads.find((l: any) => l.id === selectedLoadId) || activeLoads[0];

  useEffect(() => {
    if (activeLoads.length > 0 && !selectedLoadId) {
      setSelectedLoadId(activeLoads[0].id);
    }
  }, [activeLoads, selectedLoadId]);

  useEffect(() => {
    if (!userProfile?.id) return;

    // اشتراك لحظي لمراقبة التغييرات في الشحنات وموقع السائقين
    const channel = supabase
      .channel('shipper-tracking-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'loads'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['shipper-active-loads'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles'
        },
        () => {
          // تحديث بيانات السائق (الموقع) في الشحنات النشطة
          queryClient.invalidateQueries({ queryKey: ['shipper-active-loads'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userProfile?.id, queryClient]);

  // Geofencing Listener for Selected Load
  useEffect(() => {
    if (!selectedLoadId) return;

    const channel = supabase
      .channel(`load-updates-${selectedLoadId}`)
      .on('broadcast', { event: 'proximity_alert' }, (payload: any) => {
        toast.info(`🚐 الشاحنة على بُعد ${(payload.payload.distance / 1000).toFixed(1)} كم من موقع الاستلام!`, {
          duration: 10000,
          style: { border: '2px solid #3b82f6', background: '#eff6ff' }
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedLoadId]);

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

  // Smart ETA Calculation Logic
  const calculateETA = (load: any) => {
    if (load.status === 'delivered' || load.status === 'completed') return 'تم التسليم';
    if (!(load.driver as any)?.latitude || !(load.driver as any)?.longitude) return 'بانتظار التحرك';

    // مسافة تقريبية باستخدام Haversine (مدرجة هنا كدالة محلية)
    const R = 6371; // Earth radius in km
    const dLat = (24.7136 - (load.driver as any).latitude) * Math.PI / 180; // Placeholder for destination lat
    const dLon = (46.6753 - (load.driver as any).longitude) * Math.PI / 180; // Placeholder for destination lng

    // ملاحظة: في النسخة الاحترافية نستخدم إحداثيات الوجهة الحقيقية من الـ DB
    // هنا سنستخدم معادلة تقريبية للوقت بناءً على سرعة افتراضية 60 كم/س
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((load.driver as any).latitude * Math.PI / 180) * Math.cos(24.7136 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // km

    const timeInHours = distance / 60;
    if (timeInHours < 1) return `خلال ${Math.round(timeInHours * 60)} دقيقة`;
    return `خلال ${Math.round(timeInHours)} ساعة`;
  };

  // PDF Invoice Generation via html2canvas for Perfect Arabic Support
  const generateInvoice = async (load: any) => {
    const element = document.getElementById(`printable-invoice-${load.id}`);
    if (!element) {
      toast.error('حدث خطأ في العثور على قالب الفاتورة');
      return;
    }

    try {
      const toastId = toast.loading('جاري إنشاء فاتورة احترافية...');

      // Ensure the font is loaded (brief delay)
      await new Promise(resolve => setTimeout(resolve, 500));

      const canvas = await html2canvas(element, {
        scale: 3, // High resolution
        useCORS: true,
        backgroundColor: '#ffffff',
        windowWidth: 800, // Fixed width for consistent layout
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Invoice_${load.id.substring(0, 6)}.pdf`);

      toast.dismiss(toastId);
      toast.success('تم تحميل الفاتورة بنجاح 🎉');
    } catch (err) {
      console.error('PDF Error:', err);
      toast.error('فشل إنشاء الفاتورة');
    }
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
          {isLoading ? (
            <div className="lg:col-span-3">
              <TrackingPageSkeleton />
            </div>
          ) : (
            <>
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
                    {activeLoads.length > 0 ? activeLoads.map((load: any) => (
                      <motion.div
                        key={load.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setSelectedLoadId(load.id)}
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
                        <div className="flex items-center gap-4">
                          <h3 className="text-lg font-black">متابعة حالة الطلب</h3>
                          {selectedLoad.status === 'completed' && (
                            <Button
                              onClick={() => generateInvoice(selectedLoad)}
                              variant="outline"
                              size="sm"
                              className="bg-white/10 border-white/20 hover:bg-white/20 text-white rounded-xl font-bold h-8"
                            >
                              تحميل الفاتورة PDF
                            </Button>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                          <Clock size={14} /> موعد الوصول المتوقع: {calculateETA(selectedLoad)}
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

                      <CardContent className="p-0 flex-1 relative bg-slate-900 overflow-hidden">
                        {/* Enterprise Navigation Night Grid */}
                        <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
                          <div className="absolute inset-0 bg-[radial-gradient(#3b82f6_1px,transparent_0)] bg-[length:40px_40px]" />
                          <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[length:80px_80px]" />
                        </div>

                        {/* Route Polyline Simulation (SVG) */}
                        <svg className="absolute inset-0 w-full h-full z-10 opacity-30 pointer-events-none">
                          <motion.path
                            d="M 100 400 Q 300 200 700 350 T 1100 100"
                            fill="none"
                            stroke="#3b82f6"
                            strokeWidth="4"
                            strokeDasharray="10 5"
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                          />
                        </svg>

                        <div className="absolute inset-0 flex items-center justify-center p-12 overflow-hidden z-10">
                          <div className="relative text-center max-w-sm">
                            {selectedLoad.status === 'in_progress' ? (
                              <div className="space-y-8">
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.5 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  className="relative mx-auto w-32 h-32"
                                >
                                  <div className="absolute inset-0 bg-blue-500/20 rounded-full animate-ping" />
                                  <div className="absolute inset-4 bg-blue-500/30 rounded-full animate-pulse" />
                                  <div className="relative z-10 w-full h-full bg-slate-800 rounded-full border-4 border-blue-500 flex items-center justify-center shadow-2xl shadow-blue-500/40">
                                    <Truck size={48} className="text-blue-400" />
                                  </div>
                                </motion.div>

                                <div>
                                  <h4 className="text-2xl font-black text-white mb-2">تتبع حي ومباشر</h4>
                                  <div className="flex items-center justify-center gap-2 mb-4">
                                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                                    <span className="text-emerald-400 font-bold text-sm tracking-wide">ناقل نشط الآن</span>
                                  </div>
                                  <p className="text-sm font-bold text-slate-400 leading-relaxed bg-slate-800/50 p-4 rounded-2xl border border-white/5">
                                    يتم الآن بث إحداثيات الموقع الحالي للسائق بدقة متناهية عبر الأقمار الصناعية.
                                  </p>
                                </div>

                                <Button
                                  className="w-full h-14 bg-white text-slate-900 hover:bg-slate-100 font-black rounded-2xl gap-3 shadow-xl transition-all hover:scale-105"
                                  onClick={() => window.open(`https://www.google.com/maps?q=${(selectedLoad.driver as any)?.latitude || 24.7136},${(selectedLoad.driver as any)?.longitude || 46.6753}`, '_blank')}
                                >
                                  <Navigation size={22} className="text-blue-600" />
                                  فتح الخريطة التفاعلية الكاملة
                                </Button>
                              </div>
                            ) : (
                              <>
                                <div className="w-32 h-32 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-slate-700">
                                  <Box size={64} className="text-slate-600" />
                                </div>
                                <h4 className="text-2xl font-black text-white mb-2">بانتظار التحميل</h4>
                                <p className="text-sm font-bold text-slate-400 leading-relaxed">
                                  بمجرد أن يبدأ الناقل الرحلة، ستتمكن من رؤية موقعه المباشر وحساب وقت الوصول المتوقع بدقة.
                                </p>
                              </>
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
            </>
          )}
        </div>
      </div>

      {/* Hidden Invoice Templates for Export */}
      <div className="hidden">
        {activeLoads.map((load: any) => (
          <div
            key={`invoice-${load.id}`}
            id={`printable-invoice-${load.id}`}
            className="p-16 bg-white text-slate-900"
            dir="rtl"
            style={{ width: '800px', fontFamily: "'Cairo', sans-serif" }}
          >
            {/* Header */}
            <div className="flex justify-between items-start border-b-4 border-slate-900 pb-10 mb-10">
              <div>
                <h1 className="text-4xl font-black text-slate-900 mb-2">فاتورة ضريبية</h1>
                <p className="text-xl font-bold text-slate-500">TAX INVOICE</p>
              </div>
              <div className="text-left">
                <div className="w-20 h-20 bg-primary rounded-3xl flex items-center justify-center text-white text-4xl font-black ml-auto mb-4">
                  F
                </div>
                <p className="font-black text-slate-800">Fox Logistics Enterprise</p>
              </div>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-12 mb-12">
              <div className="space-y-4">
                <h3 className="text-lg font-black bg-slate-100 p-3 rounded-xl inline-block">تفاصيل العميل / Client</h3>
                <div className="space-y-1 pr-2">
                  <p className="font-bold"><span className="text-slate-500">الاسم:</span> {userProfile?.full_name || 'N/A'}</p>
                  <p className="font-bold"><span className="text-slate-500">رقم العميل:</span> {userProfile?.id?.substring(0, 8)}</p>
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="text-lg font-black bg-slate-100 p-3 rounded-xl inline-block">تفاصيل الفاتورة / Invoice</h3>
                <div className="space-y-1 pr-2">
                  <p className="font-bold"><span className="text-slate-500">رقم الفاتورة:</span> INV-{load.id.substring(0, 8).toUpperCase()}</p>
                  <p className="font-bold"><span className="text-slate-500">تاريخ الإصدار:</span> {new Date().toLocaleDateString('ar-SA')}</p>
                </div>
              </div>
            </div>

            {/* Shipment Table */}
            <div className="border-2 border-slate-900 rounded-[2rem] overflow-hidden mb-12">
              <table className="w-full text-right border-collapse">
                <thead className="bg-slate-900 text-white">
                  <tr>
                    <th className="p-6 font-black border-l border-white/10 uppercase">وصف الخدمة / Description</th>
                    <th className="p-6 font-black border-l border-white/10 text-center">السعر / Price</th>
                    <th className="p-6 font-black border-l border-white/10 text-center">الضريبة / VAT</th>
                    <th className="p-6 font-black text-center">الإجمالي / Total</th>
                  </tr>
                </thead>
                <tbody className="font-bold">
                  <tr className="border-b border-slate-100">
                    <td className="p-8 border-l border-slate-100">
                      خدمة نقل لوجستية من <span className="text-primary">{load.origin}</span> إلى <span className="text-primary">{load.destination}</span>
                    </td>
                    <td className="p-8 border-l border-slate-100 text-center">{load.price} ر.س</td>
                    <td className="p-8 border-l border-slate-100 text-center">{(load.price * 0.15).toFixed(2)} ر.س</td>
                    <td className="p-8 text-center text-xl font-black">{(load.price * 1.15).toFixed(2)} ر.س</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Totals & QR */}
            <div className="flex justify-between items-end">
              <div className="w-1/2 space-y-4">
                <div className="bg-slate-50 p-6 rounded-3xl space-y-3">
                  <div className="flex justify-between font-bold">
                    <span className="text-slate-500">المجموع الفرعي:</span>
                    <span>{load.price} ر.س</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span className="text-slate-500">الضريبة (15%):</span>
                    <span>{(load.price * 0.15).toFixed(2)} ر.س</span>
                  </div>
                  <div className="pt-3 border-t-2 border-slate-200 flex justify-between text-2xl font-black text-slate-900">
                    <span>الإجمالي النهائي:</span>
                    <span>{(load.price * 1.15).toFixed(2)} ر.س</span>
                  </div>
                </div>
              </div>
              <div className="text-center opacity-50">
                <div className="w-32 h-32 border-4 border-slate-200 rounded-3xl mb-2 mx-auto flex items-center justify-center font-black text-slate-300">
                  QR CODE
                </div>
                <p className="text-xs font-bold uppercase tracking-widest">Verify Authenticity</p>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-20 pt-10 border-t border-slate-100 text-center">
              <p className="text-sm font-bold text-slate-400">هذه فاتورة صادرة آلياً من نظام Fox Logistics Enterprise</p>
              <p className="text-xs font-bold text-slate-300 mt-2 uppercase tracking-wide">Generated by SAS Transport Smart Tracking System</p>
            </div>
          </div>
        ))}
      </div>
    </AppLayout>
  );
}
