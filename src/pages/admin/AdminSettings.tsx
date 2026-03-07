import { useState, useEffect, useMemo } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  Settings, Map, Bell, Globe, Save, HelpCircle,
  TrendingUp, Zap, Plus, Trash2, Search, AlertTriangle,
  ArrowRightLeft, Edit2, Check, X, Loader2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

import { Database } from '@/integrations/supabase/types';

const parseSafeNumber = (val: string | number | null | undefined): number => {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return val;
  const cleaned = val.toString().replace(/,/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
};

type RoutePricing = Database['public']['Tables']['route_pricing']['Row'];
type RouteInsert = Database['public']['Tables']['route_pricing']['Insert'];
type RouteUpdate = Database['public']['Tables']['route_pricing']['Update'];

export default function AdminSettings() {
  // --- حالات التحميل ---
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  // --- إعدادات التسعير (شرائح المسافات) ---
  const [shortDistanceLimit, setShortDistanceLimit] = useState('500');
  const [shortDistancePrice, setShortDistancePrice] = useState('5');
  const [longDistanceLimit, setLongDistanceLimit] = useState('1000');
  const [longDistancePrice, setLongDistancePrice] = useState('3');
  const [systemCommission, setSystemCommission] = useState('10');
  const [vatRate, setVatRate] = useState('15');

  // --- إعدادات المحتوى (CMS) ---
  const [aboutUs, setAboutUs] = useState('');
  const [privacyPolicy, setPrivacyPolicy] = useState('');

  // --- إعدادات الإشعارات ---
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(true);

  // --- المسارات ---
  const [routes, setRoutes] = useState<RoutePricing[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [syncOldLoads, setSyncOldLoads] = useState(false);
  const [isAddingRoute, setIsAddingRoute] = useState(false);
  const [newRoute, setNewRoute] = useState<Partial<RoutePricing>>({
    origin_city: '', destination_city: '', distance_km: 0, manual_price: null, is_active: true
  });
  const [editingRouteId, setEditingRouteId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<RoutePricing>>({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setFetching(true);
    try {
      // 1. جلب كافة الإعدادات من جدول system_settings
      const { data: settingsData, error: settingsError } = await supabase
        .from('system_settings')
        .select('*');

      if (settingsError) throw settingsError;

      // توزيع البيانات المستلمة على الـ States
      settingsData?.forEach(setting => {
        const config = setting.data as any;
        if (setting.id === 'pricing_config') {
          setShortDistanceLimit(config.short_distance_limit?.toString() || '500');
          setShortDistancePrice(config.short_distance_price?.toString() || '5');
          setLongDistanceLimit(config.long_distance_limit?.toString() || '1000');
          setLongDistancePrice(config.long_distance_price?.toString() || '3');
          setSystemCommission(config.commission?.toString() || '10');
          setVatRate(config.vat_rate?.toString() || '15');
        } else if (setting.id === 'content_config') {
          setAboutUs(config.aboutUs || '');
          setPrivacyPolicy(config.privacyPolicy || '');
        } else if (setting.id === 'notification_config') {
          setEmailNotifications(config.emailNotifications ?? true);
          setSmsNotifications(config.smsNotifications ?? true);
        }
      });

      // 2. جلب المسارات
      const { data: routesData, error: routesError } = await supabase
        .from('route_pricing')
        .select('*')
        .order('origin_city');

      if (routesError) throw routesError;
      setRoutes(routesData || []);

    } catch (err: any) {
      console.error("خطأ في جلب البيانات:", err.message);
      toast.error('حدث خطأ أثناء تحميل البيانات');
    } finally {
      setFetching(false);
    }
  };

  // --- دوال الحفظ ---
  const handleSavePricing = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert({
          id: 'pricing_config',
          data: {
            short_distance_limit: parseSafeNumber(shortDistanceLimit),
            short_distance_price: parseSafeNumber(shortDistancePrice),
            long_distance_limit: parseSafeNumber(longDistanceLimit),
            long_distance_price: parseSafeNumber(longDistancePrice),
            commission: parseSafeNumber(systemCommission),
            vat_rate: parseSafeNumber(vatRate)
          }
        });
      if (error) throw error;

      if (syncOldLoads) {
        await syncAllPendingLoads();
        toast.success('تم تحديث إعدادات التسعير بنجاح وتحديث كافة الشحنات المعلقة ✅');
      } else {
        toast.success('تم تحديث إعدادات التسعير بنجاح ✅');
      }
    } catch (err) {
      toast.error('فشل في حفظ إعدادات التسعير');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveContent = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert({
          id: 'content_config',
          data: { aboutUs, privacyPolicy }
        });
      if (error) throw error;
      toast.success('تم تحديث محتوى الصفحات بنجاح ✅');
    } catch (err) {
      toast.error('فشل في تحديث المحتوى');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNotifications = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert({
          id: 'notification_config',
          data: { emailNotifications, smsNotifications }
        });
      if (error) throw error;
      toast.success('تم تحديث تفضيلات الإشعارات بنجاح ✅');
    } catch (err) {
      toast.error('فشل في تحديث الإشعارات');
    } finally {
      setLoading(false);
    }
  };

  // دالة حساب السعر التلقائي (تستخدم القيم الحالية في الـ state للمعاينة المباشرة)
  const calculateSystemPrice = (distance: number) => {
    const sLimit = parseSafeNumber(shortDistanceLimit);
    const lLimit = parseSafeNumber(longDistanceLimit);
    const sPrice = parseSafeNumber(shortDistancePrice);
    const lPrice = parseSafeNumber(longDistancePrice);
    const vRate = parseSafeNumber(vatRate);

    let price = 0;
    if (distance <= sLimit) {
      price = distance * sPrice;
    } else if (distance >= lLimit) {
      price = distance * lPrice;
    } else {
      price = distance * sPrice;
    }

    const total = price * (1 + vRate / 100);
    return Math.round(total);
  };

  // دالة مزامنة كافة الشحنات المعلقة مع الأسعار الجديدة
  const syncAllPendingLoads = async (customRoutes?: RoutePricing[]) => {
    const currentRoutes = customRoutes || routes;
    console.log("🔄 Starting sync for all relevant loads...");
    try {
      const { data: allLoads, error: fetchError } = await supabase
        .from('loads')
        .select('*')
        .in('status', ['pending', 'available', 'in_progress', 'completed']);

      if (fetchError) throw fetchError;
      if (!allLoads || allLoads.length === 0) {
        console.log("ℹ️ No loads found to sync.");
        return;
      }

      const sLimit = parseSafeNumber(shortDistanceLimit);
      const sPrice = parseSafeNumber(shortDistancePrice);
      const lLimit = parseSafeNumber(longDistanceLimit);
      const lPrice = parseSafeNumber(longDistancePrice);
      const vRate = parseSafeNumber(vatRate);

      const normalize = (s: string) => s ? s.replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').trim().toLowerCase() : '';

      let updateCount = 0;
      const updatePromises = allLoads.map(async (load) => {
        let newPrice = 0;
        const normOrigin = normalize(load.origin);
        const normDest = normalize(load.destination);

        // البحث عن سعر يدوي للمسار
        const override = currentRoutes.find(r => {
          if (!r.is_active) return false;
          const rOrigin = normalize(r.origin_city);
          const rDest = normalize(r.destination_city);
          return (rOrigin === normOrigin && rDest === normDest) ||
            (rOrigin === normDest && rDest === normOrigin);
        });

        if (override?.manual_price) {
          newPrice = override.manual_price;
        } else {
          // استخدام المسافة المخصصة للمسار إذا وُجدت، وإلا استخدام مسافة الشحنة
          const rawDistance = override?.distance_km || load.distance;
          const distanceToUse = rawDistance ? Math.round(rawDistance) : rawDistance;
          if (distanceToUse) {
            if (distanceToUse <= sLimit) {
              newPrice = distanceToUse * sPrice;
            } else if (distanceToUse >= lLimit) {
              newPrice = distanceToUse * lPrice;
            } else {
              newPrice = distanceToUse * sPrice;
            }
          }
        }

        // إضافة الضريبة للسعر في المزامنة أيضاً
        if (newPrice > 0) {
          newPrice = newPrice * (1 + vRate / 100);
        }

        newPrice = Math.round(newPrice);

        if (newPrice > 0 && newPrice !== load.price) {
          updateCount++;
          console.log(`✅ Updating load ${load.id}: ${load.origin} -> ${load.destination} | ${load.price} -> ${newPrice}`);
          return supabase.from('loads').update({ price: newPrice }).eq('id', load.id);
        }
      });

      await Promise.all(updatePromises);
      console.log(`✨ Price sync completed. Updated ${updateCount} loads.`);
      if (updateCount > 0) {
        toast.success(`تم تحديث أسعار ${updateCount} شحنة بنجاح لتطابق اللوائح الجديدة ✅`);
      }
    } catch (err) {
      console.error("❌ Failed to sync loads:", err);
      toast.error("حدث خطأ أثناء مزامنة أسعار الشحنات الحالية");
    }
  };

  // --- إدارة المسارات (CRUD) ---
  const handleAddRoute = async () => {
    if (!newRoute.origin_city.trim() || !newRoute.destination_city.trim()) {
      toast.error('الرجاء إدخال مدينتي الانطلاق والوصول');
      return;
    }

    const parsedDist = parseSafeNumber(newRoute.distance_km);
    const parsedPrice = newRoute.manual_price ? parseSafeNumber(newRoute.manual_price) : null;

    if (!parsedDist) {
      toast.error('الرجاء إدخال مسافة صحيحة');
      return;
    }

    setLoading(true);
    try {
      const routeData = {
        ...newRoute,
        distance_km: parsedDist,
        manual_price: parsedPrice,
      };

      const { data, error } = await supabase
        .from('route_pricing')
        .insert([routeData as any])
        .select();
      if (error) throw error;
      const updatedRoutes = [...routes, data[0]];
      setRoutes(updatedRoutes);
      await syncAllPendingLoads(updatedRoutes);
      setIsAddingRoute(false);
      setNewRoute({ origin_city: '', destination_city: '', distance_km: 0, manual_price: null, is_active: true });
      toast.success('تم إضافة المسار بنجاح وتحديث الشحنات ذات الصلة');
    } catch (err) {
      toast.error('فشل في إضافة المسار');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRoute = async (id: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.from('route_pricing').update(editValues as RouteUpdate).eq('id', id);
      if (error) throw error;
      const updatedRoutes = routes.map(r => r.id === id ? { ...r, ...editValues } : r);
      setRoutes(updatedRoutes);
      await syncAllPendingLoads(updatedRoutes);
      setEditingRouteId(null);
      toast.success('تم تحديث المسار وتزامن الشحنات بنجاح');
    } catch (err) {
      toast.error('فشل في التحديث');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRoute = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا المسار؟')) return;
    try {
      const { error } = await supabase.from('route_pricing').delete().eq('id', id);
      if (error) throw error;
      setRoutes(routes.filter(r => r.id !== id));
      toast.success('تم حذف المسار');
    } catch (err) {
      toast.error('فشل في الحذف');
    }
  };

  const filteredRoutes = useMemo(() => {
    return routes.filter(r =>
      r.origin_city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.destination_city.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [routes, searchQuery]);

  if (fetching) {
    return (
      <AdminLayout>
        <div className="h-[70vh] flex flex-col items-center justify-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
          <p className="font-bold text-slate-500 text-lg">جاري تحميل إعدادات النظام...</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-8 max-w-7xl mx-auto pb-20 px-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              <div className="p-2 bg-slate-800 rounded-xl text-white">
                <Settings size={28} />
              </div>
              إعدادات النظام المتطورة
            </h1>
            <p className="text-muted-foreground font-medium mt-2">محرك التسعير الذكي وإدارة المسارات المخصصة</p>
          </div>
        </div>

        <Tabs defaultValue="pricing" className="w-full" dir="rtl">
          <TabsList className="grid w-full grid-cols-3 mb-8 h-14 bg-white rounded-2xl p-1 shadow-sm border border-slate-100">
            <TabsTrigger value="pricing" className="rounded-xl font-bold data-[state=active]:bg-blue-600 data-[state=active]:text-white transition-all text-slate-500">
              <Map size={18} className="me-2" /> محرك التسعير (Pricing)
            </TabsTrigger>
            <TabsTrigger value="notifications" className="rounded-xl font-bold data-[state=active]:bg-blue-600 data-[state=active]:text-white transition-all text-slate-500">
              <Bell size={18} className="me-2" /> الإشعارات والتنبيهات
            </TabsTrigger>
            <TabsTrigger value="pages" className="rounded-xl font-bold data-[state=active]:bg-blue-600 data-[state=active]:text-white transition-all text-slate-500">
              <Globe size={18} className="me-2" /> الصفحات والمحتوى
            </TabsTrigger>
          </TabsList>

          {/* محتوى التبويب: التسعير */}
          <TabsContent value="pricing" className="space-y-8">
            <Card className="rounded-[2.5rem] border-none shadow-xl bg-white overflow-hidden">
              <CardHeader className="border-b border-slate-50 pb-8 bg-slate-50/50 p-10">
                <div className="flex items-center gap-4 mb-2">
                  <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><Zap size={24} /></div>
                  <CardTitle className="text-2xl font-black text-slate-800">إعدادات التسعير الأساسية</CardTitle>
                </div>
                <CardDescription className="text-slate-500 font-bold text-lg">القيم التي يعتمد عليها النظام في حساب الأسعار تلقائياً.</CardDescription>
              </CardHeader>
              <CardContent className="p-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                  {/* قسم المسافات القصيرة */}
                  <div className="p-6 border-2 border-slate-100 rounded-2xl bg-white shadow-sm space-y-6">
                    <h3 className="text-xl font-black text-slate-800 border-b border-slate-100 pb-4 flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                      المسافات القصيرة
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-4">
                        <Label className="font-black text-slate-700 text-sm">أقل من أو يساوي (كم)</Label>
                        <div className="relative">
                          <Input type="number" min="0" value={shortDistanceLimit} onChange={(e) => setShortDistanceLimit(e.target.value)} className="h-12 bg-slate-50 border-2 border-slate-100 rounded-xl font-black text-lg px-10" />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-black text-xs">كم</span>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <Label className="font-black text-slate-700 text-sm">سعر الكيلومتر</Label>
                        <div className="relative">
                          <Input type="number" min="0" value={shortDistancePrice} onChange={(e) => setShortDistancePrice(e.target.value)} className="h-12 bg-slate-50 border-2 border-slate-100 rounded-xl font-black text-lg px-12" />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-black text-xs">ر.س/كم</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* قسم المسافات الطويلة */}
                  <div className="p-6 border-2 border-slate-100 rounded-2xl bg-white shadow-sm space-y-6">
                    <h3 className="text-xl font-black text-slate-800 border-b border-slate-100 pb-4 flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                      المسافات الطويلة
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-4">
                        <Label className="font-black text-slate-700 text-sm">أكبر من (كم)</Label>
                        <div className="relative">
                          <Input type="number" min="0" value={longDistanceLimit} onChange={(e) => setLongDistanceLimit(e.target.value)} className="h-12 bg-slate-50 border-2 border-slate-100 rounded-xl font-black text-lg px-10" />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-black text-xs">كم</span>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <Label className="font-black text-slate-700 text-sm">سعر الكيلومتر</Label>
                        <div className="relative">
                          <Input type="number" min="0" value={longDistancePrice} onChange={(e) => setLongDistancePrice(e.target.value)} className="h-12 bg-slate-50 border-2 border-slate-100 rounded-xl font-black text-lg px-12" />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-black text-xs">ر.س/كم</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row gap-4 items-center justify-between border-t border-slate-100 pt-8">
                  <div className="flex flex-col gap-6 w-full md:w-auto">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-amber-50 text-amber-600 rounded-lg"><TrendingUp size={20} /></div>
                      <div>
                        <span className="block font-black text-slate-700">عمولة المنصة</span>
                        <span className="text-sm text-slate-400 font-bold">تطبق على إجمالي الشحنة</span>
                      </div>
                      <div className="relative w-32 mr-4">
                        <Input type="number" min="0" value={systemCommission} onChange={(e) => setSystemCommission(e.target.value)} className="h-12 bg-amber-50/50 border-amber-100 rounded-xl font-black text-center" />
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-600 font-black">%</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-rose-50 text-rose-600 rounded-lg"><Plus size={20} /></div>
                      <div>
                        <span className="block font-black text-slate-700">ضريبة القيمة المضافة (VAT)</span>
                        <span className="text-sm text-slate-400 font-bold">تضاف إلى إجمالي سعر الشحنة</span>
                      </div>
                      <div className="relative w-32 mr-4">
                        <Input type="number" min="0" value={vatRate} onChange={(e) => setVatRate(e.target.value)} className="h-12 bg-rose-50/50 border-rose-100 rounded-xl font-black text-center" />
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-rose-600 font-black">%</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 pr-2">
                      <input
                        type="checkbox"
                        id="syncCheckbox"
                        checked={syncOldLoads}
                        onChange={(e) => setSyncOldLoads(e.target.checked)}
                        className="w-5 h-5 rounded text-blue-600 border-slate-300 focus:ring-blue-500"
                      />
                      <label htmlFor="syncCheckbox" className="font-bold text-slate-700 cursor-pointer select-none">
                        تطبيق هذه الأسعار على الشحنات المعلقة والسابقة المتاحة
                      </label>
                    </div>
                  </div>

                  <Button onClick={handleSavePricing} disabled={loading} className="h-14 px-10 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-lg shadow-lg self-end">
                    {loading ? <Loader2 className="animate-spin me-2" /> : <Save size={20} className="me-2" />}
                    حفظ الإعدادات
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* إدارة المسارات */}
            <Card className="rounded-[2.5rem] border-none shadow-xl bg-white overflow-hidden">
              <CardHeader className="border-b border-slate-50 p-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                  <div className="flex items-center gap-4 mb-2">
                    <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg"><ArrowRightLeft size={24} /></div>
                    <CardTitle className="text-2xl font-black text-slate-800">إدارة المسارات (Routes)</CardTitle>
                  </div>
                </div>
                <div className="flex gap-4 w-full md:w-auto">
                  <div className="relative flex-1 md:w-64">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <Input placeholder="بحث عن مدينة..." className="h-12 pr-10 rounded-xl bg-slate-50 border-none" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                  </div>
                  <Button onClick={() => setIsAddingRoute(true)} className="h-12 px-6 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold">
                    <Plus size={18} className="me-2" /> مسار جديد
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="font-black text-center py-6">مدينة الانطلاق</TableHead>
                      <TableHead className="font-black text-center py-6">مدينة الوصول</TableHead>
                      <TableHead className="font-black text-center py-6">المسافة (كم)</TableHead>
                      <TableHead className="font-black text-center py-6">السعر التلقائي</TableHead>
                      <TableHead className="font-black text-center py-6">سعر مخصص (Override)</TableHead>
                      <TableHead className="font-black text-center py-6">الحالة</TableHead>
                      <TableHead className="font-black text-center py-6">الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isAddingRoute && (
                      <TableRow className="bg-blue-50/50">
                        <TableCell className="p-4"><Input placeholder="الرياض" value={newRoute.origin_city} onChange={e => setNewRoute({ ...newRoute, origin_city: e.target.value })} className="h-10 text-center" /></TableCell>
                        <TableCell className="p-4"><Input placeholder="الدمام" value={newRoute.destination_city} onChange={e => setNewRoute({ ...newRoute, destination_city: e.target.value })} className="h-10 text-center" /></TableCell>
                        <TableCell className="p-4"><Input type="number" placeholder="400" value={Number.isNaN(newRoute.distance_km) ? '' : (newRoute.distance_km || '')} onChange={e => setNewRoute({ ...newRoute, distance_km: e.target.value ? parseFloat(e.target.value) : 0 })} className="h-10 text-center" /></TableCell>
                        <TableCell className="p-4 text-center text-slate-400 italic">آلي</TableCell>
                        <TableCell className="p-4"><Input type="number" placeholder="اختياري" value={Number.isNaN(newRoute.manual_price) ? '' : (newRoute.manual_price || '')} onChange={e => setNewRoute({ ...newRoute, manual_price: e.target.value ? parseFloat(e.target.value) : null })} className="h-10 text-center" /></TableCell>
                        <TableCell className="p-4 text-center"><Badge className="bg-emerald-500">نشط</Badge></TableCell>
                        <TableCell className="p-4">
                          <div className="flex gap-2 justify-center">
                            <Button size="sm" onClick={handleAddRoute} className="bg-emerald-500 hover:bg-emerald-600 h-8 w-8 p-0"><Check size={16} /></Button>
                            <Button size="sm" onClick={() => setIsAddingRoute(false)} variant="ghost" className="text-rose-500 h-8 w-8 p-0"><X size={16} /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                    {filteredRoutes.map((route) => {
                      const isEditing = editingRouteId === route.id;
                      const sysPrice = calculateSystemPrice(route.distance_km);
                      return (
                        <TableRow key={route.id} className="hover:bg-slate-50 transition-colors">
                          <TableCell className="text-center font-black">{isEditing ? <Input value={editValues.origin_city ?? route.origin_city} onChange={e => setEditValues({ ...editValues, origin_city: e.target.value })} className="h-10 text-center" /> : route.origin_city}</TableCell>
                          <TableCell className="text-center font-black">{isEditing ? <Input value={editValues.destination_city ?? route.destination_city} onChange={e => setEditValues({ ...editValues, destination_city: e.target.value })} className="h-10 text-center" /> : route.destination_city}</TableCell>
                          <TableCell className="text-center font-bold text-blue-600 bg-blue-50/20">{isEditing ? <Input type="number" value={Number.isNaN(editValues.distance_km) ? '' : (editValues.distance_km ?? route.distance_km)} onChange={e => setEditValues({ ...editValues, distance_km: e.target.value ? parseFloat(e.target.value) : 0 })} className="h-10 text-center" /> : `${route.distance_km} كم`}</TableCell>
                          <TableCell className="text-center font-black text-slate-500">{sysPrice.toLocaleString()} ر.س</TableCell>
                          <TableCell className="text-center">
                            {isEditing ? (
                              <Input type="number" value={Number.isNaN(editValues.manual_price) ? '' : (editValues.manual_price ?? (route.manual_price || ''))} onChange={e => setEditValues({ ...editValues, manual_price: e.target.value ? parseFloat(e.target.value) : null })} className="h-10 text-center" />
                            ) : (
                              route.manual_price ? <span className="font-black text-emerald-600">{route.manual_price.toLocaleString()} ر.س</span> : <span className="text-slate-300 text-sm italic">التلقائي</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center"><Badge className={route.is_active ? "bg-emerald-500" : "bg-slate-300"}>{route.is_active ? 'نشط' : 'معطل'}</Badge></TableCell>
                          <TableCell>
                            <div className="flex gap-2 justify-center">
                              {isEditing ? (
                                <Button size="sm" onClick={() => handleUpdateRoute(route.id)} className="bg-blue-600 h-8 px-3 text-xs"><Check size={14} className="me-1" /> حفظ</Button>
                              ) : (
                                <>
                                  <Button size="sm" variant="ghost" onClick={() => { setEditingRouteId(route.id); setEditValues({}); }} className="text-blue-600 h-8 w-8 p-0"><Edit2 size={16} /></Button>
                                  <Button size="sm" variant="ghost" onClick={() => handleDeleteRoute(route.id)} className="text-rose-500 h-8 w-8 p-0"><Trash2 size={16} /></Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* محتوى التبويب: الإشعارات */}
          <TabsContent value="notifications">
            <Card className="rounded-[2rem] border-none shadow-xl bg-white p-8">
              <CardHeader className="p-0 mb-6">
                <CardTitle className="text-xl font-black">تفضيلات التنبيهات</CardTitle>
              </CardHeader>
              <div className="space-y-6">
                <div className="flex items-center justify-between p-6 border-2 border-slate-100 rounded-2xl">
                  <div>
                    <h3 className="text-lg font-black">إشعارات البريد الإلكتروني</h3>
                    <p className="text-slate-500 text-sm">إرسال الفواتير وملخصات الطلبات</p>
                  </div>
                  <Button
                    onClick={() => setEmailNotifications(!emailNotifications)}
                    className={`h-10 w-24 rounded-xl font-bold ${emailNotifications ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-slate-200 text-slate-500'}`}
                  >
                    {emailNotifications ? 'مُفعل' : 'مُعطل'}
                  </Button>
                </div>
                <div className="flex items-center justify-between p-6 border-2 border-slate-100 rounded-2xl">
                  <div>
                    <h3 className="text-lg font-black">الرسائل النصية (SMS)</h3>
                    <p className="text-slate-500 text-sm">تنبيهات عاجلة لحالات الشحن</p>
                  </div>
                  <Button
                    onClick={() => setSmsNotifications(!smsNotifications)}
                    className={`h-10 w-24 rounded-xl font-bold ${smsNotifications ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-slate-200 text-slate-500'}`}
                  >
                    {smsNotifications ? 'مُفعل' : 'مُعطل'}
                  </Button>
                </div>
                <Button onClick={handleSaveNotifications} disabled={loading} className="h-14 px-8 rounded-2xl bg-slate-900 text-white font-black">
                  {loading && <Loader2 className="animate-spin me-2" />}
                  حفظ تفضيلات الإشعارات
                </Button>
              </div>
            </Card>
          </TabsContent>

          {/* محتوى التبويب: إدارة الصفحات */}
          <TabsContent value="pages">
            <Card className="rounded-[2rem] border-none shadow-xl bg-white p-8 space-y-8">
              <div className="space-y-4">
                <Label className="font-black text-slate-700 text-lg">من نحن (About Us)</Label>
                <Textarea
                  value={aboutUs}
                  onChange={(e) => setAboutUs(e.target.value)}
                  className="min-h-[150px] bg-slate-50 border-slate-200 rounded-2xl p-6 font-medium"
                />
              </div>
              <div className="space-y-4">
                <Label className="font-black text-slate-700 text-lg">سياسة الخصوصية والشروط</Label>
                <Textarea
                  value={privacyPolicy}
                  onChange={(e) => setPrivacyPolicy(e.target.value)}
                  className="min-h-[200px] bg-slate-50 border-slate-200 rounded-2xl p-6 font-medium"
                />
              </div>
              <Button onClick={handleSaveContent} disabled={loading} className="h-14 px-8 rounded-2xl bg-blue-600 text-white font-black shadow-lg shadow-blue-500/20">
                {loading && <Loader2 className="animate-spin me-2" />}
                نشر المحتوى المحدث
              </Button>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
