import { useEffect, useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Search, MapPin, Package, Clock, Truck, ShieldAlert, FileText, CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

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
  const [loads, setLoads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

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
  }, []);

  const handleForceCancel = async (id: string) => {
    if (!confirm("تحذير: هل أنت متأكد من إلغاء هذه الشحنة إجبارياً من قبل الإدارة؟")) return;

    try {
      const { error } = await supabase.from('loads').update({ status: 'cancelled' }).eq('id', id);
      if (error) throw error;
      toast.success('تم إلغاء الشحنة بنجاح');
      fetchAllLoads();
    } catch (e) {
      toast.error('فشل الإلغاء');
    }
  };

  const filteredLoads = loads.filter(load =>
    load.id.includes(searchQuery) ||
    load.origin.includes(searchQuery) ||
    load.destination.includes(searchQuery) ||
    (load.shipper?.full_name || '').includes(searchQuery)
  );

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
                      <span className="text-xs font-black text-slate-400 capitalize">#{load.id.substring(0, 8)}</span>
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
                    <Button variant="outline" className="h-10 rounded-xl font-bold border-slate-200 hover:bg-white text-slate-600">
                      تفاصيل أکثر
                    </Button>
                    {['pending', 'available', 'in_progress'].includes(load.status) && (
                      <Button onClick={() => handleForceCancel(load.id)} variant="outline" className="h-10 rounded-xl font-bold border-rose-200 hover:bg-rose-50 text-rose-500">
                        <ShieldAlert size={16} className="me-2" /> إلغاء إجباري
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
