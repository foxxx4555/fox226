import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import AppLayout from '@/components/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Truck, Plus, Trash2, ShieldCheck, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function DriverTrucks() {
  const { userProfile } = useAuth();
  const [trucks, setTrucks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Add Truck State
  const [isAdding, setIsAdding] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [plateNumber, setPlateNumber] = useState('');
  const [capacity, setCapacity] = useState('');
  const [truckType, setTruckType] = useState('flatbed');

  const fetchTrucks = async () => {
    if (!userProfile?.id) return;
    try {
      const { data, error } = await supabase
        .from('trucks')
        .select('*')
        .eq('owner_id', userProfile.id);

      if (error) throw error;
      setTrucks(data || []);
    } catch (err) {
      console.error("Database Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrucks();
  }, [userProfile?.id]);

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذه الشاحنة؟")) return;
    try {
      const { error } = await supabase.from('trucks').delete().eq('id', id);
      if (error) throw error;
      toast.success("تم حذف الشاحنة بنجاح");
      fetchTrucks();
    } catch (e) {
      toast.error("فشل الحذف");
    }
  };

  const handleAddTruck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plateNumber || !capacity) return toast.error('يرجى تعبئة الحقول المطلوبة');
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('trucks').insert({
        owner_id: userProfile?.id,
        plate_number: plateNumber,
        capacity: Number(capacity),
        truck_type: truckType
      } as any);
      if (error) throw error;
      toast.success('تمت إضافة الشاحنة بنجاح');
      setIsAdding(false);
      setPlateNumber(''); setCapacity(''); setTruckType('flatbed');
      fetchTrucks();
    } catch (err) {
      toast.error('حدث خطأ أثناء الإضافة');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-8 max-w-4xl mx-auto pb-20">
        <div className="flex justify-between items-center px-4">
          <Button onClick={() => setIsAdding(true)} className="rounded-2xl bg-blue-600 hover:bg-blue-700 h-12 px-6 gap-2 shadow-lg shadow-blue-100 font-bold">
            <Plus size={20} /> إضافة شاحنة جديدة
          </Button>
          <h1 className="text-3xl font-black text-slate-900 text-right">شاحناتي</h1>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-blue-600" size={48} />
          </div>
        ) : trucks.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-[3rem] border-2 border-dashed border-slate-200 text-slate-400 font-bold mx-4">
            <Truck size={64} className="mx-auto mb-4 opacity-20" />
            <p>لا توجد شاحنات مسجلة حالياً</p>
            <p className="text-sm font-medium mt-2">قم بإضافة شاحنتك لتبدأ في استقبال الطلبات</p>
          </div>
        ) : (
          <div className="grid gap-6 px-4">
            <AnimatePresence>
              {trucks.map((truck) => (
                <motion.div key={truck.id} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
                  <Card className="rounded-[2.5rem] border-none shadow-xl bg-white overflow-hidden border-r-8 border-r-blue-500">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-center">
                        <div className="flex gap-2">
                          <Button
                            variant="ghost" size="icon"
                            className="h-12 w-12 rounded-full bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white transition-all shadow-sm border border-rose-100"
                            onClick={() => handleDelete(truck.id)}
                          >
                            <Trash2 size={20} />
                          </Button>
                        </div>

                        <div className="text-right flex items-center gap-5">
                          <div>
                            <div className="flex items-center gap-2 justify-end mb-1">
                              <ShieldCheck size={16} className="text-emerald-500" />
                              <p className="font-black text-2xl text-slate-800">{truck.plate_number}</p>
                            </div>
                            <p className="text-slate-500 font-bold bg-slate-100 px-3 py-1 rounded-full text-sm inline-block">
                              {truck.truck_type === 'flatbed' ? 'سطحة' : truck.truck_type === 'curtain' ? 'ستارة' : truck.truck_type === 'refrigerated' ? 'مبرد' : 'أخرى'} - {truck.capacity} طن
                            </p>
                          </div>
                          <div className="p-5 bg-blue-50 text-blue-600 rounded-[2rem] shadow-inner">
                            <Truck size={35} />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        <Dialog open={isAdding} onOpenChange={setIsAdding}>
          <DialogContent className="max-w-md rounded-[3rem] p-0 overflow-hidden border-none bg-white shadow-2xl">
            <div className="p-6 bg-[#0f172a] text-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20"><Truck size={22} /></div>
                <div>
                  <h2 className="text-xl font-black leading-none">إضافة شاحنة جديدة</h2>
                  <p className="text-[10px] text-slate-400 font-bold mt-1">أدخل بيانات الشاحنة للبدء في تلقي الطلبات</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setIsAdding(false)} className="text-white hover:bg-white/10 rounded-full"><X /></Button>
            </div>

            <form onSubmit={handleAddTruck} className="p-8 space-y-6">
              <div className="space-y-4 text-right">
                <div>
                  <Label className="text-slate-500 font-bold mb-2 block">رقم اللوحة</Label>
                  <Input required value={plateNumber} onChange={e => setPlateNumber(e.target.value)} className="h-14 rounded-2xl bg-slate-50 border-slate-200 font-bold text-center text-xl tracking-widest placeholder:tracking-normal w-full" placeholder="مثال: أ ب ج 1234" dir="rtl" />
                </div>

                <div>
                  <Label className="text-slate-500 font-bold mb-2 block">سعة الحمولة (بالطن)</Label>
                  <Input required type="number" min="1" max="100" value={capacity} onChange={e => setCapacity(e.target.value)} className="h-14 rounded-2xl bg-slate-50 border-slate-200 font-bold text-right" placeholder="أدخل قدرة التحميل بالطن..." />
                </div>

                <div>
                  <Label className="text-slate-500 font-bold mb-2 block">نوع الشاحنة</Label>
                  <Select value={truckType} onValueChange={setTruckType}>
                    <SelectTrigger className="h-14 rounded-2xl bg-slate-50 border-slate-200 font-bold" dir="rtl">
                      <SelectValue placeholder="اختر نوع الشاحنة" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-none shadow-xl font-bold" dir="rtl">
                      <SelectItem value="flatbed">سطحة (Flatbed)</SelectItem>
                      <SelectItem value="curtain">ستارة (Curtain)</SelectItem>
                      <SelectItem value="refrigerated">مبرد (Refrigerated)</SelectItem>
                      <SelectItem value="box">صندوق (Box)</SelectItem>
                      <SelectItem value="tank">صهريج (Tank)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button type="submit" disabled={isSubmitting} className="w-full h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 font-black text-lg gap-2 shadow-xl shadow-blue-600/20 transition-all">
                {isSubmitting ? <Loader2 className="animate-spin" /> : <><Plus size={20} /> حفظ الشاحنة</>}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

      </div>
    </AppLayout>
  );
}
