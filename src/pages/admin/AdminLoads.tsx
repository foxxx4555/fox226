import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import AdminLayout from '@/components/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Search, MapPin, Package, Clock, Truck, ShieldAlert, FileText, CheckCircle2, FileSignature, Edit } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ShipmentLink } from '@/components/utils/ShipmentLink';

// قاموس لترجمة الحالات في الإدارة
const statusTranslations: Record<string, string> = {
  pending: 'الانتظار',
  available: 'متاحة',
  accepted: 'تم القبول',
  in_progress: 'قيّد التنفيذ',
  completed: 'مكتملة',
  cancelled: 'ملغاة',
};

export default function AdminLoads() {
  const [searchParams] = useSearchParams();
  const initialSearch = searchParams.get('search') || '';
  const initialStatus = searchParams.get('status') || '';

  const [loads, setLoads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [showLoadDetails, setShowLoadDetails] = useState(false);
  const [selectedLoad, setSelectedLoad] = useState<any>(null);
  const [adminNotes, setAdminNotes] = useState('');

  // حالات الإلغاء الإجباري
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [loadToCancel, setLoadToCancel] = useState<string | null>(null);

  const fetchAllLoads = async () => {
    try {
      const { data, error } = await supabase
        .from('loads')
        .select(`
          *,
          shipper:profiles!loads_owner_id_fkey(full_name, phone),
          driver:profiles!loads_driver_id_fkey(full_name, phone)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLoads(data || []);
    } catch (err) {
      console.error(err);
      toast.error('حدث خطأ أثناء جلب الشحنات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllLoads();

    // استماع لحظي لتحديثات الشحنات كلوحة مراقبة حية
    const channel = supabase
      .channel('admin-loads-monitor')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'loads' }, () => {
        fetchAllLoads(); // تحديث تلقائي للوحة عند أي تغيير
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // تحديث البحث عند تغيير البارامترات في الرابط (للسماح بالتحويل من صفحات أخرى)
  useEffect(() => {
    const search = searchParams.get('search');
    if (search !== null) {
      setSearchQuery(search);
    }
  }, [searchParams]);

  const handleForceCancelClick = (id: string) => {
    setLoadToCancel(id);
    setCancelReason("");
    setShowCancelDialog(true);
  };

  const executeForceCancel = async () => {
    if (!loadToCancel) return;
    if (!cancelReason.trim()) {
      toast.error("يجب كتابة سبب الإلغاء لإرساله كإشعار");
      return;
    }

    try {
      // 1. تحديث حالة الشحنة
      const { error: loadError } = await supabase
        .from('loads')
        .update({ status: 'cancelled' })
        .eq('id', loadToCancel);

      if (loadError) throw loadError;

      // 2. إرسال إشعارات (Real-time) للأطراف
      const load = loads.find(l => l.id === loadToCancel);
      if (load) {
        const notifications = [];

        if (load.owner_id) { // إشعار التاجر
          notifications.push({
            user_id: load.owner_id,
            title: 'إلغاء إداري للشحنة ⚠️',
            message: `تم الإلغاء الإجباري لشحنتك المتجهة إلى ${load.destination}. السبب المذكور: ${cancelReason}`,
            type: 'system_alert'
          });
        }
        if (load.driver_id) { // إشعار السائق
          notifications.push({
            user_id: load.driver_id,
            title: 'إلغاء شحنة بواسطة الإدارة ⚠️',
            message: `تم إلغاء الشحنة المتجهة إلى ${load.destination} من قبل الإدارة. السبب المذكور: ${cancelReason}`,
            type: 'system_alert'
          });
        }

        if (notifications.length > 0) {
          await supabase.from('notifications' as any).insert(notifications);
        }
      }

      toast.success('تم الإلغاء الإجباري وإرسال الإشعارات للأطراف');
      setShowCancelDialog(false);
      setCancelReason('');
      setLoadToCancel(null);
    } catch (e) {
      toast.error('فشل الإلغاء الإجباري');
    }
  };

  const handleOpenDetails = (load: any) => {
    setSelectedLoad(load);
    setAdminNotes(load.admin_notes || '');
    setShowLoadDetails(true);
  };

  const handleSaveNotes = async () => {
    if (!selectedLoad) return;
    try {
      const { error } = await supabase
        .from('loads')
        .update({ admin_notes: adminNotes } as any)
        .eq('id', selectedLoad.id);

      if (error) throw error;
      toast.success('تم حفظ الملاحظات الإدارية وتحديث الشحنة');
      setShowLoadDetails(false);
    } catch (e) {
      toast.error('فشل حفظ الملاحظات (تأكد من إنشاء عمود admin_notes)');
    }
  };

  const filteredLoads = loads.filter(load => {
    const normalizedQuery = searchQuery.replace('#', '').toLowerCase();
    const matchesSearch = load.id.toLowerCase().includes(normalizedQuery) ||
      load.origin.toLowerCase().includes(normalizedQuery) ||
      load.destination.toLowerCase().includes(normalizedQuery) ||
      (load.shipper?.full_name || '').toLowerCase().includes(normalizedQuery);
    
    const matchesStatus = statusFilter ? load.status === statusFilter : true;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
      case 'available':
        return <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50"><Clock size={12} className="me-1" /> {statusTranslations[status]}</Badge>;
      // تم إزالة حالة accepted لأنها غير موجودة بالـ Enum
      case 'in_progress':
        return <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50"><Truck size={12} className="me-1" /> {statusTranslations[status]}</Badge>;
      case 'completed':
        return <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50"><CheckCircle2 size={12} className="me-1" /> {statusTranslations[status]}</Badge>;
      case 'cancelled':
      default:
        return <Badge variant="outline" className="text-rose-600 border-rose-200 bg-rose-50"><ShieldAlert size={12} className="me-1" /> {statusTranslations[status] || status}</Badge>;
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-8 max-w-7xl mx-auto pb-20">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">مراقبة الشحنات</h1>
            <p className="text-muted-foreground font-medium mt-1">تتبع كافة الشحنات في النظام والتدخل عند الحاجة</p>
          </div>

          <div className="relative w-full md:w-96">
            <Input
              placeholder="ابحث برقم الشحنة، المدينة، التاجر..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-12 pl-12 pr-4 bg-white border-slate-200 rounded-xl font-bold shadow-sm w-full"
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-blue-600" size={48} />
          </div>
        ) : filteredLoads.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-[3rem] border-2 border-dashed border-slate-200">
            <FileText size={64} className="mx-auto text-slate-300 mb-4" />
            <p className="font-bold text-slate-500 text-lg">لا توجد طلبات مطابقة للبحث</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {filteredLoads.map(load => (
              <Card key={load.id} className="rounded-[2rem] border-none shadow-md hover:shadow-xl transition-all bg-white overflow-hidden">
                <div className="p-6 border-b border-slate-50 flex flex-col md:flex-row justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      {getStatusBadge(load.status)}
                      <ShipmentLink id={load.id} />
                      <span className="text-xs font-bold text-slate-400">{new Date(load.created_at).toLocaleDateString('ar-SA')}</span>
                    </div>
                    <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                      {load.origin} <MapPin size={16} className="text-blue-600" /> {load.destination}
                    </h3>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-2xl text-emerald-500">{load.price} <span className="text-sm">ر.س</span></p>
                  </div>
                </div>

                <div className="p-6 bg-slate-50 flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="flex gap-8 w-full md:w-auto">
                    <div>
                      <p className="text-[10px] font-black tracking-wider text-slate-400 uppercase mb-1">التاجر (الشاحن)</p>
                      <p className="font-bold text-slate-800 text-sm">{load.shipper?.full_name || 'غير معروف'}</p>
                      <p className="font-bold text-slate-500 text-xs" dir="ltr">{load.shipper?.phone}</p>
                    </div>
                    <div className="w-px bg-slate-200"></div>
                    <div>
                      <p className="text-[10px] font-black tracking-wider text-slate-400 uppercase mb-1">الناقل (السائق)</p>
                      <p className="font-bold text-slate-800 text-sm">{load.driver?.full_name || 'لم يحدد بعد'}</p>
                      <p className="font-bold text-slate-500 text-xs" dir="ltr">{load.driver?.phone || '---'}</p>
                    </div>
                  </div>

                  <div className="flex gap-2 w-full md:w-auto">
                    <Button onClick={() => handleOpenDetails(load)} variant="outline" className="h-10 rounded-xl font-bold border-slate-200 hover:bg-white text-slate-600">
                      تفاصيل أکثر
                    </Button>
                    {['pending', 'available', 'in_progress'].includes(load.status) && (
                      <Button onClick={() => handleForceCancelClick(load.id)} variant="outline" className="h-10 rounded-xl font-bold border-rose-200 hover:bg-rose-50 text-rose-500">
                        <ShieldAlert size={16} className="me-2" /> إلغاء إجباري
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={showLoadDetails} onOpenChange={setShowLoadDetails}>
          <DialogContent className="max-w-3xl w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto rounded-[2rem] sm:rounded-[2.5rem] p-4 sm:p-8" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-2xl sm:text-3xl font-black text-slate-900 border-b pb-4 mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <span>تفاصيل الشحنة</span>
                <ShipmentLink id={selectedLoad?.id} className="text-lg py-1.5" />
              </DialogTitle>
            </DialogHeader>

            {selectedLoad && (
              <div className="space-y-6 sm:space-y-8">
                <div className="flex flex-wrap gap-2 sm:gap-4">
                  {getStatusBadge(selectedLoad.status)}
                  <Badge variant="outline" className="font-bold text-slate-600 bg-slate-50">
                    <Clock size={16} className="me-2" /> 
                    نشرت في {selectedLoad.created_at ? new Date(selectedLoad.created_at).toLocaleDateString('ar-SA') : '---'}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 bg-slate-50 p-4 sm:p-6 rounded-3xl border border-slate-100">
                  <div className="space-y-4">
                    <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2">معلومات النقل</p>
                    <div className="flex flex-col gap-5">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 shrink-0 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shadow-sm"><MapPin size={20} /></div>
                        <div>
                          <p className="text-xs text-slate-400 font-bold mb-0.5">من (نقطة الانطلاق)</p>
                          <p className="font-black text-slate-800 text-lg">{selectedLoad.origin}</p>
                          <p className="text-sm text-slate-500 font-bold">{selectedLoad.pickup_date ? new Date(selectedLoad.pickup_date).toLocaleDateString('ar-SA') : 'غير محدد'}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 shrink-0 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-sm"><MapPin size={20} /></div>
                        <div>
                          <p className="text-xs text-slate-400 font-bold mb-0.5">إلى (نقطة الوصول)</p>
                          <p className="font-black text-slate-800 text-lg">{selectedLoad.destination}</p>
                          <p className="text-sm text-slate-500 font-bold">{selectedLoad.delivery_date ? new Date(selectedLoad.delivery_date).toLocaleDateString('ar-SA') : 'غير محدد'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="pt-4 md:pt-0 md:border-r md:pr-6 border-slate-200">
                    <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-4">تفاصيل الشحنة والوزن</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white p-3 rounded-2xl border border-slate-100">
                        <p className="text-[10px] font-black text-slate-400 mb-1">نوع الشاحنة</p>
                        <p className="font-bold text-slate-900 text-sm">{selectedLoad.truck_type?.replace('_', ' ') || 'غير محدد'}</p>
                      </div>
                      <div className="bg-white p-3 rounded-2xl border border-slate-100">
                        <p className="text-[10px] font-black text-slate-400 mb-1">الوزن</p>
                        <p className="font-bold text-slate-900 text-sm">{selectedLoad.weight || 0} كجم</p>
                      </div>
                      <div className="bg-emerald-50 p-3 rounded-2xl border border-emerald-100 col-span-2">
                        <p className="text-[10px] font-black text-emerald-600 mb-1">إجمالي السعر</p>
                        <p className="font-black text-emerald-700 text-2xl">{selectedLoad.price} <span className="text-xs">ر.س</span></p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-5 border-2 border-slate-50 rounded-3xl bg-white hover:border-blue-100 transition-colors group">
                    <h4 className="font-black text-slate-800 mb-3 flex items-center gap-2 group-hover:text-blue-600 transition-colors"><Package size={18} /> تفاصيل الشاحن</h4>
                    <p className="font-black text-slate-800">{selectedLoad.shipper?.full_name || 'غير معروف'}</p>
                    <p className="text-slate-500 text-sm font-bold mt-1 tracking-tight" dir="ltr">{selectedLoad.shipper?.phone}</p>
                  </div>
                  <div className="p-5 border-2 border-slate-50 rounded-3xl bg-white hover:border-emerald-100 transition-colors group">
                    <h4 className="font-black text-slate-800 mb-3 flex items-center gap-2 group-hover:text-emerald-600 transition-colors"><Truck size={18} /> تفاصيل الناقل</h4>
                    <p className="font-black text-slate-800">{selectedLoad.driver?.full_name || 'بانتظار القبول'}</p>
                    <p className="text-slate-500 text-sm font-bold mt-1 tracking-tight" dir="ltr">{selectedLoad.driver?.phone || '---'}</p>
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t border-slate-100">
                  <Label className="font-black text-slate-800 text-lg flex items-center gap-2">
                    <Edit size={20} className="text-blue-500" />
                    ملاحظات إدارية (مخفية)
                  </Label>
                  <Textarea
                    placeholder="أضف ملاحظاتك حول الشحنة هنا..."
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    className="h-32 rounded-2xl border-2 border-slate-100 focus:border-blue-400 bg-slate-50 font-bold p-4 resize-none transition-all"
                  />
                </div>
              </div>
            )}

            <DialogFooter className="mt-8 pt-6 border-t border-slate-100 flex flex-col sm:flex-row gap-3">
              <div className="flex flex-col sm:flex-row gap-2 w-full">
                <Button onClick={() => window.open(`https://maps.google.com/?q=${selectedLoad?.destination}`, '_blank')} variant="outline" className="h-12 flex-1 rounded-xl font-bold border-2 border-slate-100 hover:bg-slate-50 text-slate-700">
                  <MapPin size={18} className="me-2 text-blue-500" /> الخريطة
                </Button>
                <Button onClick={() => toast.success('جاري عرض بوليصة الشحن...')} variant="outline" className="h-12 flex-1 rounded-xl font-bold border-2 border-slate-100 hover:bg-slate-50">
                  <FileSignature size={18} className="me-2 text-slate-600" /> البوليصة
                </Button>
                <Button onClick={handleSaveNotes} className="h-12 flex-[1.5] rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-lg shadow-lg shadow-slate-200">
                  حفظ التعديلات
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* --- مربع حوار تحديد سبب الإلغاء --- */}
        <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
          <DialogContent className="max-w-md rounded-3xl p-6" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-xl font-black text-rose-600 flex items-center gap-2">
                <ShieldAlert size={24} />
                تأكيد الإلغاء الإداري الإجباري
              </DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <p className="font-bold text-slate-600">سيتم إلغاء هذه الشحنة وإشعار التاجر والسائق بالسبب فوراً.</p>
              <div className="space-y-2">
                <Label className="font-bold text-slate-700 mx-1">سبب الإلغاء (سيظهر للأطراف المعنية)</Label>
                <Textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="السبب (مثال: الشحنة مخالفة للقوانين، أو بطلب من المستخدم، ...)"
                  className="h-28 rounded-2xl border-2 border-slate-200 bg-slate-50 resize-none font-bold p-4"
                />
              </div>
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2 mt-4">
              <Button onClick={() => setShowCancelDialog(false)} variant="outline" className="h-12 flex-1 rounded-xl font-bold bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100">
                تراجع
              </Button>
              <Button onClick={executeForceCancel} disabled={!cancelReason.trim()} className="h-12 flex-1 rounded-xl font-black bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-50 border-0">
                تأكيد الإلغاء وإرسال الإشعار
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </AdminLayout>
  );
}
