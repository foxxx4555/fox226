import { useEffect, useState } from 'react';
import { api } from '@/services/api';
import { useAuth } from '@/hooks/useAuth';
import AppLayout from '@/components/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Star, Loader2, MapPin, Calendar, FileSearch, User, Phone, DollarSign, CheckCircle2, History, RotateCw, Filter, Clock, XCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export default function ShipperHistory() {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const [allLoads, setAllLoads] = useState<any[]>([]);
  const [loads, setLoads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLoad, setSelectedLoad] = useState<any>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');

  // Rating state
  const [showRating, setShowRating] = useState(false);
  const [ratingValue, setRatingValue] = useState(0);

  useEffect(() => {
    if (userProfile?.id) {
      api.getUserLoads(userProfile.id).then(data => {
        // نأخذ مصفوفة الشحنات كاملة عشان نقدر نفلتر براحتنا
        setAllLoads(data);
        setLoads(data);
      }).catch(err => console.error(err))
        .finally(() => setLoading(false));
    }
  }, [userProfile]);

  useEffect(() => {
    let filtered = [...allLoads];

    if (statusFilter !== 'all') {
      filtered = filtered.filter(l => l.status === statusFilter);
    }

    if (dateFilter) {
      filtered = filtered.filter(l => new Date(l.created_at).toISOString().split('T')[0] === dateFilter);
    }

    setLoads(filtered);
  }, [statusFilter, dateFilter, allLoads]);

  const handleRepeatOrder = (load: any) => {
    // Navigate to post load with pre-filled data via state
    navigate('/shipper/post', { state: { templateLoad: load } });
    toast.info('تم نسخ بيانات الشحنة لطلب جديد');
    setSelectedLoad(null);
  };

  const submitRating = async () => {
    if (ratingValue === 0) return toast.error('يرجى اختيار التقييم أولاً');

    // محاكاة إرسال التقييم
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setShowRating(false);
      setRatingValue(0);
      toast.success('تم إرسال التقييم بنجاح! شكراً لك.');
    }, 1000);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="text-emerald-500" />;
      case 'cancelled': return <XCircle className="text-rose-500" />;
      default: return <Clock className="text-amber-500" />;
    }
  };

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-2xl text-primary"><History size={32} /></div>
            <div>
              <h1 className="text-4xl font-black tracking-tight">سجل الطلبات السابقة</h1>
              <p className="text-muted-foreground font-medium mt-1">تتبع كافة شحناتك المكتملة أو الملغاة وأعد طلبها بضغطة زر</p>
            </div>
          </div>

          {/* أدوات الفلترة */}
          <div className="flex flex-wrap items-center gap-3 bg-white p-3 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex items-center gap-2 text-slate-500 font-bold px-2">
              <Filter size={18} /> تصفية:
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px] h-10 rounded-xl bg-slate-50 border-none font-bold">
                <SelectValue placeholder="حالة الطلب" />
              </SelectTrigger>
              <SelectContent className="rounded-xl font-bold">
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="completed">مكتملة</SelectItem>
                <SelectItem value="pending">بانتظار سائق</SelectItem>
                <SelectItem value="in_progress">قيد التنفيذ</SelectItem>
                <SelectItem value="cancelled">ملغاة</SelectItem>
              </SelectContent>
            </Select>

            <Input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-[160px] h-10 rounded-xl bg-slate-50 border-none font-bold"
            />

            {(statusFilter !== 'all' || dateFilter) && (
              <Button variant="ghost" onClick={() => { setStatusFilter('all'); setDateFilter(''); }} className="text-rose-500 font-bold text-xs">مسح</Button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-32"><Loader2 className="animate-spin text-primary" size={48} /></div>
        ) : loads.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-[3rem] border-2 border-dashed border-muted shadow-sm flex flex-col items-center justify-center">
            <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6">
              <History size={40} className="text-slate-300" />
            </div>
            <p className="text-xl font-black text-slate-700">لا توجد سجلات مطابقة</p>
            <p className="text-slate-500 mt-2 font-medium">لم نجد أي شحنات تطابق شروط البحث الحالية</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {loads.map(load => (
              <Card key={load.id} className="rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all bg-white group overflow-hidden">
                <CardContent className="p-6 md:p-8 flex flex-col md:flex-row justify-between items-center gap-6">
                  <div className="flex items-center gap-6 w-full md:w-auto">
                    <div className="w-16 h-16 bg-slate-50 rounded-[1.5rem] flex items-center justify-center shrink-0 border border-slate-100 shadow-inner">
                      {getStatusIcon(load.status)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-black text-xl text-slate-800">{load.origin}</span>
                        <div className="flex-1 h-px bg-slate-200 border-dashed border-b border-slate-300 relative mx-2 min-w-[30px] md:min-w-[50px]">
                          <span className="absolute left-1/2 top-1/2 -translate-y-1/2 -translate-x-1/2 text-slate-400 bg-white px-1 font-bold text-xs uppercase text-center rtl:flex-row-reverse border border-slate-100 rounded-md">إلى</span>
                        </div>
                        <span className="font-black text-xl text-slate-800">{load.destination}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-slate-500">
                        <span className="flex items-center gap-1"><Calendar size={14} /> {new Date(load.created_at).toLocaleDateString('ar-SA')}</span>
                        <span className="flex items-center gap-1"><DollarSign size={14} /> {load.price} ر.س</span>
                        <span className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5">{load.weight} طن</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 w-full md:w-auto mt-4 md:mt-0 pt-4 md:pt-0 border-t md:border-0 border-slate-100">
                    <Button
                      onClick={() => handleRepeatOrder(load)}
                      variant="outline"
                      className="flex-1 md:flex-none h-12 rounded-xl font-bold border-slate-200 text-slate-700 hover:text-primary hover:border-primary hover:bg-primary/5 transition-colors"
                    >
                      <RotateCw size={18} className="me-2" /> تكرار الطلب
                    </Button>
                    <Button
                      onClick={() => setSelectedLoad(load)}
                      className="flex-1 md:flex-none h-12 rounded-xl font-black bg-slate-800 hover:bg-slate-900 text-white shadow-xl shadow-slate-900/10"
                    >
                      التفاصيل <FileSearch size={18} className="ms-2" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Modal for details */}
        <Dialog open={!!selectedLoad} onOpenChange={() => setSelectedLoad(null)}>
          <DialogContent className="max-w-xl rounded-[2.5rem] p-0 overflow-hidden border-none bg-white">
            <DialogHeader className="p-8 pb-6 bg-slate-50 border-b border-slate-100">
              <DialogTitle className="text-2xl font-black text-slate-800 flex items-center justify-between">
                <span>تفاصيل الشحنة السابقة</span>
                {getStatusIcon(selectedLoad?.status)}
              </DialogTitle>
              <DialogDescription className="text-slate-500 font-bold mt-2">
                رقم المرجع: #{selectedLoad?.id?.substring(0, 8).toUpperCase()}
              </DialogDescription>
            </DialogHeader>
            {selectedLoad && (
              <div className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-5 bg-white rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden">
                    <div className="w-10 h-10 bg-primary/10 text-primary rounded-full flex items-center justify-center absolute -left-2 -top-2 opacity-50"><MapPin /></div>
                    <p className="text-xs font-black text-slate-400 uppercase mb-1 relative z-10">نقطة الانطلاق</p>
                    <p className="font-black text-lg text-slate-800 relative z-10">{selectedLoad.origin}</p>
                  </div>
                  <div className="p-5 bg-white rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden">
                    <div className="w-10 h-10 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center absolute -left-2 -top-2 opacity-50"><MapPin /></div>
                    <p className="text-xs font-black text-slate-400 uppercase mb-1 relative z-10">وجهة الوصول</p>
                    <p className="font-black text-lg text-slate-800 relative z-10">{selectedLoad.destination}</p>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-200 pb-4">
                    <span className="text-slate-500 font-bold">نوع البضاعة</span>
                    <span className="text-slate-800 font-black">{selectedLoad.package_type || 'غير محدد'}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-slate-200 pb-4">
                    <span className="text-slate-500 font-bold">الوزن</span>
                    <span className="text-slate-800 font-black">{selectedLoad.weight} طن</span>
                  </div>
                  <div className="flex justify-between items-center pb-2">
                    <span className="text-slate-500 font-bold">المستلم</span>
                    <span className="text-slate-800 font-black">{selectedLoad.receiver_name}</span>
                  </div>
                </div>

                {selectedLoad.driver && (
                  <div className="flex items-center justify-between p-4 bg-white border-2 border-primary/20 rounded-2xl shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black text-lg">
                        {selectedLoad.driver.full_name?.charAt(0) || <User size={20} />}
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">السائق النّاقل</p>
                        <p className="font-black text-slate-800">{selectedLoad.driver.full_name}</p>
                      </div>
                    </div>
                    {selectedLoad.driver.phone && (
                      <Button variant="ghost" size="icon" onClick={() => window.location.href = `tel:${selectedLoad.driver.phone}`} className="rounded-xl h-10 w-10 bg-slate-100 text-slate-600 hover:text-primary hover:bg-primary/10 border border-slate-200">
                        <Phone size={18} />
                      </Button>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between p-6 bg-[#0f172a] rounded-[1.5rem] text-white shadow-xl relative overflow-hidden">
                  <div className="absolute -right-4 -bottom-4 text-white/5"><DollarSign size={100} /></div>
                  <div className="relative z-10 flex items-center gap-3 font-bold text-slate-300">تكلفة الشحنة النهائية</div>
                  <p className="relative z-10 font-black text-3xl text-emerald-400">{selectedLoad.price} <span className="text-lg text-emerald-400/50">ر.س</span></p>
                </div>

                <div className="flex gap-4">
                  <Button
                    onClick={() => handleRepeatOrder(selectedLoad)}
                    className="flex-1 h-14 rounded-xl font-black text-lg bg-primary hover:bg-primary/90 text-white shadow-xl shadow-primary/20"
                  >
                    <RotateCw className="me-2" size={20} /> تكرار هذا الطلب
                  </Button>

                  {selectedLoad.status === 'completed' && (
                    <Button
                      onClick={() => setShowRating(true)}
                      variant="outline"
                      className="flex-1 h-14 rounded-xl font-black text-lg border-amber-400 text-amber-500 hover:bg-amber-50 hover:text-amber-600 shadow-xl shadow-amber-500/10"
                    >
                      <Star className="me-2 fill-current" size={20} /> تقييم السائق
                    </Button>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Modal for Rating */}
        <Dialog open={showRating} onOpenChange={setShowRating}>
          <DialogContent className="max-w-md rounded-[2.5rem] p-8 text-center bg-white border-none shadow-2xl">
            <div className="w-20 h-20 bg-amber-100 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <Star size={40} className="fill-current" />
            </div>
            <DialogTitle className="text-2xl font-black text-slate-800 mb-2">تقييم النقل</DialogTitle>
            <DialogDescription className="text-slate-500 font-bold mb-8">
              كيف كانت تجربتك مع السائق {selectedLoad?.driver?.full_name} في هذه الرحلة؟
            </DialogDescription>

            <div className="flex justify-center gap-2 mb-8 flex-row-reverse">
              {[5, 4, 3, 2, 1].map(star => (
                <button
                  key={star}
                  onClick={() => setRatingValue(star)}
                  className={`transition-all ${ratingValue >= star ? 'text-amber-400 scale-110' : 'text-slate-200 hover:text-amber-200'}`}
                >
                  <Star size={48} className={ratingValue >= star ? 'fill-current' : ''} />
                </button>
              ))}
            </div>

            <Button
              onClick={submitRating}
              disabled={loading}
              className="w-full h-14 rounded-xl font-black text-lg bg-slate-900 hover:bg-slate-800 text-white shadow-xl"
            >
              {loading ? <Loader2 className="animate-spin" size={24} /> : 'إرسال التقييم'}
            </Button>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
