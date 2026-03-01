import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/services/api';
import AppLayout from '@/components/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Loader2, MapPin, Package, Phone, MessageCircle, MessageSquare, X,
  CheckCircle2, AlertTriangle, Info, Weight,
  Banknote, Calendar, Truck, User, Search, Filter, ArrowUpDown, ChevronDown
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';

export default function DriverLoads() {
  const { userProfile } = useAuth();
  const navigate = useNavigate();

  // Guard for unverified drivers
  const safeProfile = userProfile as any;
  if (safeProfile && safeProfile.role === 'driver' && safeProfile.status !== 'active') {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto py-20 px-4">
          <Card className="rounded-[2.5rem] border-none shadow-2xl bg-white overflow-hidden text-center relative pointer-events-none">
            <div className="absolute inset-0 bg-slate-900/5 backdrop-blur-sm z-10"></div>
            <CardContent className="p-16 relative z-20">
              <div className="w-32 h-32 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-8 animate-pulse border-4 border-amber-100 shadow-inner">
                <AlertTriangle size={64} className="text-amber-500" />
              </div>
              <h2 className="text-4xl font-black text-slate-800 mb-4 tracking-tight">حسابك قيد المراجعة والتوثيق</h2>
              <p className="text-lg font-bold text-slate-500 max-w-lg mx-auto leading-relaxed">
                مرحباً بك في أسطولنا! نحن نراجع مستنداتك حالياً لضمان أعلى معايير الأمان.
                <br className="my-2" />
                ستتمكن من استعراض الشحنات وبدء رحلتك فور اعتماد الإدارة لملفك.
              </p>
              <div className="mt-10 inline-flex items-center justify-center space-x-2 rtl:space-x-reverse bg-amber-500/10 text-amber-600 px-6 py-3 rounded-2xl font-black">
                <Loader2 className="animate-spin" size={20} />
                <span>يرجى الانتظار...</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  const [loads, setLoads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedLoad, setSelectedLoad] = useState<any>(null);
  const [showSurvey, setShowSurvey] = useState(false);
  const [pendingLoadId, setPendingLoadId] = useState<string | null>(null);
  const [showBidDialog, setShowBidDialog] = useState(false);
  const [bidPrice, setBidPrice] = useState('');
  const [bidMessage, setBidMessage] = useState('');
  const [trucks, setTrucks] = useState<any[]>([]);
  const [selectedTruckId, setSelectedTruckId] = useState('');
  const [userBids, setUserBids] = useState<any[]>([]);
  const [ignoredIds, setIgnoredIds] = useState<string[]>([]);

  // حالات الفلترة
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCity, setFilterCity] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterMinPrice, setFilterMinPrice] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const fetchLoads = async () => {
    try {
      const data = await api.getAvailableLoads();
      setLoads(data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchLoads();
    if (userProfile?.id) {
      supabase.from('trucks').select('*').eq('owner_id', userProfile.id).then(({ data }) => setTrucks(data || []));
      api.getBids(userProfile.id, 'driver').then(data => setUserBids(data || []));
    }
    const channel = (supabase as any).channel('available-loads')
      .on('postgres_changes', { event: '*', table: 'loads', schema: 'public' }, () => fetchLoads())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userProfile?.id]);

  // منطق الفلترة في الواجهة
  const filteredLoads = useMemo(() => {
    return loads.filter(load => {
      if (ignoredIds.includes(load.id)) return false;

      const matchesSearch =
        load.origin.toLowerCase().includes(searchQuery.toLowerCase()) ||
        load.destination.toLowerCase().includes(searchQuery.toLowerCase()) ||
        load.package_type?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCity = filterCity === 'all' || load.origin === filterCity || load.destination === filterCity;
      const matchesType = filterType === 'all' || load.package_type === filterType;
      const matchesPrice = !filterMinPrice || Number(load.price) >= Number(filterMinPrice);

      return matchesSearch && matchesCity && matchesType && matchesPrice;
    });
  }, [loads, searchQuery, filterCity, filterType, filterMinPrice]);

  const handleSubmitBid = async () => {
    if (!bidPrice) return toast.error("يرجى إدخال السعر");
    setIsProcessing(true);
    try {
      const selectedTruck = trucks.find(t => t.id === selectedTruckId);
      const truckInfo = selectedTruck ? ` [شاحنة: ${selectedTruck.plate_number}]` : "";

      const { error } = await supabase.from('load_bids').insert({
        load_id: selectedLoad.id,
        driver_id: userProfile?.id,
        price: Number(bidPrice),
        message: bidMessage + truckInfo,
        status: 'pending'
      });

      if (error) throw error;
      await api.createNotification(selectedLoad.owner_id, "💰 عرض سعر جديد!", `قدم الناقل ${userProfile?.full_name} عرضاً بقيمة ${bidPrice} ريال لشحنتك المتوجهة إلى ${selectedLoad.destination}`, 'system');

      toast.success("تم تقديم عرضك بنجاح! 🚀");
      setShowBidDialog(false);
      setSelectedLoad(null);
    } catch (error: any) {
      toast.error(`فشل تقديم العرض: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDirectAccept = async (loadId: string) => {
    if (!confirm("هل أنت متأكد من رغبتك في قبول الشحنة بالسعر المعلن؟")) return;
    setIsProcessing(true);
    try {
      const targetLoad = loads.find(l => l.id === loadId);
      await api.acceptLoad(loadId, userProfile?.id!);
      if (targetLoad) {
        await api.createNotification(targetLoad.owner_id, "✅ تم قبول شحنتك!", `تم قبول شحنتك المتوجهة إلى ${targetLoad.destination} بالسعر المعلن من قبل الناقل.`, 'accept');
      }
      toast.success("تم قبول الشحنة بنجاح! 🚛");
      fetchLoads();
    } catch (e) { toast.error("فشل القبول"); }
    finally { setIsProcessing(false); }
  };

  const handleWhatsApp = (load: any) => {
    const phone = load.receiver_phone || load.owner?.phone;
    if (!phone) return toast.error("رقم التواصل غير متاح");
    setPendingLoadId(load.id);
    let cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.startsWith('05')) cleanPhone = '966' + cleanPhone.substring(1);
    const formattedDate = new Date(load.pickup_date).toLocaleDateString('ar-SA');
    const message = `السلام عليكم، أنا ناقل من تطبيق SAS ومهتم بنقل شحنتك: من ${load.origin} إلى ${load.destination}، الحمولة: ${load.package_type}، السعر: ${load.price} ريال. هل لا تزال متاحة؟`;
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
    setTimeout(() => { setSelectedLoad(null); setShowSurvey(true); }, 1500);
  };

  return (
    <AppLayout>
      <div className="space-y-8 max-w-5xl mx-auto pb-20">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-4xl font-black text-slate-800 tracking-tight">الطلبات المتاحة</h1>
            <p className="text-muted-foreground font-medium mt-1">اكتشف شحنات جديدة وابدأ رحلتك الآن</p>
          </div>
          <Badge className="bg-emerald-500/10 text-emerald-600 border-none px-4 py-2 rounded-full font-black animate-pulse flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full" />
            تحديث حي ومباشر
          </Badge>
        </div>

        {/* نظام البحث والفلترة */}
        <div className="bg-white rounded-[2.5rem] p-6 shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col gap-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="ابحث بالمدينة أو نوع الحمولة..."
                className="h-14 pr-12 rounded-2xl bg-slate-50 border-none font-bold text-slate-700 shadow-inner"
              />
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            </div>
            <Button
              onClick={() => setShowFilters(!showFilters)}
              variant={showFilters ? "default" : "outline"}
              className={`h-14 px-8 rounded-2xl gap-2 font-black transition-all ${showFilters ? 'bg-blue-600' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >
              <Filter size={18} /> تصفية النتائج
            </Button>
          </div>

          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden bg-slate-50 border border-slate-100 rounded-[1.5rem]"
              >
                <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label className="font-black text-xs uppercase text-slate-400">المدينة</Label>
                    <Select value={filterCity} onValueChange={setFilterCity}>
                      <SelectTrigger className="h-12 rounded-xl bg-white border-none font-bold shadow-sm" dir="rtl">
                        <SelectValue placeholder="الكل" />
                      </SelectTrigger>
                      <SelectContent dir="rtl">
                        <SelectItem value="all">كل المدن</SelectItem>
                        {Array.from(new Set(loads.map(l => l.origin))).map(city => (
                          <SelectItem key={city} value={city}>{city}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="font-black text-xs uppercase text-slate-400">نوع الحمولة</Label>
                    <Select value={filterType} onValueChange={setFilterType}>
                      <SelectTrigger className="h-12 rounded-xl bg-white border-none font-bold shadow-sm" dir="rtl">
                        <SelectValue placeholder="الكل" />
                      </SelectTrigger>
                      <SelectContent dir="rtl">
                        <SelectItem value="all">كل الأنواع</SelectItem>
                        {Array.from(new Set(loads.filter(l => l.package_type).map(l => l.package_type))).map(type => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="font-black text-xs uppercase text-slate-400">الحد الأدنى للسعر (ريال)</Label>
                    <Input
                      type="number"
                      value={filterMinPrice}
                      onChange={e => setFilterMinPrice(e.target.value)}
                      placeholder="أدخل مبلغ..."
                      className="h-12 rounded-xl bg-white border-none font-bold shadow-sm"
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-600" size={48} /></div>
        ) : (
          <div className="grid gap-6">
            {filteredLoads.length === 0 ? (
              <div className="text-center py-24 bg-white rounded-[3rem] border-2 border-dashed border-slate-200 text-slate-400 font-bold">
                <Package size={64} className="mx-auto mb-4 opacity-20" />
                <p>لا توجد شحنات مطابقة لبحثك</p>
                <Button onClick={() => { setSearchQuery(''); setFilterCity('all'); setFilterType('all'); setFilterMinPrice(''); }} variant="link" className="text-blue-600 mt-2 font-black">إعادة تعيين الفلاتر</Button>
              </div>
            ) : (
              filteredLoads.map((load) => (
                <motion.div key={load.id} layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                  <Card className="group rounded-[2.5rem] border-none shadow-md hover:shadow-2xl transition-all bg-white overflow-hidden relative border-r-8 border-r-blue-600">
                    <Button
                      onClick={() => setIgnoredIds([...ignoredIds, load.id])}
                      variant="ghost"
                      size="icon"
                      className="absolute left-4 top-4 h-8 w-8 rounded-full bg-slate-50 text-slate-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all z-10"
                    >
                      <X size={14} />
                    </Button>
                    <CardContent className="p-8">
                      <div className="flex flex-col lg:flex-row gap-8 items-center">
                        {/* مسار الشحنة */}
                        <div className="flex-1 w-full">
                          <div className="flex items-center gap-6 justify-between lg:justify-start">
                            <div className="text-center lg:text-right">
                              <p className="text-[10px] font-black text-slate-400 uppercase mb-1">المصدر</p>
                              <p className="text-2xl font-black text-slate-800">{load.origin}</p>
                            </div>
                            <div className="flex-1 flex flex-col items-center justify-center max-w-[120px]">
                              <Badge className="mb-2 bg-blue-50 text-blue-600 border-none font-black text-[10px]">{load.distance || '---'} كم</Badge>
                              <div className="w-full h-0.5 bg-blue-100 relative">
                                <MapPin size={16} className="absolute inset-x-0 mx-auto -top-2 text-blue-600 fill-white" />
                              </div>
                            </div>
                            <div className="text-center lg:text-left">
                              <p className="text-[10px] font-black text-slate-400 uppercase mb-1">الوجهة</p>
                              <p className="text-2xl font-black text-slate-800">{load.destination}</p>
                            </div>
                          </div>
                        </div>

                        {/* تفاصيل الحمولة في المنتصف */}
                        <div className="flex flex-wrap items-center gap-4 py-4 lg:py-0 lg:px-8 lg:border-r lg:border-l lg:border-slate-100 justify-center">
                          <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
                            <Package size={16} className="text-blue-600" />
                            <span className="font-bold text-sm text-slate-700">{load.package_type}</span>
                          </div>
                          <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
                            <Weight size={16} className="text-blue-600" />
                            <span className="font-bold text-sm text-slate-700">{load.weight} طن</span>
                          </div>
                        </div>

                        {/* السعر والإجراءات */}
                        <div className="w-full lg:w-64 flex flex-col items-center lg:items-end gap-4">
                          <div className="text-center lg:text-left">
                            <p className="text-[10px] font-black text-slate-400 uppercase">السعر التقديري</p>
                            <p className="text-3xl font-black text-emerald-600">{load.price} <span className="text-sm">ر.س</span></p>
                          </div>
                          <div className="flex gap-2 w-full">
                            <Button onClick={() => setSelectedLoad(load)} variant="outline" className="flex-1 h-12 rounded-xl border-slate-200 text-slate-600 font-black hover:bg-slate-50">تفاصيل</Button>
                            <Button onClick={() => handleDirectAccept(load.id)} className="flex-1 h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black shadow-lg shadow-blue-100">قبول سريـع</Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            )}
          </div>
        )}

        {/* حوار التفاصيل (موجود مسبقاً مع تحسينات طفيفة) */}
        <Dialog open={!!selectedLoad} onOpenChange={() => setSelectedLoad(null)}>
          {/* ... نفس محتوى الـ Dialog مع تحسينات CSS ... */}
          <DialogContent className="max-w-2xl rounded-[3rem] p-0 overflow-hidden border-none bg-white shadow-2xl">
            <div className="p-6 bg-[#0f172a] text-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg"><Package size={22} /></div>
                <div>
                  <h2 className="text-xl font-black">تفاصيل الشحنة</h2>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">ID: {selectedLoad?.id?.slice(0, 8)}</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setSelectedLoad(null)} className="text-white hover:bg-white/10 rounded-full"><X /></Button>
            </div>

            {selectedLoad && (
              <div className="p-8 space-y-6 max-h-[80vh] overflow-y-auto">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-center">
                    <Weight size={20} className="mx-auto text-blue-600 mb-1" />
                    <p className="text-[9px] font-black text-slate-400">الوزن التقريبي</p>
                    <p className="font-black text-slate-800">{selectedLoad.weight} طن</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-center">
                    <Calendar size={20} className="mx-auto text-blue-600 mb-1" />
                    <p className="text-[9px] font-black text-slate-400">تاريخ التحميل</p>
                    <p className="font-black text-slate-800">{new Date(selectedLoad.pickup_date).toLocaleDateString('ar-SA')}</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100 text-center">
                    <Banknote size={20} className="mx-auto text-emerald-600 mb-1" />
                    <p className="text-[9px] font-black text-emerald-400">سعر النقل</p>
                    <p className="font-black text-emerald-700">{selectedLoad.price} ريال</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-center">
                    <Truck size={20} className="mx-auto text-blue-600 mb-1" />
                    <p className="text-[9px] font-black text-slate-400">حجم الشاحنة</p>
                    <p className="font-black text-slate-800">{selectedLoad.body_type || selectedLoad.truck_type_required || 'عام'}</p>
                  </div>

                  {/* الحقول الإضافية التي طلبها المستخدم */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-center">
                    <Package size={20} className="mx-auto text-blue-600 mb-1" />
                    <p className="text-[9px] font-black text-slate-400">نوع البضاعة</p>
                    <p className="font-black text-slate-800">{selectedLoad.package_type || 'غير محدد'}</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-center">
                    <ArrowUpDown size={20} className="mx-auto text-blue-600 mb-1" />
                    <p className="text-[9px] font-black text-slate-400">الكمية</p>
                    <p className="font-black text-slate-800">{selectedLoad.quantity || '0'} {selectedLoad.unit}</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-center">
                    <Banknote size={20} className="mx-auto text-blue-600 mb-1" />
                    <p className="text-[9px] font-black text-slate-400">طريقة الدفع</p>
                    <p className="font-black text-slate-800">
                      {selectedLoad.payment_method === 'CASH' ? 'نقدي عند الاستلام' :
                        selectedLoad.payment_method === 'TRANSFER' ? 'تحويل بنكي' :
                          selectedLoad.payment_method === 'WALLET' ? 'محفظة SAS' : 'غير محدد'}
                    </p>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-center">
                    <AlertTriangle size={20} className="mx-auto text-orange-500 mb-1" />
                    <p className="text-[9px] font-black text-slate-400">قيمة البضاعة</p>
                    <p className="font-black text-orange-600">{selectedLoad.goods_value || '0'} ريال</p>
                  </div>
                </div>

                {/* قسم بيانات المستلم */}
                <div className="p-6 rounded-[2rem] bg-indigo-50/50 border border-indigo-100 flex flex-col md:flex-row justify-between items-center gap-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-white p-3 rounded-full shadow-sm text-indigo-500"><User size={24} /></div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase">بيانات المستلم</p>
                      <p className="font-black text-lg text-slate-800">{selectedLoad.receiver_name || 'غير متوفر'}</p>
                    </div>
                  </div>
                  <div className="bg-white px-6 py-3 rounded-2xl shadow-sm border border-indigo-50 flex items-center gap-3 w-full md:w-auto justify-center">
                    <Phone size={18} className="text-indigo-500" />
                    <p className="font-black text-lg text-slate-700 tracking-wider" dir="ltr">{selectedLoad.receiver_phone || '---'}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2 font-black text-slate-800"><MapPin className="text-blue-600" size={18} /> المسار والتحميل</div>
                  <div className="p-6 rounded-[2rem] bg-slate-50 border-2 border-slate-100 flex justify-between items-center">
                    <div><p className="text-xs font-bold text-slate-400 text-right">المصدر (التحميل)</p><p className="font-black text-lg text-slate-800">{selectedLoad.origin}</p></div>
                    <div className="w-16 h-0.5 bg-blue-200 border-dashed border-t-2" />
                    <div><p className="text-xs font-bold text-slate-400 text-left">الوجهة (التفريغ)</p><p className="font-black text-lg text-slate-800">{selectedLoad.destination}</p></div>
                  </div>
                </div>

                <div className="p-6 rounded-[2rem] bg-blue-50/30 border border-blue-100">
                  <div className="flex items-center gap-2 font-black text-blue-700 mb-2"><Info size={18} /> ملاحظات الشاحن</div>
                  <p className="text-sm font-bold text-slate-600 leading-relaxed">{selectedLoad.description || 'لا توجد ملاحظات إضافية'}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button onClick={() => { setBidPrice(selectedLoad.price); setShowBidDialog(true); }} className="h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black">تقديم عرض سعر</Button>
                  <div className="grid grid-cols-3 gap-2">
                    <Button onClick={() => handleWhatsApp(selectedLoad)} variant="outline" className="h-14 rounded-2xl border-2 border-emerald-500 text-emerald-600 hover:bg-emerald-50 font-black px-0" title="واتساب"><MessageCircle size={20} /></Button>
                    <Button onClick={() => { window.location.href = `tel:${selectedLoad.owner?.phone}`; }} variant="outline" className="h-14 rounded-2xl border-2 border-slate-200 text-slate-600 font-black px-0" title="اتصال"><Phone size={20} /></Button>
                    <Button onClick={() => navigate(`/driver/messaging?shipperId=${selectedLoad.owner_id}`)} variant="outline" className="h-14 rounded-2xl border-2 border-indigo-500 text-indigo-600 hover:bg-indigo-50 font-black px-0" title="محادثة"><MessageCircle size={20} /></Button>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* حوار تقديم العرض */}
        <Dialog open={showBidDialog} onOpenChange={setShowBidDialog}>
          <DialogContent className="max-w-md rounded-[3rem] p-0 overflow-hidden border-none bg-white shadow-2xl">
            <div className="p-6 bg-blue-600 text-white text-center">
              <h3 className="font-black text-xl">تقديم عرض سعر</h3>
              <p className="text-xs opacity-80 mt-1">نافس بسعرك للحفوز على هذه الشحنة</p>
            </div>
            <div className="p-8 space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="font-black text-slate-700 mr-2">سعرك المقترح (ريال)</Label>
                  <Input
                    type="number"
                    value={bidPrice}
                    onChange={e => setBidPrice(e.target.value)}
                    className="h-16 rounded-2xl bg-slate-50 border-none font-black text-2xl text-center text-blue-600 shadow-inner"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-black text-slate-700 mr-2">الشاحنة</Label>
                  <Select value={selectedTruckId} onValueChange={setSelectedTruckId}>
                    <SelectTrigger className="h-14 rounded-2xl font-bold bg-slate-50 border-none px-6">
                      <SelectValue placeholder="اختر الشاحنة..." />
                    </SelectTrigger>
                    <SelectContent dir="rtl">
                      {trucks.map(t => <SelectItem key={t.id} value={t.id}>{t.plate_number} - {t.truck_type}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={handleSubmitBid} disabled={isProcessing} className="w-full h-16 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xl font-black shadow-xl shadow-blue-100 transition-all">
                {isProcessing ? <Loader2 className="animate-spin" /> : "إرسال العرض Now"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* حوار الاستبيان للتأكيد */}
        <Dialog open={showSurvey} onOpenChange={setShowSurvey}>
          <DialogContent className="max-w-md rounded-[3rem] p-8 text-center space-y-6 bg-white border-none shadow-2xl">
            <DialogTitle className="sr-only">تأكيد الاتفاق</DialogTitle>
            <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto"><CheckCircle2 size={40} /></div>
            <div className="space-y-2">
              <h3 className="text-2xl font-black text-slate-800">هل تم الاتفاق؟</h3>
              <p className="text-sm font-bold text-slate-500">في حال اتفاقك مع التاجر، اضغط نعم لنقوم بتأكيد الشحنة لك</p>
            </div>
            <div className="flex flex-col gap-3">
              <Button onClick={async () => {
                if (pendingLoadId) {
                  const targetLoad = loads.find(l => l.id === pendingLoadId);
                  await api.acceptLoad(pendingLoadId, userProfile?.id!);
                  if (targetLoad) {
                    await api.createNotification(targetLoad.owner_id, "✅ تم قبول شحنتك!", `تم قبول شحنتك المتوجهة إلى ${targetLoad.destination} من قبل الناقل بعد الاتفاق.`, 'accept');
                  }
                  toast.success("تم التأكيد! الشحنة الآن في مهامك");
                  setShowSurvey(false);
                  fetchLoads();
                }
              }} className="h-14 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-lg">نعم، تم الاتفاق</Button>
              <Button onClick={() => setShowSurvey(false)} variant="ghost" className="font-bold text-slate-400">لا، لم يحصل اتفاق</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
