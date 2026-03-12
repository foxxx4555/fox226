import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import AppLayout from '@/components/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Truck, Plus, Trash2, ShieldCheck, X, User, Users, ClipboardCheck, Phone, Mail, Shield, Search, Wrench, CheckCircle2, AlertTriangle, ChevronsUpDown } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { api } from '@/services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandList, CommandItem, CommandInput } from "@/components/ui/command";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from '@/lib/utils';
import TypeSelectorGrid from '@/components/TypeSelectorGrid';
import DetailedTypeSelector from '@/components/DetailedTypeSelector';
import MaintenanceChat from '@/components/MaintenanceChat';
import { MessageCircle } from 'lucide-react';

import { useNavigate } from 'react-router-dom';

export default function DriverTrucks() {
  const navigate = useNavigate();
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
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [selectedBodyTypeId, setSelectedBodyTypeId] = useState('');
  const [selectedCommodityId, setSelectedCommodityId] = useState('');
  const [brand, setBrand] = useState('');
  const [operationCard, setOperationCard] = useState('');

  const [openTruckCat, setOpenTruckCat] = useState(false);
  const [openBodyType, setOpenBodyType] = useState(false);
  const [openCommodity, setOpenCommodity] = useState(false);

  // Categories & Body Types for selection
  const [categories, setCategories] = useState<any[]>([]);
  const [bodyTypes, setBodyTypes] = useState<any[]>([]);
  const [commodities, setCommodities] = useState<any[]>([]);

  const fetchFilters = async () => {
    try {
      const [catData, bodyData, commodityData] = await Promise.all([
        supabase.from('truck_categories').select('*').eq('is_active', true),
        supabase.from('load_body_types').select('*').eq('is_active', true),
        supabase.from('shipment_commodities').select('*').eq('is_active', true)
      ]);
      setCategories(catData.data || []);
      setBodyTypes(bodyData.data || []);
      setCommodities(commodityData.data || []);
    } catch (err) {
      console.error("Error fetching filters:", err);
    }
  };

  useEffect(() => {
    fetchFilters();
  }, []);

  const fetchManagementData = async () => {
    if (!userProfile?.id) return;
    setLoading(true);
    try {
      const [truckData, driverData, maintenanceData] = await Promise.all([
        supabase.from('trucks').select('*, truck_categories(name_ar), load_body_types(name_ar)').eq('owner_id', userProfile.id),
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

    // إضافة المستمع اللحظي للتحديثات الفورية
    const channel = supabase
      .channel('maintenance-realtime')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'maintenance_requests' },
        () => fetchManagementData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userProfile?.id]);

  // Filtered body types based on selected category
  const filteredBodyTypes = selectedCategoryId
    ? bodyTypes.filter(bt => bt.category_id === selectedCategoryId)
    : bodyTypes;

  // If a category is selected but no specific body types are found (DB not synced yet), 
  // we show a helpful fallback or the general list to prevent a dead-end
  const displayBodyTypes = (selectedCategoryId && filteredBodyTypes.length === 0)
    ? bodyTypes
    : filteredBodyTypes;

  const handleAddTruck = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload: any = {
        owner_id: userProfile?.id,
        plate_number: plateNumber,
        capacity: capacity,
        truck_category_id: selectedCategoryId || null,
        body_type_id: selectedBodyTypeId || null,
        commodity_id: selectedCommodityId || null,
        brand: brand,
        operation_card_number: operationCard
      };

      const { error } = await supabase.from('trucks').insert([payload]);
      if (error) throw error;

      toast.success('تمت إضافة الشاحنة بنجاح 🚛');
      setIsAdding(false);
      setPlateNumber(''); setCapacity(''); setSelectedCategoryId(''); setSelectedBodyTypeId(''); setSelectedCommodityId(''); setBrand(''); setOperationCard('');
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
      if (currentStatus === 'approved') {
        const { error } = await supabase.from('maintenance_requests' as any).update({ status: 'repaired' }).eq('id', requestId);
        if (error) throw error;

        // إرسال إشعار للإدارة
        try {
          const { data: adminRoles } = await supabase.from('user_roles').select('user_id').in('role', ['admin', 'super_admin', 'operations']);
          if (adminRoles && adminRoles.length > 0) {
            const adminIds = Array.from(new Set(adminRoles.map(r => r.user_id)));
            for (const adminId of adminIds) {
              await api.createNotification(
                adminId,
                "تم الانتهاء من الإصلاح 🔧",
                `قام السائق ${userProfile?.full_name} بالإبلاغ عن انتهاء إصلاح الشاحنة. يرجى المراجعة والاعتماد النهائي.`,
                'system'
              );
            }
          }
        } catch (notifErr) {
          console.error("Failed to send admin notifications:", notifErr);
        }

        toast.success("تم إرسال إشعار للإدارة بانتهاء الإصلاح ✅");
      }
      fetchManagementData();
    } catch (err) {
      toast.error("حدث خطأ أثناء التحديث");
    }
  };

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto pb-20 px-4 space-y-8">

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-sm border border-slate-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 md:w-14 md:h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shrink-0">
              <Shield size={24} className="md:w-8 md:h-8" />
            </div>
            <div>
              <h1 className="text-xl md:text-3xl font-black text-slate-900">إدارة الأسطول</h1>
              <p className="text-slate-500 font-bold mt-1 text-xs md:text-base">التحكم المركزي في المركبات والسائقين</p>
            </div>
          </div>
          <div className="relative w-full md:w-80">
            <Input
              placeholder="بحث باللوحة أو الاسم..."
              className="h-11 md:h-12 rounded-2xl bg-slate-50 border-none font-bold pr-11"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          </div>
        </div>

        <Tabs defaultValue="trucks" className="w-full" dir="rtl">
          <TabsList className="grid w-full grid-cols-3 h-14 md:h-16 bg-slate-100/50 rounded-2xl md:rounded-[1.5rem] p-1.5 mb-8 border border-slate-200/50">
            <TabsTrigger value="trucks" className="rounded-xl md:rounded-[1.2rem] font-black gap-2 data-[state=active]:bg-white data-[state=active]:shadow-lg text-[10px] sm:text-xs md:text-base">
              <Truck size={14} className="md:w-5 md:h-5" /> الشاحنات 
            </TabsTrigger>
            <TabsTrigger value="drivers" className="rounded-xl md:rounded-[1.2rem] font-black gap-2 data-[state=active]:bg-white data-[state=active]:shadow-lg text-[10px] sm:text-xs md:text-base">
              <Users size={14} className="md:w-5 md:h-5" /> السائقين
            </TabsTrigger>
            <TabsTrigger value="maintenance" className="rounded-xl md:rounded-[1.2rem] font-black gap-2 data-[state=active]:bg-white data-[state=active]:shadow-lg text-[10px] sm:text-xs md:text-base">
              <Wrench size={14} className={cn("md:w-5 md:h-5", maintenanceRequests.some(r => r.status !== 'resolved') ? "text-rose-500 animate-pulse" : "")} /> البلاغات
            </TabsTrigger>
          </TabsList>

          <TabsContent value="trucks" className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <h3 className="text-lg md:text-xl font-black">قائمة الشاحنات المتاحة</h3>
              <Button onClick={() => setIsAdding(true)} className="w-full sm:w-auto rounded-2xl bg-blue-600 hover:bg-blue-700 font-bold shadow-xl shadow-blue-100 h-12">
                <Plus size={20} className="ml-2" /> إدراج شاحنة جديدة
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
                      <p className="text-center text-slate-400 font-bold mb-6">
                        {truck.brand} - {truck.truck_categories?.name_ar || 'غير محدد'} ({truck.load_body_types?.name_ar || 'بدون محمل'})
                      </p>

                      <div className="grid grid-cols-2 gap-2 border-t pt-4">
                        <div className="text-right">
                          <p className="text-[10px] font-black text-slate-400">الحمولة</p>
                          <p className="font-bold">{truck.capacity} طن</p>
                        </div>
                        <div className="text-left">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              onClick={() => navigate(`/driver/maintenance?truck_id=${truck.id}`)}
                              className="text-orange-500 hover:bg-orange-50 rounded-xl"
                            >
                              <Wrench size={18} />
                            </Button>
                            <Button
                              variant="ghost"
                              onClick={() => handleDeleteTruck(truck.id, isAssigned)}
                              className="text-rose-500 hover:bg-rose-50 rounded-xl"
                            >
                              <Trash2 size={18} />
                            </Button>
                          </div>
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
              <Button onClick={() => navigate('/driver/maintenance')} className="rounded-2xl bg-orange-600 hover:bg-orange-700 font-bold shadow-xl shadow-orange-100">
                <Plus size={20} className="ml-2" /> إبلاغ عن عطل جديد
              </Button>
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
                    <div className={`absolute top-0 right-0 w-2 h-full ${req.status === 'resolved' ? 'bg-emerald-500' : (req.status === 'pending' || req.priority === 'critical') ? 'bg-rose-500' : 'bg-blue-500'}`}></div>
                    <div className="p-6 text-right">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <p className="text-xs font-black text-slate-400 mb-1">{new Date(req.created_at).toLocaleDateString('ar-SA')}</p>
                          <h4 className="text-lg font-black text-slate-900">{req.truck?.plate_number}</h4>
                        </div>
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${req.status === 'resolved' ? 'bg-emerald-50 text-emerald-500' : req.status === 'approved' ? 'bg-blue-50 text-blue-500' : 'bg-rose-50 text-rose-500'}`}>
                          {req.priority === 'critical' ? <AlertTriangle size={20} /> : <Wrench size={20} />}
                        </div>
                      </div>
                      <p className="text-sm font-bold text-slate-500 mb-2 leading-relaxed">المشكلة: {req.description}</p>

                      <div className="flex items-center justify-between mb-6">
                        <span className={`text-[10px] font-black px-3 py-1 rounded-full ${req.status === 'resolved' ? 'bg-emerald-100 text-emerald-700' :
                          req.status === 'approved' ? 'bg-blue-100 text-blue-700 animate-pulse' :
                            req.status === 'repaired' ? 'bg-amber-100 text-amber-700' :
                              'bg-slate-100 text-slate-600'
                          }`}>
                          {req.status === 'resolved' ? 'تم الإصلاح نهائياً' :
                            req.status === 'approved' ? 'معتمد - ابدأ الإصلاح' :
                              req.status === 'repaired' ? 'جاري مراجعة الإصلاح' :
                                'بانتظار موافقة الإدارة'}
                        </span>

                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="gap-2 font-bold text-blue-600 hover:bg-blue-50 rounded-xl">
                              <MessageCircle size={16} /> المحادثة
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="rounded-[2.5rem] p-0 overflow-hidden border-none max-w-lg">
                            <MaintenanceChat requestId={req.id} currentUserId={userProfile?.id || ''} />
                          </DialogContent>
                        </Dialog>
                      </div>

                      <div className="border-t pt-4">
                        {req.status === 'approved' ? (
                          <Button
                            className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black shadow-lg"
                            onClick={() => handleUpdateMaintenanceStatus(req.id, req.status)}
                          >
                            <CheckCircle2 className="ml-2" size={18} /> تم الإصلاح ✅
                          </Button>
                        ) : req.status === 'pending' ? (
                          <div className="text-center p-3 bg-slate-50 rounded-xl text-slate-400 font-bold text-xs">
                            يرجى انتظار موافقة الإدارة لبدء الإصلاح
                          </div>
                        ) : req.status === 'repaired' ? (
                          <div className="text-center p-3 bg-amber-50 rounded-xl text-amber-600 font-bold text-xs flex items-center justify-center gap-2">
                            🔔 بانتظار تأكيد الإدارة على انتهاء العمل
                          </div>
                        ) : (
                          <div className="text-center p-3 bg-emerald-50 rounded-xl text-emerald-600 font-bold text-xs">
                            تمت العملية بنجاح. شكراً لك!
                          </div>
                        )}
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
          <DialogContent className="max-w-2xl rounded-[3rem] p-0 overflow-hidden border-none bg-white shadow-2xl max-h-[90vh] flex flex-col">
            <DialogTitle className="sr-only">تسجيل شاحنة جديدة</DialogTitle>
            <div className="p-6 bg-[#0f172a] text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg"><Truck size={22} /></div>
                <h2 className="text-xl font-black">تسجيل شاحنة</h2>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setIsAdding(false)} className="text-white rounded-full"><X /></Button>
            </div>

            <form onSubmit={handleAddTruck} className="space-y-8 py-4 px-8 text-right overflow-y-auto flex-1 custom-scrollbar">
              {/* القسم الأول: هوية الشاحنة */}
              <div className="bg-slate-50/50 p-6 rounded-[2rem] border border-slate-100 space-y-4">
                <h3 className="text-sm font-black text-blue-600 uppercase tracking-widest flex items-center gap-2">
                  <span className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
                  هوية الشاحنة الأساسية
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="font-bold flex items-center gap-2">
                      <Truck size={16} className="text-slate-400" /> رقم اللوحة
                    </Label>
                    <Input required value={plateNumber} onChange={e => setPlateNumber(e.target.value)} className="h-14 rounded-2xl bg-white font-black text-center text-xl border-2 focus:border-blue-500 transition-all" placeholder="أ ب ج 1234" />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold">الماركة / الموديل</Label>
                    <Input value={brand} onChange={e => setBrand(e.target.value)} className="h-14 bg-white rounded-2xl text-right border-2" placeholder="مثلاً: مرسيدس 2024" />
                  </div>
                </div>
              </div>

              {/* القسم الثاني: تصنيف النقل */}
              <div className="space-y-12">
                {/* المستوى الأول: فئة الشاحنة */}
                <div className="space-y-4">
                  <Label className="text-xl font-black text-slate-800 flex items-center gap-3">
                    <Truck className="text-primary" size={24} />
                    اختر حجم الشاحنة المناسب
                  </Label>
                  <TypeSelectorGrid
                    items={categories}
                    selectedValue={selectedCategoryId}
                    onSelect={(id) => {
                      setSelectedCategoryId(id);
                      setSelectedBodyTypeId('');
                    }}
                    emptyMessage="لا يوجد فئات متاحة"
                    variant="large-horizontal"
                  />
                </div>

                {/* المستوى الثاني: نوع المحمل (يظهر بعد اختيار الفئة) */}
                <AnimatePresence>
                  {selectedCategoryId && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-4"
                    >
                      <Label className="text-xl font-black text-slate-800 flex items-center gap-3">
                        <CheckCircle2 className="text-amber-500" size={24} />
                        حدد نوع وتفاصيل الشاحنة
                      </Label>
                      <DetailedTypeSelector
                        items={displayBodyTypes}
                        selectedValue={selectedBodyTypeId}
                        onSelect={(id) => setSelectedBodyTypeId(id)}
                        emptyMessage="لا يوجد محامل متوفرة لهذه الفئة"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* المستوى الثالث: التخصص (اختياري) */}
                <AnimatePresence>
                  {selectedBodyTypeId && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-4"
                    >
                      <Label className="text-xl font-black text-slate-800 flex items-center gap-3">
                        <ClipboardCheck className="text-blue-500" size={24} />
                        تخصص الشحنات (اختياري)
                      </Label>
                      <TypeSelectorGrid
                        items={commodities}
                        selectedValue={selectedCommodityId}
                        onSelect={(id) => setSelectedCommodityId(id)}
                        emptyMessage="لا يوجد أنواع متاحة حالياً"
                        columns={3}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* القسم الثالث: بيانات التشغيل */}
              <div className="bg-amber-50/30 p-6 rounded-[2rem] border border-amber-100/50 space-y-4">
                <h3 className="text-sm font-black text-amber-600 uppercase tracking-widest flex items-center gap-2">
                  <span className="w-2 h-2 bg-amber-600 rounded-full animate-pulse" />
                  بيانات التشغيل والحمولة
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="font-bold flex items-center gap-2">
                      <ShieldCheck size={16} className="text-slate-400" /> رقم كرت التشغيل
                    </Label>
                    <Input value={operationCard} onChange={e => setOperationCard(e.target.value)} className="h-14 rounded-2xl bg-white text-right border-2" placeholder="أدخل رقم الكرت" />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold">السعة القصوى (طن)</Label>
                    <Input required type="number" value={capacity} onChange={e => setCapacity(e.target.value)} className="h-14 bg-white rounded-2xl text-right border-2 font-black" placeholder="مثلاً: 20" />
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <Button disabled={isSubmitting} className="w-full h-16 rounded-[2rem] bg-blue-600 hover:bg-blue-700 font-black text-xl text-white shadow-xl shadow-blue-200 transition-all hover:scale-[1.02] active:scale-[0.98]">
                  {isSubmitting ? (
                    <div className="flex items-center gap-3">
                      <Loader2 className="animate-spin" />
                      جاري الحفظ...
                    </div>
                  ) : "حفظ الشاحنة في الأسطول ✅"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

      </div>
    </AppLayout>
  );
}
