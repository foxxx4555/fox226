import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import AppLayout from '@/components/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Truck, Plus, Trash2, ShieldCheck, X, User, Users, ClipboardCheck, Phone, Mail, Shield, Search, Wrench, CheckCircle2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { api } from '@/services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function DriverTrucks() {
  const { userProfile } = useAuth();
  const [trucks, setTrucks] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [maintenanceRequests, setMaintenanceRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  // Add Truck State
  const [isAdding, setIsAdding] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [plateNumber, setPlateNumber] = useState('');
  const [capacity, setCapacity] = useState('');
  const [truckType, setTruckType] = useState('flatbed');
  const [brand, setBrand] = useState('');
  const [operationCard, setOperationCard] = useState('');

  const fetchManagementData = async () => {
    if (!userProfile?.id) return;
    setLoading(true);
    try {
      const [truckData, driverData, maintenanceData] = await Promise.all([
        supabase.from('trucks').select('*').eq('owner_id', userProfile.id),
        supabase.from('sub_drivers' as any).select('*').eq('carrier_id', userProfile.id),
        api.getCarrierMaintenanceRequests(userProfile.id)
      ]);

      setTrucks(truckData.data || []);
      setDrivers(driverData.data || []);
      setMaintenanceRequests(maintenanceData || []);
    } catch (err) {
      console.error("Database Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchManagementData();
  }, [userProfile?.id]);

  const handleAddTruck = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload: any = {
        owner_id: userProfile?.id,
        plate_number: plateNumber,
        capacity: capacity,
        truck_type: truckType,
        brand: brand,
        operation_card_number: operationCard
      };

      const { error } = await supabase.from('trucks').insert([payload]);
      if (error) throw error;

      toast.success('تمت إضافة الشاحنة بنجاح 🚛');
      setIsAdding(false);
      setPlateNumber(''); setCapacity(''); setTruckType('flatbed'); setBrand(''); setOperationCard('');
      fetchManagementData();
    } catch (err: any) {
      toast.error(`حدث خطأ: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTruck = async (id: string, isAssigned: boolean) => {
    if (isAssigned) {
      toast.error('لا يمكن حذف الشاحنة وهي مرتبطة بسائق حالياً. قم بإلغاء الربط أولاً.');
      return;
    }
    if (!confirm("هل أنت متأكد من الحذف؟")) return;
    await supabase.from('trucks').delete().eq('id', id);
    toast.success("تم الحذف");
    fetchManagementData();
  };

  const filteredTrucks = trucks.filter(t => t.plate_number.includes(query) || t.brand?.toLowerCase().includes(query.toLowerCase()));
  const filteredDrivers = drivers.filter(d => d.driver_name.includes(query) || d.driver_phone.includes(query));

  const handleAssignTruck = async (driverId: string, truckId: string) => {
    try {
      const assigned_truck_id = truckId === 'none' ? null : truckId;
      const { error } = await supabase.from('sub_drivers' as any).update({ assigned_truck_id }).eq('id', driverId);
      if (error) throw error;
      toast.success(assigned_truck_id ? "تم ربط السائق بالشاحنة بنجاح 🚚" : "تم إلغاء ربط الشاحنة");
      fetchManagementData();
    } catch (e: any) {
      toast.error("فشل التحديث: " + e.message);
    }
  };

  const handleUpdateMaintenanceStatus = async (requestId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'pending' ? 'in_progress' : currentStatus === 'in_progress' ? 'resolved' : 'pending';
      await api.updateMaintenanceStatus(requestId, newStatus);
      toast.success("تم تحديث حالة البلاغ بنجاح");
      fetchManagementData();
    } catch (err) {
      toast.error("حدث خطأ أثناء التحديث");
    }
  };

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto pb-20 px-4 space-y-8">

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
          <div>
            <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
              <Shield className="text-blue-600" size={32} /> إدارة الأسطول
            </h1>
            <p className="text-slate-500 font-bold mt-1">التحكم المركزي في المركبات وطاقم السائقين</p>
          </div>
          <div className="relative w-full md:w-80">
            <Input
              placeholder="بحث باللوحة أو الاسم..."
              className="h-12 rounded-2xl bg-slate-50 border-none font-bold pr-12"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          </div>
        </div>

        <Tabs defaultValue="trucks" className="w-full" dir="rtl">
          <TabsList className="grid w-full grid-cols-3 h-16 bg-slate-100 rounded-[1.5rem] p-1.5 mb-8">
            <TabsTrigger value="trucks" className="rounded-[1.2rem] font-black gap-2 data-[state=active]:bg-white data-[state=active]:shadow-lg text-sm md:text-base">
              <Truck size={18} /> الشاحنات ({trucks.length})
            </TabsTrigger>
            <TabsTrigger value="drivers" className="rounded-[1.2rem] font-black gap-2 data-[state=active]:bg-white data-[state=active]:shadow-lg text-sm md:text-base">
              <Users size={18} /> السائقين ({drivers.length})
            </TabsTrigger>
            <TabsTrigger value="maintenance" className="rounded-[1.2rem] font-black gap-2 data-[state=active]:bg-white data-[state=active]:shadow-lg text-sm md:text-base">
              <Wrench size={18} className={maintenanceRequests.some(r => r.status !== 'resolved') ? "text-rose-500 animate-pulse" : ""} /> بلاغات الأعطال
            </TabsTrigger>
          </TabsList>

          <TabsContent value="trucks" className="space-y-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-black">قائمة الشاحنات المتاحة</h3>
              <Button onClick={() => setIsAdding(true)} className="rounded-2xl bg-blue-600 hover:bg-blue-700 font-bold shadow-xl shadow-blue-100">
                <Plus size={20} className="ml-2" /> تسجيل شاحنة جديدة
              </Button>
            </div>

            {loading ? (
              <div className="py-20 text-center"><Loader2 className="animate-spin mx-auto" /></div>
            ) : trucks.length === 0 ? (
              <div className="py-24 bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200 text-center flex flex-col items-center justify-center p-10">
                <Truck size={64} className="text-slate-200 mb-4" />
                <p className="text-slate-400 font-black">لا توجد شاحنات مسجلة</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  onClick={() => setIsAdding(true)}
                  className="cursor-pointer border-2 border-dashed border-blue-200 rounded-[2.5rem] flex flex-col items-center justify-center p-10 hover:bg-blue-50 transition-all group"
                >
                  <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <Plus size={32} />
                  </div>
                  <p className="font-black text-blue-600">تسجيل مركبة جديدة</p>
                </motion.div>
                {filteredTrucks.map(truck => {
                  const isAssigned = drivers.some(d => d.assigned_truck_id === truck.id);
                  return (
                    <Card key={truck.id} className="rounded-[2.5rem] border-none shadow-xl bg-white p-6 relative group overflow-hidden">
                      <div className="absolute top-0 right-0 w-2 h-full bg-blue-500" />
                      <div className="flex justify-between items-start mb-6">
                        <Badge className={`border-none ${isAssigned ? "bg-amber-100 text-amber-600" : "bg-emerald-100 text-emerald-600"}`}>
                          {isAssigned ? "في رحلة / مرتبطة" : "متاحة للعمل"}
                        </Badge>
                        <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-lg">
                          <Truck size={24} />
                        </div>
                      </div>

                      <h3 className="text-3xl font-black text-center mb-2 tracking-widest uppercase">{truck.plate_number}</h3>
                      <p className="text-center text-slate-400 font-bold mb-6">{truck.brand} - {truck.truck_type}</p>

                      <div className="grid grid-cols-2 gap-2 border-t pt-4">
                        <div className="text-right">
                          <p className="text-[10px] font-black text-slate-400">الحمولة</p>
                          <p className="font-bold">{truck.capacity} طن</p>
                        </div>
                        <div className="text-left">
                          <Button
                            variant="ghost"
                            onClick={() => handleDeleteTruck(truck.id, isAssigned)}
                            className="text-rose-500 hover:bg-rose-50 rounded-xl"
                          >
                            <Trash2 size={18} />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="drivers" className="space-y-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-black">طاقم السائقين</h3>
              <Button onClick={() => window.location.href = '/driver/add-driver'} className="rounded-2xl bg-slate-900 border-none font-bold">
                <Plus size={20} className="ml-2" /> إضافة سائق جديد
              </Button>
            </div>

            {loading ? (
              <div className="py-20 text-center"><Loader2 className="animate-spin mx-auto" /></div>
            ) : drivers.length === 0 ? (
              <div className="py-24 bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200 text-center flex flex-col items-center justify-center p-10">
                <Users size={64} className="text-slate-200 mb-4" />
                <p className="text-slate-400 font-black">لم يتم إضافة سائقين بعد</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredDrivers.map(driver => (
                  <Card key={driver.id} className="rounded-[2.5rem] border-none shadow-xl bg-white p-6 relative group overflow-hidden">
                    <div className="absolute top-0 right-0 w-2 h-full bg-emerald-500" />
                    <div className="flex justify-between items-center">
                      <div className="space-y-3 flex-1 text-right pr-4">
                        <div className="flex items-center gap-2 justify-end">
                          <span className="text-xl font-black">{driver.driver_name}</span>
                          <User size={18} className="text-emerald-500" />
                        </div>
                        <p className="text-slate-500 font-bold">{driver.driver_phone}</p>
                        <div className="flex items-center justify-end gap-2 mt-2">
                          <Select
                            value={driver.assigned_truck_id || 'none'}
                            onValueChange={(val) => handleAssignTruck(driver.id, val)}
                          >
                            <SelectTrigger className="h-10 text-xs font-black bg-slate-50 border-slate-200 rounded-xl w-[200px]" dir="rtl">
                              <SelectValue placeholder="إسناد شاحنة..." />
                            </SelectTrigger>
                            <SelectContent dir="rtl">
                              <SelectItem value="none" className="text-rose-500 font-bold">بدون شاحنة (غير نشط)</SelectItem>
                              {trucks.map(t => (
                                <SelectItem key={t.id} value={t.id} className="font-bold">شاحنة: {t.plate_number}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="w-16 h-16 bg-emerald-50 rounded-[1.8rem] flex items-center justify-center text-emerald-600 shadow-inner shrink-0 ml-4">
                        <Users size={32} />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="maintenance" className="space-y-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-black">تقارير الصيانة وبلاغات الأعطال</h3>
            </div>

            {loading ? (
              <div className="py-20 text-center"><Loader2 className="animate-spin mx-auto text-rose-500" /></div>
            ) : maintenanceRequests.length === 0 ? (
              <div className="py-24 bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200 text-center flex flex-col items-center justify-center p-10">
                <ShieldCheck size={64} className="text-slate-200 mb-4" />
                <p className="text-slate-400 font-black">لا توجد بلاغات أعطال.. شاحناتك تعمل بكفاءة!</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {maintenanceRequests.map(req => (
                  <Card key={req.id} className="rounded-[2rem] border-none shadow-xl bg-white overflow-hidden relative group">
                    <div className={`absolute top-0 right-0 w-2 h-full ${req.status === 'resolved' ? 'bg-emerald-500' : req.priority === 'critical' ? 'bg-rose-500' : 'bg-amber-500'}`}></div>
                    <div className="p-6 text-right">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <p className="text-xs font-black text-slate-400 mb-1">{new Date(req.created_at).toLocaleDateString('ar-SA')}</p>
                          <h4 className="text-lg font-black text-slate-900">{req.truck?.plate_number}</h4>
                        </div>
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${req.status === 'resolved' ? 'bg-emerald-50 text-emerald-500' : req.priority === 'critical' ? 'bg-rose-50 text-rose-500 animate-pulse' : 'bg-amber-50 text-amber-500'}`}>
                          {req.priority === 'critical' && req.status !== 'resolved' ? <AlertTriangle size={20} /> : <Wrench size={20} />}
                        </div>
                      </div>
                      <p className="text-sm font-bold text-slate-500 mb-2 leading-relaxed">المشكلة: {req.description}</p>
                      <p className="text-xs font-bold text-slate-400 mb-6 flex items-center gap-1 justify-end"><User size={12} /> {req.driver?.full_name}</p>

                      <div className="border-t pt-4 flex justify-between items-center">
                        <span className={`text-xs font-black px-3 py-1 rounded-full ${req.status === 'resolved' ? 'bg-emerald-100 text-emerald-700' : req.status === 'in_progress' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                          {req.status === 'resolved' ? 'تم الإصلاح' : req.status === 'in_progress' ? 'جاري الفحص' : 'بانتظار الموافقة'}
                        </span>
                        <Button
                          variant={req.status === 'resolved' ? 'outline' : 'default'}
                          size="sm"
                          className={`rounded-xl font-bold ${req.status !== 'resolved' ? 'bg-slate-900 hover:bg-slate-800 text-white' : ''}`}
                          onClick={() => handleUpdateMaintenanceStatus(req.id, req.status)}
                        >
                          {req.status === 'pending' ? 'بدء الإصلاح' : req.status === 'in_progress' ? 'إغلاق البلاغ ✅' : 'إعادة الفتح'}
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Dialog إضافة شاحنة */}
        <Dialog open={isAdding} onOpenChange={setIsAdding}>
          <DialogContent className="max-w-md rounded-[3rem] p-0 overflow-hidden border-none bg-white shadow-2xl">
            <div className="p-6 bg-[#0f172a] text-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg"><Truck size={22} /></div>
                <h2 className="text-xl font-black">تسجيل شاحنة</h2>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setIsAdding(false)} className="text-white rounded-full"><X /></Button>
            </div>

            <form onSubmit={handleAddTruck} className="p-8 space-y-5 text-right">
              <div className="space-y-2">
                <Label className="font-bold">رقم اللوحة</Label>
                <Input required value={plateNumber} onChange={e => setPlateNumber(e.target.value)} className="h-14 rounded-2xl bg-slate-50 font-bold text-center text-xl" placeholder="أ ب ج 1234" />
              </div>
              <div className="space-y-2">
                <Label className="font-bold">رقم كرت التشغيل</Label>
                <Input value={operationCard} onChange={e => setOperationCard(e.target.value)} className="h-12 rounded-xl bg-slate-50 text-right" placeholder="أدخل رقم الكرت" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-bold">نوع الشاحنة</Label>
                  <Select value={truckType} onValueChange={setTruckType}>
                    <SelectTrigger className="h-12 bg-slate-50 rounded-xl px-4" dir="rtl"><SelectValue /></SelectTrigger>
                    <SelectContent dir="rtl"><SelectItem value="flatbed">سطحة</SelectItem><SelectItem value="box">صندوق</SelectItem><SelectItem value="refrigerated">براد</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="font-bold">السعة (طن)</Label>
                  <Input required type="number" value={capacity} onChange={e => setCapacity(e.target.value)} className="h-12 bg-slate-50 text-right" />
                </div>
              </div>
              <Button disabled={isSubmitting} className="w-full h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 font-extrabold text-lg mt-4 text-white">
                {isSubmitting ? <Loader2 className="animate-spin" /> : "حفظ الشاحنة ✅"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

      </div>
    </AppLayout>
  );
}
