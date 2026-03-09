import { useState, useEffect, useMemo } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
    Settings, Map, TrendingUp, Zap, Plus, Trash2, Search,
    ArrowRightLeft, Edit2, Check, X, Loader2, Truck, Banknote,
    Navigation, Milestone
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
type RouteUpdate = Database['public']['Tables']['route_pricing']['Update'];

export default function AdminPricing() {
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);

    // إعدادات التسعير
    const [shortDistanceLimit, setShortDistanceLimit] = useState('500');
    const [shortDistancePrice, setShortDistancePrice] = useState('5');
    const [longDistanceLimit, setLongDistanceLimit] = useState('1000');
    const [longDistancePrice, setLongDistancePrice] = useState('3');
    const [systemCommission, setSystemCommission] = useState('10');
    const [vatRate, setVatRate] = useState('15');

    // المسارات
    const [routes, setRoutes] = useState<RoutePricing[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [syncOldLoads, setSyncOldLoads] = useState(false);
    const [isAddingRoute, setIsAddingRoute] = useState(false);
    const [newRoute, setNewRoute] = useState<Partial<RoutePricing>>({
        origin_city: '', destination_city: '', distance_km: 0, manual_price: null, is_active: true
    });
    const [editingRouteId, setEditingRouteId] = useState<string | null>(null);
    const [editValues, setEditValues] = useState<Partial<RoutePricing>>({});

    // فئات الشحن والتسعير الديناميكي
    const [truckCategories, setTruckCategories] = useState<any[]>([]);
    const [bodyTypes, setBodyTypes] = useState<any[]>([]);
    const [categoryPricing, setCategoryPricing] = useState<any[]>([]);
    const [isAddingCategoryPrice, setIsAddingCategoryPrice] = useState(false);
    const [editingCatId, setEditingCatId] = useState<string | null>(null);
    const [newCatPrice, setNewCatPrice] = useState({
        truck_id: '',
        body_id: '',
        base_price: '',
        price_per_km: '',
        capacity_text: '',
        min_price: '',
        is_active: true
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setFetching(true);
        try {
            const { data: settingsData } = await supabase.from('system_settings').select('*');
            settingsData?.forEach(setting => {
                const config = setting.data as any;
                if (setting.id === 'pricing_config') {
                    setShortDistanceLimit(config.short_distance_limit?.toString() || '500');
                    setShortDistancePrice(config.short_distance_price?.toString() || '5');
                    setLongDistanceLimit(config.long_distance_limit?.toString() || '1000');
                    setLongDistancePrice(config.long_distance_price?.toString() || '3');
                    setSystemCommission(config.commission?.toString() || '10');
                    setVatRate(config.vat_rate?.toString() || '15');
                }
            });

            const { data: routesData } = await supabase.from('route_pricing').select('*').order('origin_city');
            setRoutes(routesData || []);

            const [trucksRes, bodiesRes, pricingRes] = await Promise.all([
                supabase.from('truck_categories').select('*').order('name_ar'),
                supabase.from('load_body_types').select('*, truck_categories(name_ar)').order('name_ar'),
                supabase.from('shipment_type_pricing').select(`
                    *,
                    truck_categories(name_ar),
                    load_body_types(name_ar)
                `)
            ]);

            setTruckCategories(trucksRes.data || []);
            setBodyTypes(bodiesRes.data || []);
            setCategoryPricing(pricingRes.data || []);
        } catch (err: any) {
            toast.error('حدث خطأ أثناء تحميل البيانات');
        } finally {
            setFetching(false);
        }
    };

    const calculateSystemPrice = (distance: number) => {
        const sLimit = parseSafeNumber(shortDistanceLimit);
        const lLimit = parseSafeNumber(longDistanceLimit);
        const sPrice = parseSafeNumber(shortDistancePrice);
        const lPrice = parseSafeNumber(longDistancePrice);
        const vRate = parseSafeNumber(vatRate);

        let price = distance <= sLimit ? distance * sPrice : distance * lPrice;
        const total = price * (1 + vRate / 100);
        return Math.round(total);
    };

    const handleSavePricing = async () => {
        setLoading(true);
        try {
            const { error } = await supabase.from('system_settings').upsert({
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
            toast.success('تم تحديث إعدادات التسعير بنجاح ✅');
        } catch (err) {
            toast.error('فشل حفظ الإعدادات');
        } finally {
            setLoading(false);
        }
    };

    const handleAddRoute = async () => {
        if (!newRoute.origin_city?.trim() || !newRoute.destination_city?.trim()) {
            toast.error('الرجاء إدخال المدن'); return;
        }
        setLoading(true);
        try {
            const { data, error } = await supabase.from('route_pricing').insert([newRoute as any]).select();
            if (error) throw error;
            setRoutes([...routes, data[0]]);
            setIsAddingRoute(false);
            setNewRoute({ origin_city: '', destination_city: '', distance_km: 0, manual_price: null, is_active: true });
            toast.success('تم إضافة المسار بنجاح');
        } catch (err) {
            toast.error('فشل إضافة المسار');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteRoute = async (id: string) => {
        if (!confirm('متأكد من الحذف؟')) return;
        try {
            const { error } = await supabase.from('route_pricing').delete().eq('id', id);
            if (error) throw error;
            setRoutes(routes.filter(r => r.id !== id));
            toast.success('تم الحذف');
        } catch (err) {
            toast.error('فشل الحذف');
        }
    };

    const handleAddCategoryPricing = async () => {
        if (!editingCatId && (!newCatPrice.truck_id || !newCatPrice.body_id)) {
            toast.error('الرجاء إكمال الحقول الأساسية'); return;
        }

        setLoading(true);
        try {
            const payload: any = {
                id: editingCatId || undefined,
                truck_category_id: newCatPrice.truck_id,
                body_type_id: newCatPrice.body_id,
                base_price: newCatPrice.base_price ? parseFloat(newCatPrice.base_price) : 0,
                price_per_km: newCatPrice.price_per_km ? parseFloat(newCatPrice.price_per_km) : 0,
                capacity_text: newCatPrice.capacity_text,
                min_price: newCatPrice.min_price ? parseFloat(newCatPrice.min_price) : 0,
                is_active: newCatPrice.is_active
            };

            const { data, error } = await supabase.from('shipment_type_pricing').upsert(payload, {
                onConflict: 'truck_category_id,body_type_id'
            }).select(`*, truck_categories(name_ar), load_body_types(name_ar)`);

            if (error) throw error;

            setCategoryPricing(prev => [
                ...prev.filter(p => p.id !== (editingCatId || (data ? data[0].id : ''))),
                data[0]
            ]);

            setIsAddingCategoryPrice(false);
            setEditingCatId(null);
            setNewCatPrice({ truck_id: '', body_id: '', base_price: '', price_per_km: '', capacity_text: '', min_price: '', is_active: true });
            toast.success('تم حفظ تسعير الفئة بنجاح');
        } catch (err) {
            toast.error('فشل الحفظ');
        } finally {
            setLoading(false);
        }
    };

    const filteredRoutes = useMemo(() => {
        return routes.filter(r =>
            r.origin_city.toLowerCase().includes(searchQuery.toLowerCase()) ||
            r.destination_city.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [routes, searchQuery]);

    const [catSearchQuery, setCatSearchQuery] = useState('');

    const filteredCategoryPricing = useMemo(() => {
        return categoryPricing.filter(p =>
            p.truck_categories?.name_ar?.toLowerCase().includes(catSearchQuery.toLowerCase()) ||
            p.load_body_types?.name_ar?.toLowerCase().includes(catSearchQuery.toLowerCase())
        );
    }, [categoryPricing, catSearchQuery]);

    if (fetching) return <AdminLayout><div className="h-[70vh] flex flex-col items-center justify-center gap-4"><Loader2 className="h-12 w-12 animate-spin text-blue-600" /><p className="font-bold text-slate-500">جاري تحميل الأسعار...</p></div></AdminLayout>;

    return (
        <AdminLayout>
            <div className="space-y-8 max-w-7xl mx-auto pb-20 px-4" dir="rtl">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <div className="p-2 bg-blue-600 rounded-xl text-white"><Banknote size={28} /></div>
                        إدارة الأسعار والمحركات الذكية
                    </h1>
                    <p className="text-muted-foreground font-medium mt-2">تحكم كامل في قواعد التسعير، المسارات المخصصة، وعمولات المنصة</p>
                </div>

                <Tabs defaultValue="base" className="w-full">
                    <TabsList className="grid w-full grid-cols-3 mb-8 h-14 bg-white rounded-2xl p-1 shadow-sm border border-slate-100">
                        <TabsTrigger value="base" className="rounded-xl font-bold transition-all"><Zap size={18} className="me-2" /> المحرك الأساسي</TabsTrigger>
                        <TabsTrigger value="categories" className="rounded-xl font-bold transition-all"><Truck size={18} className="me-2" /> تسعير الفئات</TabsTrigger>
                        <TabsTrigger value="routes" className="rounded-xl font-bold transition-all"><Map size={18} className="me-2" /> المسارات المخصصة</TabsTrigger>
                    </TabsList>

                    <TabsContent value="base" className="space-y-6">
                        <Card className="rounded-[2rem] shadow-xl border-none">
                            <CardHeader className="p-8 border-b border-slate-50">
                                <CardTitle className="text-xl font-black">إعدادات الكيلومتر والعمولة</CardTitle>
                            </CardHeader>
                            <CardContent className="p-8 space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-b pb-8 mb-8">
                                    <div className="space-y-4 p-6 bg-blue-50/30 rounded-2xl border border-blue-100">
                                        <Label className="font-black text-blue-900 flex items-center gap-2">
                                            <Navigation size={16} /> حد المسافة القصيرة (كم)
                                        </Label>
                                        <Input
                                            type="number"
                                            value={shortDistanceLimit}
                                            onChange={e => setShortDistanceLimit(e.target.value)}
                                            className="h-12 rounded-xl text-lg font-black"
                                            placeholder="مثلاً: 100"
                                        />
                                        <p className="text-[10px] font-bold text-blue-600/70">سيتم اعتبار أي رحلة أقل من هذا الرقم "مسافة قصيرة"</p>
                                    </div>
                                    <div className="space-y-4 p-6 bg-purple-50/30 rounded-2xl border border-purple-100">
                                        <Label className="font-black text-purple-900 flex items-center gap-2">
                                            <Milestone size={16} /> حد المسافة الطويلة (كم)
                                        </Label>
                                        <Input
                                            type="number"
                                            value={longDistanceLimit}
                                            onChange={e => setLongDistanceLimit(e.target.value)}
                                            className="h-12 rounded-xl text-lg font-black"
                                            placeholder="مثلاً: 101"
                                        />
                                        <p className="text-[10px] font-bold text-purple-600/70">سيتم اعتبار أي رحلة أكبر من هذا الرقم "مسافة طويلة"</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-4 p-6 bg-slate-50 rounded-2xl border border-slate-100">
                                        <Label className="font-black text-slate-600">المسافات القصيرة (أقل من {shortDistanceLimit} كم)</Label>
                                        <div className="relative">
                                            <Input type="number" value={shortDistancePrice} onChange={e => setShortDistancePrice(e.target.value)} className="h-12 rounded-xl text-lg font-black ps-12" />
                                            <span className="absolute start-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs">ر.س/كم</span>
                                        </div>
                                    </div>
                                    <div className="space-y-4 p-6 bg-slate-50 rounded-2xl border border-slate-100">
                                        <Label className="font-black text-slate-600">المسافات الطويلة (أكبر من {longDistanceLimit} كم)</Label>
                                        <div className="relative">
                                            <Input type="number" value={longDistancePrice} onChange={e => setLongDistancePrice(e.target.value)} className="h-12 rounded-xl text-lg font-black ps-12" />
                                            <span className="absolute start-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs">ر.س/كم</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-4">
                                        <Label className="font-black">عمولة المنصة (%)</Label>
                                        <Input type="number" value={systemCommission} onChange={e => setSystemCommission(e.target.value)} className="h-12 rounded-xl" />
                                    </div>
                                    <div className="space-y-4">
                                        <Label className="font-black">ضريبة القيمة المضافة (%)</Label>
                                        <Input type="number" value={vatRate} onChange={e => setVatRate(e.target.value)} className="h-12 rounded-xl" />
                                    </div>
                                </div>
                                <Button onClick={handleSavePricing} disabled={loading} className="w-full h-14 bg-blue-600 text-lg font-black shadow-lg shadow-blue-200">
                                    {loading ? <Loader2 className="animate-spin" /> : <Settings size={20} className="me-2" />} حفظ التغييرات 💾
                                </Button>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="categories">
                        <Card className="rounded-[2rem] shadow-xl border-none overflow-hidden">
                            <CardHeader className="p-8 border-b border-slate-50 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                                <div>
                                    <CardTitle className="font-black">أسعار الشاحنات والمقطورات</CardTitle>
                                    <CardDescription className="text-xs font-bold mt-1">إدارة تسعير كل فئة (أساسي + كيلو)</CardDescription>
                                </div>
                                <div className="flex gap-4">
                                    <div className="relative">
                                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                        <Input
                                            placeholder="بحث عن شاحنة..."
                                            value={catSearchQuery}
                                            onChange={e => setCatSearchQuery(e.target.value)}
                                            className="pr-10 h-11 w-[200px] rounded-xl"
                                        />
                                    </div>
                                    <Button onClick={() => setIsAddingCategoryPrice(true)} className="bg-slate-900 h-11 px-6 rounded-xl shadow-lg">
                                        <Plus size={18} className="me-1" /> إضافة نوع شاحنة
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader className="bg-slate-50">
                                        <TableRow>
                                            <TableHead className="text-center py-4 w-12">ID</TableHead>
                                            <TableHead className="text-center py-4">فئة الشاحنة</TableHead>
                                            <TableHead className="text-center py-4">نوع الهيكل</TableHead>
                                            <TableHead className="text-center py-4 text-xs">الحمولة</TableHead>
                                            <TableHead className="text-center py-4">السعر الأساسي</TableHead>
                                            <TableHead className="text-center py-4">سعر الكيلو</TableHead>
                                            <TableHead className="text-center py-4 text-xs">الحد الأدنى</TableHead>
                                            <TableHead className="text-center py-4">الحالة</TableHead>
                                            <TableHead className="text-center py-4">الإجراءات</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {(isAddingCategoryPrice || editingCatId) && (
                                            <TableRow className="bg-blue-50/50">
                                                <TableCell className="p-2 text-center font-bold text-blue-600">New</TableCell>
                                                <TableCell className="p-2">
                                                    {editingCatId ?
                                                        <span className="font-bold text-xs">{truckCategories.find(c => c.id === newCatPrice.truck_id)?.name_ar || newCatPrice.truck_id}</span> :
                                                        <select value={newCatPrice.truck_id} onChange={e => setNewCatPrice({ ...newCatPrice, truck_id: e.target.value })} className="w-full h-10 rounded-lg text-xs">
                                                            <option value="">اختر الفئة</option>
                                                            {truckCategories.map(c => <option key={c.id} value={c.id}>{c.name_ar}</option>)}
                                                        </select>
                                                    }
                                                </TableCell>
                                                <TableCell className="p-2">
                                                    {editingCatId ?
                                                        <span className="font-bold text-xs">{bodyTypes.find(b => b.id === newCatPrice.body_id)?.name_ar || newCatPrice.body_id}</span> :
                                                        <select
                                                            value={newCatPrice.body_id}
                                                            onChange={e => setNewCatPrice({ ...newCatPrice, body_id: e.target.value })}
                                                            className="w-full h-10 rounded-lg text-xs"
                                                        >
                                                            <option value="">اختر النوع</option>
                                                            {bodyTypes
                                                                .filter(b => !newCatPrice.truck_id || b.category_id === newCatPrice.truck_id)
                                                                .map(b => (
                                                                    <option key={b.id} value={b.id}>
                                                                        {b.name_ar}
                                                                    </option>
                                                                ))}
                                                        </select>
                                                    }
                                                </TableCell>
                                                <TableCell className="p-2"><Input value={newCatPrice.capacity_text} onChange={e => setNewCatPrice({ ...newCatPrice, capacity_text: e.target.value })} className="text-center text-xs h-10" placeholder="24 طن" /></TableCell>
                                                <TableCell className="p-2"><Input type="number" value={newCatPrice.base_price} onChange={e => setNewCatPrice({ ...newCatPrice, base_price: e.target.value })} className="text-center font-bold h-10" /></TableCell>
                                                <TableCell className="p-2"><Input type="number" value={newCatPrice.price_per_km} onChange={e => setNewCatPrice({ ...newCatPrice, price_per_km: e.target.value })} className="text-center font-bold h-10" /></TableCell>
                                                <TableCell className="p-2"><Input type="number" value={newCatPrice.min_price} onChange={e => setNewCatPrice({ ...newCatPrice, min_price: e.target.value })} className="text-center text-xs h-10" /></TableCell>
                                                <TableCell className="p-2">
                                                    <select value={newCatPrice.is_active ? '1' : '0'} onChange={e => setNewCatPrice({ ...newCatPrice, is_active: e.target.value === '1' })} className="w-full h-10 rounded-lg text-xs bg-white border">
                                                        <option value="1">نشط</option>
                                                        <option value="0">غير نشط</option>
                                                    </select>
                                                </TableCell>
                                                <TableCell className="flex justify-center gap-1 p-2">
                                                    <Button size="sm" onClick={handleAddCategoryPricing} className="bg-blue-600 hover:bg-blue-700">
                                                        {loading ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : <Check size={16} className="text-white" />}
                                                    </Button>
                                                    <Button size="sm" variant="ghost" onClick={() => { setIsAddingCategoryPrice(false); setEditingCatId(null); setNewCatPrice({ truck_id: '', body_id: '', base_price: '', price_per_km: '', capacity_text: '', min_price: '', is_active: true }); }}>
                                                        <X size={16} />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                        {filteredCategoryPricing.length > 0 ? (
                                            filteredCategoryPricing.map((p, index) => (
                                                <TableRow key={p.id} className="text-center hover:bg-slate-50 transition-colors">
                                                    <TableCell className="text-slate-400 font-bold text-[10px]">{index + 1}</TableCell>
                                                    <TableCell className="font-bold text-slate-700 text-xs">{p.truck_categories?.name_ar}</TableCell>
                                                    <TableCell className="font-bold text-slate-600 text-xs">{p.load_body_types?.name_ar}</TableCell>
                                                    <TableCell className="text-slate-500 text-xs">{p.capacity_text}</TableCell>
                                                    <TableCell className="font-black text-blue-600">{p.base_price} <span className="text-[10px] font-normal">ريال</span></TableCell>
                                                    <TableCell className="font-black text-amber-600">{p.price_per_km || 0} <span className="text-[10px] font-normal">ريال/كم</span></TableCell>
                                                    <TableCell className="text-slate-500 text-xs">{p.min_price || 0} <span className="text-[10px] font-normal">ريال</span></TableCell>
                                                    <TableCell>
                                                        <Badge variant={p.is_active ? "outline" : "destructive"} className={p.is_active ? "bg-emerald-50 text-emerald-700 border-emerald-100" : ""}>
                                                            {p.is_active ? 'نشط' : 'غير نشط'}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="flex justify-center gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                            onClick={() => {
                                                                setEditingCatId(p.id);
                                                                setNewCatPrice({
                                                                    truck_id: p.truck_category_id,
                                                                    body_id: p.body_type_id,
                                                                    base_price: p.base_price?.toString() || '',
                                                                    price_per_km: p.price_per_km?.toString() || '0',
                                                                    capacity_text: p.capacity_text || '',
                                                                    min_price: p.min_price?.toString() || '0',
                                                                    is_active: p.is_active ?? true
                                                                });
                                                            }}
                                                        >
                                                            <Edit2 size={14} />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-8 w-8 p-0 text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                                                            onClick={() => {
                                                                if (confirm('هل أنت متأكد من حذف هذا التسعير؟')) {
                                                                    supabase.from('shipment_type_pricing').delete().eq('id', p.id).then(() => fetchData())
                                                                }
                                                            }}
                                                        >
                                                            <Trash2 size={14} />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={9} className="py-12 text-center text-slate-400 font-bold">لا يوجد نتائج بحث</TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="routes">
                        <Card className="rounded-[2.5rem] shadow-xl border-none overflow-hidden">
                            <CardHeader className="p-8 border-b border-slate-50 flex flex-row justify-between items-center">
                                <CardTitle className="font-black">قائمة المسارات الخاصة</CardTitle>
                                <div className="flex gap-4">
                                    <div className="relative"><Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} /><Input placeholder="بحث..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pr-10" /></div>
                                    <Button onClick={() => setIsAddingRoute(true)} className="bg-emerald-600 shadow-lg shadow-emerald-100"><Plus size={18} className="me-1" /> مسار جديد</Button>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader className="bg-slate-50">
                                        <TableRow>
                                            <TableHead className="text-center py-4">المنطلق</TableHead>
                                            <TableHead className="text-center py-4">الوجهة</TableHead>
                                            <TableHead className="text-center py-4">المسافة</TableHead>
                                            <TableHead className="text-center py-4">السعر الثابت</TableHead>
                                            <TableHead className="text-center py-4">الإجراءات</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {isAddingRoute && (
                                            <TableRow className="bg-emerald-50">
                                                <TableCell><Input value={newRoute.origin_city} onChange={e => setNewRoute({ ...newRoute, origin_city: e.target.value })} className="h-10 rounded-lg text-center" /></TableCell>
                                                <TableCell><Input value={newRoute.destination_city} onChange={e => setNewRoute({ ...newRoute, destination_city: e.target.value })} className="h-10 rounded-lg text-center" /></TableCell>
                                                <TableCell><Input type="number" value={newRoute.distance_km} onChange={e => setNewRoute({ ...newRoute, distance_km: parseFloat(e.target.value) })} className="h-10 rounded-lg text-center" /></TableCell>
                                                <TableCell><Input type="number" placeholder="آلي إذا ترك فارغ" value={newRoute.manual_price || ''} onChange={e => setNewRoute({ ...newRoute, manual_price: parseFloat(e.target.value) })} className="h-10 rounded-lg text-center" /></TableCell>
                                                <TableCell className="flex justify-center gap-2"><Button onClick={handleAddRoute} size="sm"><Check size={16} /></Button></TableCell>
                                            </TableRow>
                                        )}
                                        {filteredRoutes.map(r => (
                                            <TableRow key={r.id} className="text-center hover:bg-slate-50">
                                                <TableCell className="font-bold">{r.origin_city}</TableCell>
                                                <TableCell className="font-bold">{r.destination_city}</TableCell>
                                                <TableCell className="font-bold text-slate-500">{r.distance_km} كم</TableCell>
                                                <TableCell className="font-black text-emerald-600">{r.manual_price ? `${r.manual_price} ر.س` : 'آلي'}</TableCell>
                                                <TableCell><Button variant="ghost" className="text-rose-500" onClick={() => handleDeleteRoute(r.id)}><Trash2 size={16} /></Button></TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </AdminLayout >
    );
}

function Save({ size, className }: { size: number, className: string }) {
    return <Settings size={size} className={className} />;
}
