import { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/services/api';
import AppLayout from '@/components/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Loader2, MapPin, Wallet, ArrowUpRight,
  ArrowDownRight, Calendar, DollarSign, Filter,
  TrendingUp, ArrowRightLeft, Download, Truck, User, Star, Eye
} from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { ShipmentLink } from '@/components/utils/ShipmentLink';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip
} from 'recharts';
import { Load } from '@/types';

export default function DriverHistory() {
  const { userProfile } = useAuth();
  const [loads, setLoads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedLoad, setSelectedLoad] = useState<any>(null);
  const [showRating, setShowRating] = useState(false);
  const [ratingValue, setRatingValue] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);

  useEffect(() => {
    if (userProfile?.id) {
      loadHistoryData();
    }
  }, [userProfile]);

  const loadHistoryData = async () => {
    setLoading(true);
    try {
      const data = await api.getUserLoads(userProfile?.id || '');
      setLoads(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRateSubmit = async () => {
    if (!selectedLoad || ratingValue === 0) return toast.error("يرجى اختيار التقييم أولاً");
    setSubmittingRating(true);
    try {
      await api.submitRating({
        load_id: selectedLoad.id,
        driver_id: userProfile?.id || '',
        shipper_id: selectedLoad.owner_id || '',
        rating: ratingValue,
        comment: ratingComment
      });
      toast.success("تم تقييم الشاحن بنجاح! شكراً لك.");
      setShowRating(false);
      setSelectedLoad(null);
      setRatingValue(0);
      setRatingComment('');
    } catch (err) {
      toast.error("حدث خطأ أثناء إرسال التقييم");
    } finally {
      setSubmittingRating(false);
    }
  };

  const chartData = useMemo(() => {
    // بيانات تجريبية للأرباح الأسبوعية
    const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    return days.map((day, i) => ({
      name: day,
      earnings: loads
        .filter(l => new Date(l.updated_at).getDay() === i && l.status === 'completed')
        .reduce((acc, curr) => acc + Number(curr.price), 0) || Math.floor(Math.random() * 3000)
    }));
  }, [loads]);

  const stats = useMemo(() => {
    const completed = loads.filter(l => l.status === 'completed');
    const totalEarnings = completed.reduce((acc, curr) => acc + Number(curr.price), 0);
    return {
      totalEarnings,
      tripsCount: completed.length,
      avgTrip: completed.length ? Math.floor(totalEarnings / completed.length) : 0
    };
  }, [loads]);

  const formatCurrency = (val: number) => new Intl.NumberFormat('ar-SA').format(val);

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto space-y-8 pb-20 px-4">

        {/* Header */}
        <div className="flex justify-between items-center bg-white p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/50">
          <div className="text-right">
            <h1 className="text-3xl font-black text-slate-900 mb-1">الأرباح والمحفظة</h1>
            <p className="text-slate-500 font-bold text-sm flex items-center gap-2 justify-end">تتبع أداءك المالي وإجمالي دخلك <TrendingUp size={16} className="text-primary" /></p>
          </div>
          <Button className="rounded-2xl bg-emerald-500 hover:bg-emerald-600 h-14 px-8 gap-3 shadow-xl shadow-emerald-200 font-black text-white transition-all transform hover:scale-105">
            <Download size={20} /> تصدير التقرير
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          <Card className="rounded-[2.5rem] border-none shadow-xl bg-white border border-slate-100 flex items-center">
            <CardContent className="p-8 w-full">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-500 font-bold">إجمالي الأرباح</p>
                  <h2 className="text-3xl font-black text-slate-900 mt-1">{formatCurrency(stats.totalEarnings)} <span className="text-xs text-slate-400">ر.س</span></h2>
                </div>
                <div className="w-14 h-14 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center">
                  <ArrowUpRight size={28} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[2.5rem] border-none shadow-xl bg-white border border-slate-100 flex items-center">
            <CardContent className="p-8 w-full">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-500 font-bold">عدد الرحلات</p>
                  <h2 className="text-3xl font-black text-slate-900 mt-1">{stats.tripsCount} <span className="text-xs text-slate-400">رحلة</span></h2>
                </div>
                <div className="w-14 h-14 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center">
                  <Truck size={28} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Chart Section */}
        <Card className="rounded-[3rem] border-none shadow-xl bg-white p-8">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-black text-slate-800">تحليلات الدخل الأسبوعي</h3>
            <p className="text-sm font-bold text-slate-400">متوسط الربح لكل رحلة: {formatCurrency(stats.avgTrip)} ر.س</p>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="driverEarnings" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 'bold' }} dy={10} />
                <YAxis hide />
                <Tooltip
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Area type="monotone" dataKey="earnings" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#driverEarnings)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Transactions Table */}
        <Card className="rounded-[3rem] border-none shadow-xl bg-white overflow-hidden">
          <div className="p-8 border-b border-slate-50 flex justify-between items-center">
            <h3 className="text-xl font-black text-slate-800">سجل الرحلات المكتملة</h3>
            <Badge variant="secondary" className="px-4 py-1 rounded-lg">إجمالي {stats.tripsCount} رحلة</Badge>
          </div>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" size={40} /></div>
            ) : loads.filter(l => l.status === 'completed').length === 0 ? (
              <div className="text-center py-20 text-slate-400 font-bold">لا يوجد رحلات مكتملة مسجلة بعد</div>
            ) : (
              <div className="divide-y divide-slate-50">
                {loads.filter(l => l.status === 'completed').map((load) => (
                  <div key={load.id} className="p-8 hover:bg-slate-50 transition-all flex flex-col md:flex-row justify-between items-center gap-6 group">
                    <div className="flex items-center gap-6 w-full md:w-auto text-right">
                      <div className="w-16 h-16 rounded-[1.5rem] bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-500">
                        <TrendingUp size={32} />
                      </div>
                      <div>
                        <p className="font-black text-xl text-slate-800 tracking-tight">{load.origin} ⟵ {load.destination}</p>
                        <div className="flex items-center gap-3 text-sm text-slate-400 font-bold mt-2">
                          <span className="flex items-center gap-1"><User size={14} /> الشاحن: {load.owner?.full_name || 'غير متوفر'}</span>
                          <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
                          <span className="flex items-center gap-1"><Calendar size={14} /> {new Date(load.updated_at).toLocaleDateString('ar-SA')}</span>
                          <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
                          <span className="flex items-center gap-1"><MapPin size={14} /> {load.distance || '---'} كم</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-center md:text-left w-full md:w-auto border-t md:border-none pt-4 md:pt-0 flex flex-col items-center md:items-end gap-3">
                      <div>
                        <p className="text-2xl font-black text-emerald-600 tabular-nums">+{formatCurrency(load.price)} <span className="text-xs">ر.س</span></p>
                        <ShipmentLink id={load.id} className="mt-1" />
                      </div>
                      <div className="flex gap-2 w-full md:w-auto">
                        <Button variant="outline" size="sm" onClick={() => setSelectedLoad(load)} className="rounded-xl border-blue-200 text-blue-600 font-bold hover:bg-blue-50 w-full md:w-auto"><Eye size={16} className="ml-1" /> التفاصيل</Button>
                        <Button variant="outline" size="sm" onClick={() => { setSelectedLoad(load); setShowRating(true); }} className="rounded-xl border-amber-200 text-amber-600 font-bold hover:bg-amber-50 w-full md:w-auto"><Star size={16} className="ml-1" /> تقييم</Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Modal التفاصيل */}
        <Dialog open={!!selectedLoad && !showRating} onOpenChange={() => setSelectedLoad(null)}>
          <DialogContent className="max-w-md rounded-[3rem] p-0 overflow-hidden border-none bg-white shadow-2xl text-right" dir="rtl">
            <DialogTitle className="sr-only">تفاصيل الرحلة السابقة</DialogTitle>
            <div className="p-6 bg-[#0f172a] text-white flex justify-between items-center">
              <h2 className="text-xl font-black">تفاصيل الرحلة السابقة</h2>
              <Button variant="ghost" size="icon" onClick={() => setSelectedLoad(null)} className="text-white rounded-full hover:bg-white/10">✕</Button>
            </div>
            {selectedLoad && (
              <div className="p-8 space-y-6">
                <div className="flex justify-between items-center pb-6 border-b border-slate-100">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1">المصدر</p>
                    <p className="text-lg font-black text-slate-800">{selectedLoad.origin}</p>
                  </div>
                  <div className="h-0.5 flex-1 mx-4 bg-slate-200" />
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1">الوجهة</p>
                    <p className="text-lg font-black text-slate-800">{selectedLoad.destination}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 rounded-2xl">
                    <p className="text-[10px] font-black text-slate-400 uppercase">الشاحن</p>
                    <p className="font-bold text-slate-800 mt-1">{selectedLoad.owner?.full_name || 'غير متوفر'}</p>
                  </div>
                  <div className="p-4 bg-emerald-50 rounded-2xl">
                    <p className="text-[10px] font-black text-emerald-600 uppercase">الأجر النهائي</p>
                    <p className="font-black text-emerald-700 mt-1 text-lg">{selectedLoad.price} ر.س</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl">
                    <p className="text-[10px] font-black text-slate-400 uppercase">نوع الحمولة</p>
                    <p className="font-bold text-slate-800 mt-1">{selectedLoad.package_type}</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl">
                    <p className="text-[10px] font-black text-slate-400 uppercase">الوزن</p>
                    <p className="font-bold text-slate-800 mt-1">{selectedLoad.weight} طن</p>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Modal التقييم */}
        <Dialog open={showRating} onOpenChange={(open) => { setShowRating(open); if (!open) { setSelectedLoad(null); setRatingValue(0); setRatingComment(''); } }}>
          <DialogContent className="max-w-md rounded-[3rem] p-8 text-center bg-white border-none shadow-2xl" dir="rtl">
            <div className="w-16 h-16 bg-amber-100 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Star size={32} />
            </div>
            <h3 className="text-2xl font-black text-slate-800 mb-2">كيف كانت تجربتك؟</h3>
            <p className="text-slate-500 font-bold text-sm mb-6">تقييمك للشاحن {selectedLoad?.owner?.full_name} يساعدنا في تحسين المنصة.</p>

            <div className="flex justify-center gap-2 mb-6" dir="ltr">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRatingValue(star)}
                  title={`تقييم ${star} نجوم`}
                  aria-label={`تقييم ${star} نجوم`}
                  className={`p-2 transition-transform hover:scale-110 ${ratingValue >= star ? 'text-amber-400' : 'text-slate-200'}`}
                >
                  <Star size={40} className={ratingValue >= star ? 'fill-current' : ''} />
                </button>
              ))}
            </div>

            <Textarea
              placeholder="اكتب ملاحظاتك عن الشاحن والرحلة (اختياري)..."
              value={ratingComment}
              onChange={(e) => setRatingComment(e.target.value)}
              className="min-h-[100px] mb-6 rounded-2xl bg-slate-50 border-slate-100 resize-none"
            />

            <Button
              onClick={handleRateSubmit}
              disabled={submittingRating || ratingValue === 0}
              className="w-full h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-lg"
            >
              {submittingRating ? <Loader2 className="animate-spin" /> : 'إرسال التقييم'}
            </Button>
          </DialogContent>
        </Dialog>

      </div>
    </AppLayout>
  );
}
