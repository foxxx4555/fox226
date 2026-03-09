import React, { useState, useEffect } from 'react';
import {
    User, Layers, Navigation, Pencil, Coins, Search, Loader2,
    Truck, Star, Phone, MapPin, CheckCircle2, ShieldAlert,
    FileCheck, ExternalLink, XCircle, FileCheck as FileCheckIcon
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import AdminLayout from './AdminLayout';

export default function AdminDrivers() {
    const [drivers, setDrivers] = useState<any[]>([]);
    const [trucks, setTrucks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    const fetchData = async () => {
        try {
            setLoading(true);
            // 1. جلب السائقين (Profiles) مع أدوارهم
            const { data: profiles, error: pErr } = await supabase
                .from('profiles')
                .select(`
                    *,
                    support_tickets (id, status),
                    ratings!ratings_rated_id_fkey (rating),
                    user_roles!inner (role)
                `)
                .eq('user_roles.role', 'driver')
                .order('created_at', { ascending: false });

            // 2. جلب كل الشاحنات، ثم ربطها ببيانات أصحابها محلياً لتجنب خطأ العلاقات (PGRST200)
            const { data: rawTrucks, error: tErr } = await supabase
                .from('trucks')
                .select('*');

            if (pErr || tErr) throw pErr || tErr;

            const trucksData = (rawTrucks || []).map((truck: any) => {
                const owner = (profiles || []).find((p: any) => p.id === truck.owner_id);
                return {
                    ...truck,
                    owner: owner ? { full_name: owner.full_name, phone: owner.phone } : null
                };
            });

            const driversWithData = await Promise.all((profiles || []).map(async (profile: any) => {
                const activeReportsCount = profile.support_tickets?.filter((r: any) => r.status !== 'resolved' && r.status !== 'closed').length || 0;

                // حساب متوسط التقييم
                const ratingsList = profile.ratings || [];
                const avgRating = ratingsList.length > 0
                    ? ratingsList.reduce((sum: number, r: any) => sum + r.rating, 0) / ratingsList.length
                    : 0;

                // نظام الإيقاف التلقائي (Auto-Suspension)
                let currentStatus = profile.status;
                if (activeReportsCount >= 5 && currentStatus !== 'suspended') {
                    await supabase.from('profiles').update({ status: 'suspended' } as any).eq('id', profile.id);
                    currentStatus = 'suspended';
                    toast.error(`تم الإيقاف التلقائي للسائق: ${profile.full_name} بسبب كثرة البلاغات`);
                }

                return {
                    ...profile,
                    status: currentStatus,
                    reports_count: profile.support_tickets?.length || 0,
                    active_reports: activeReportsCount,
                    avg_rating: avgRating,
                    ratings_count: ratingsList.length,
                    is_verified: currentStatus === 'active'
                };
            }));

            setDrivers(driversWithData || []);
            setTrucks(trucksData || []);
        } catch (e) {
            console.error(e);
            toast.error('حدث خطأ أثناء جلب البيانات');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleVerifyDriver = async (driverId: string) => {
        try {
            // استخدام RPC لتجاوز RLS حيث لا يستطيع الأدمن تعديل بروفايلات الآخرين مباشرة
            const { error } = await supabase.rpc('admin_update_user_status', {
                target_user_id: driverId,
                new_status: 'active', // اختياري لو كنت عايز تعتمد التفعيل معاه
                is_verified_status: true
            });

            if (error) {
                // الفولباك (Fallback) لو الـ RPC لسه مش موجود في الداتابيز
                console.warn("RPC failed, trying direct update...");
                const { error: fallbackError } = await supabase
                    .from('profiles')
                    .update({ status: 'active' } as any)
                    .eq('id', driverId);

                if (fallbackError) throw fallbackError;
            }

            toast.success('تم توثيق حساب السائق بنجاح ✅');
            fetchData();
        } catch (e) {
            toast.error('فشل عملية التوثيق');
        }
    };

    const handleAction = async (driverId: string, action: 'activate' | 'suspend') => {
        try {
            const newStatus = action === 'activate' ? 'active' : 'suspended';

            const { error } = await supabase.rpc('admin_update_user_status', {
                target_user_id: driverId,
                new_status: newStatus,
                is_verified_status: null // لا تغير حالة التوثيق الحالية
            });

            if (error) {
                const { error: fallbackError } = await supabase
                    .from('profiles')
                    .update({ status: newStatus } as any)
                    .eq('id', driverId);

                if (fallbackError) throw fallbackError;
            }

            toast.success(action === 'activate' ? 'تم تنشيط حساب السائق' : 'تم إيقاف حساب السائق');
            fetchData();
        } catch (e) {
            toast.error('فشل في تنفيذ الإجراء');
        }
    };

    const filteredDrivers = drivers.filter(driver =>
        driver.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        driver.phone?.includes(searchQuery)
    );

    const filteredTrucks = trucks.filter(truck =>
        truck.plate_number?.includes(searchQuery) ||
        truck.brand?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        truck.owner?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <AdminLayout>
            <div className="space-y-8 max-w-7xl mx-auto pb-20 px-4">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
                            <Layers className="text-blue-600" size={32} />
                            إدارة الأسطول والناقلين
                        </h1>
                        <p className="text-slate-500 font-bold mt-1">تحكم كامل في حسابات السائقين وتوثيق الشاحنات</p>
                    </div>
                    <div className="relative w-full md:w-96">
                        <Input
                            placeholder="ابحث بالاسم، اللوحة، أو الجوال..."
                            className="h-14 rounded-2xl bg-slate-50 border-none font-bold pl-12"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <Loader2 className="animate-spin text-blue-600" size={48} />
                    </div>
                ) : (
                    <Tabs defaultValue="drivers" className="w-full" dir="rtl">
                        <TabsList className="bg-white p-2 rounded-2xl shadow-sm mb-8 h-16 border border-slate-100 gap-2 overflow-x-auto flex flex-nowrap min-w-full">
                            <TabsTrigger value="drivers" className="flex-1 rounded-xl font-black text-lg data-[state=active]:bg-blue-600 data-[state=active]:text-white transition-all whitespace-nowrap min-w-[200px]">
                                <User className="me-2 inline" size={20} /> السائقين ({filteredDrivers.length})
                            </TabsTrigger>
                            <TabsTrigger value="trucks" className="flex-1 rounded-xl font-black text-lg data-[state=active]:bg-blue-600 data-[state=active]:text-white transition-all whitespace-nowrap min-w-[200px]">
                                <Truck className="me-2 inline" size={20} /> الشاحنات ({filteredTrucks.length})
                            </TabsTrigger>
                        </TabsList>

                        {/* --- قسم السائقين --- */}
                        <TabsContent value="drivers" className="grid gap-6 mt-4">
                            {filteredDrivers.map(driver => (
                                <Card key={driver.id} className="rounded-[2.5rem] border-none shadow-md bg-white relative overflow-hidden group hover:shadow-xl transition-all">
                                    <div className={`absolute top-0 right-0 w-2 h-full ${driver.status === 'active' ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                                    <CardContent className="p-8 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 pl-10 pr-12">

                                        <div className="flex items-start gap-6 min-w-0 lg:min-w-[400px]">
                                            <div className="flex flex-col items-center gap-2 relative">
                                                <div className="w-20 h-20 rounded-3xl bg-blue-50 flex items-center justify-center text-3xl font-black text-blue-600 border border-blue-100 relative">
                                                    {driver.full_name ? driver.full_name.charAt(0) : 'س'}
                                                    {/* النقطة الخضراء للحالة */}
                                                    <span className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-4 border-white ${driver.status === 'active' ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                                                </div>
                                                {/* التقييم */}
                                                <div className="flex items-center gap-1 bg-amber-50 px-3 py-1.5 rounded-xl text-amber-600 font-bold text-sm border border-amber-100 shadow-sm mt-1">
                                                    <span>{driver.avg_rating > 0 ? driver.avg_rating.toFixed(1) : 'جديد'}</span>
                                                    <Star size={14} className={driver.avg_rating > 0 ? "fill-amber-500" : ""} />
                                                </div>
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <h3 className="text-2xl font-black text-slate-800 tracking-tight truncate" title={driver.full_name}>{driver.full_name || 'سائق غير معروف'}</h3>
                                                <div className="flex flex-col gap-2 mt-2 font-bold text-slate-500 text-sm">
                                                    <span className="flex items-center gap-2"><Phone size={14} className="text-slate-400" /> <span dir="ltr">{driver.phone || 'لا يوجد هاتف'}</span></span>
                                                    <span className="flex items-center gap-2"><MapPin size={14} className="text-slate-400" /> {driver.country_code || 'السعودية'}</span>
                                                </div>

                                                <div className="flex flex-wrap gap-2 mt-4">
                                                    {driver.status === 'suspended' ?
                                                        <Badge variant="outline" className="bg-rose-50 border-rose-200 text-rose-600 px-3 py-1 font-bold">موظف محظور</Badge> :
                                                        <Badge variant="outline" className="bg-emerald-50 border-emerald-200 text-emerald-600 px-3 py-1 font-bold">حساب نشط</Badge>
                                                    }
                                                    {driver.active_reports > 0 && (
                                                        <Badge variant="outline" className="bg-amber-50 border-amber-200 text-amber-700 font-bold px-3 py-1">بلاغات المفتوحة ({driver.active_reports})</Badge>
                                                    )}
                                                    {driver.is_verified ? (
                                                        <Badge className="bg-emerald-50 text-emerald-600 border border-emerald-200 cursor-pointer hover:bg-emerald-100 px-3 py-1">
                                                            <CheckCircle2 size={12} className="me-1" /> حساب موثق
                                                        </Badge>
                                                    ) : (
                                                        <Badge className="bg-rose-50 text-rose-600 border border-rose-200 animate-pulse cursor-pointer px-3 py-1">
                                                            <ShieldAlert size={12} className="me-1" /> بانتظار التوثيق
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-3 w-full lg:w-auto shrink-0 mt-4 lg:mt-0">
                                            {/* توثيق السائق إذا لم يكن موثق */}
                                            {!driver.is_verified && (
                                                <Button
                                                    onClick={() => handleVerifyDriver(driver.id)}
                                                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl h-12 px-8 shadow-md shadow-emerald-500/20"
                                                >
                                                    <FileCheck size={18} className="me-2" /> اعتماد الهوية
                                                </Button>
                                            )}

                                            <Dialog>
                                                <DialogTrigger asChild>
                                                    <Button variant="outline" className="h-12 px-8 rounded-xl font-bold border-slate-200 text-slate-600 hover:bg-slate-50">
                                                        <FileCheck size={18} className="me-2 text-slate-400" /> عرض المستندات
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent className="max-w-5xl bg-white rounded-[2.5rem] p-10 outline-none border-none shadow-2xl max-h-[90vh] overflow-y-auto w-[95vw]">
                                                    <DialogHeader>
                                                        <DialogTitle className="text-2xl font-black text-right border-b pb-4 border-slate-100">مراجعة مستندات السائق: {driver.full_name}</DialogTitle>
                                                    </DialogHeader>
                                                    <div className="mt-6 flex flex-col items-center justify-center">
                                                        {(driver.id_document_url || driver.driving_license_url || driver.vehicle_insurance_url || driver.truck_image_url || driver.id_card_url) ? (
                                                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 w-full" dir="rtl">
                                                                {/* الهوية */}
                                                                {(driver.id_document_url || driver.id_card_url) && (
                                                                    <div className="flex flex-col items-center bg-slate-50 p-6 rounded-3xl border border-slate-100">
                                                                        <h4 className="font-black text-slate-700 mb-4 text-center">الهوية / الإقامة</h4>
                                                                        <div className="w-full bg-white p-2 rounded-2xl border border-slate-100 mb-4 flex justify-center items-center overflow-hidden h-[250px]">
                                                                            {(driver.id_document_url || driver.id_card_url).toLowerCase().includes('.pdf') ? (
                                                                                <div className="flex flex-col items-center justify-center text-center">
                                                                                    <FileCheck size={64} className="text-amber-500 mb-3" />
                                                                                    <span className="font-bold text-slate-500 text-lg">ملف PDF</span>
                                                                                </div>
                                                                            ) : (
                                                                                <img src={driver.id_document_url || driver.id_card_url} alt="الهوية / الإقامة" className="max-h-[230px] w-auto object-contain rounded-xl" />
                                                                            )}
                                                                        </div>
                                                                        <a href={driver.id_document_url || driver.id_card_url} target="_blank" rel="noreferrer" className="w-full flex items-center justify-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-amber-600 font-bold py-3 px-4 rounded-xl transition-colors shadow-sm">
                                                                            <ExternalLink size={18} /> فتح المستند
                                                                        </a>
                                                                    </div>
                                                                )}

                                                                {/* رخصة القيادة */}
                                                                {driver.driving_license_url && (
                                                                    <div className="flex flex-col items-center bg-slate-50 p-6 rounded-3xl border border-slate-100">
                                                                        <h4 className="font-black text-slate-700 mb-4 text-center">رخصة القيادة</h4>
                                                                        <div className="w-full bg-white p-2 rounded-2xl border border-slate-100 mb-4 flex justify-center items-center overflow-hidden h-[250px]">
                                                                            {driver.driving_license_url.toLowerCase().includes('.pdf') ? (
                                                                                <div className="flex flex-col items-center justify-center text-center">
                                                                                    <FileCheck size={64} className="text-blue-500 mb-3" />
                                                                                    <span className="font-bold text-slate-500 text-lg">ملف PDF</span>
                                                                                </div>
                                                                            ) : (
                                                                                <img src={driver.driving_license_url} alt="رخصة القيادة" className="max-h-[230px] w-auto object-contain rounded-xl" />
                                                                            )}
                                                                        </div>
                                                                        <a href={driver.driving_license_url} target="_blank" rel="noreferrer" className="w-full flex items-center justify-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-blue-600 font-bold py-3 px-4 rounded-xl transition-colors shadow-sm">
                                                                            <ExternalLink size={18} /> فتح المستند
                                                                        </a>
                                                                    </div>
                                                                )}

                                                                {/* تأمين المركبة */}
                                                                {driver.vehicle_insurance_url && (
                                                                    <div className="flex flex-col items-center bg-slate-50 p-6 rounded-3xl border border-slate-100">
                                                                        <h4 className="font-black text-slate-700 mb-4 text-center">تأمين المركبة</h4>
                                                                        <div className="w-full bg-white p-2 rounded-2xl border border-slate-100 mb-4 flex justify-center items-center overflow-hidden h-[250px]">
                                                                            {driver.vehicle_insurance_url.toLowerCase().includes('.pdf') ? (
                                                                                <div className="flex flex-col items-center justify-center text-center">
                                                                                    <FileCheck size={64} className="text-emerald-500 mb-3" />
                                                                                    <span className="font-bold text-slate-500 text-lg">ملف PDF</span>
                                                                                </div>
                                                                            ) : (
                                                                                <img src={driver.vehicle_insurance_url} alt="تأمين المركبة" className="max-h-[230px] w-auto object-contain rounded-xl" />
                                                                            )}
                                                                        </div>
                                                                        <a href={driver.vehicle_insurance_url} target="_blank" rel="noreferrer" className="w-full flex items-center justify-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-emerald-600 font-bold py-3 px-4 rounded-xl transition-colors shadow-sm">
                                                                            <ExternalLink size={18} /> فتح المستند
                                                                        </a>
                                                                    </div>
                                                                )}

                                                                {/* صورة الشاحنة */}
                                                                {driver.truck_image_url && (
                                                                    <div className="flex flex-col items-center bg-slate-50 p-6 rounded-3xl border border-slate-100">
                                                                        <h4 className="font-black text-slate-700 mb-4 text-center">صورة الشاحنة</h4>
                                                                        <div className="w-full bg-white p-2 rounded-2xl border border-slate-100 mb-4 flex justify-center items-center overflow-hidden h-[250px]">
                                                                            {driver.truck_image_url.toLowerCase().includes('.pdf') ? (
                                                                                <div className="flex flex-col items-center justify-center text-center">
                                                                                    <FileCheck size={64} className="text-blue-500 mb-3" />
                                                                                    <span className="font-bold text-slate-500 text-lg">ملف PDF</span>
                                                                                </div>
                                                                            ) : (
                                                                                <img src={driver.truck_image_url} alt="صورة الشاحنة" className="max-h-[230px] w-auto object-contain rounded-xl" />
                                                                            )}
                                                                        </div>
                                                                        <a href={driver.truck_image_url} target="_blank" rel="noreferrer" className="w-full flex items-center justify-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-blue-600 font-bold py-3 px-4 rounded-xl transition-colors shadow-sm">
                                                                            <ExternalLink size={18} /> فتح الصورة
                                                                        </a>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <div className="py-20 bg-slate-50 w-full rounded-3xl text-slate-400 font-bold text-center flex flex-col items-center border-2 border-dashed border-slate-200">
                                                                <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-sm mb-6">
                                                                    <FileCheck size={48} className="text-slate-300" />
                                                                </div>
                                                                <p className="text-xl">لم يرفع السائق المستندات بعد</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </DialogContent>
                                            </Dialog>

                                            <div className="flex gap-2 w-full mt-2">
                                                {driver.status === 'active' ? (
                                                    <Button onClick={() => handleAction(driver.id, 'suspend')} variant="outline" className="flex-1 h-12 rounded-xl font-bold border-rose-100 text-rose-500 hover:bg-rose-50">
                                                        <XCircle size={16} className="me-2" /> إيقاف
                                                    </Button>
                                                ) : (
                                                    <Button onClick={() => handleAction(driver.id, 'activate')} variant="outline" className="flex-1 h-12 rounded-xl font-bold border-emerald-100 text-emerald-600 hover:bg-emerald-50">
                                                        <CheckCircle2 size={16} className="me-2" /> تنشيط
                                                    </Button>
                                                )}
                                                <Button
                                                    variant="outline"
                                                    className="h-12 w-12 p-0 rounded-xl border-slate-200 text-slate-400 hover:text-blue-600 hover:bg-blue-50 tooltip items-center justify-center flex"
                                                    title="تتبع السائق المباشر"
                                                    onClick={async () => {
                                                        const { data } = await (supabase as any).from('profiles').select('latitude, longitude').eq('id', driver.id).single();
                                                        if (data?.latitude && data?.longitude) {
                                                            window.open(`https://maps.google.com/?q=${data.latitude},${data.longitude}`, '_blank');
                                                        } else {
                                                            toast.error('لم يقم هذا السائق بمشاركة موقعه الحالي بعد');
                                                        }
                                                    }}
                                                >
                                                    <Navigation size={20} />
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                            {filteredDrivers.length === 0 && (
                                <div className="text-center py-24 bg-white rounded-[3rem] border border-slate-100 shadow-sm mt-4">
                                    <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <User size={48} className="text-slate-300" />
                                    </div>
                                    <p className="text-slate-500 font-black text-xl">لا يوجد سائقين مطابقين للبحث</p>
                                </div>
                            )}
                        </TabsContent>

                        {/* --- قسم الشاحنات --- */}
                        <TabsContent value="trucks" className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
                            {filteredTrucks.map(truck => (
                                <Card key={truck.id} className="rounded-[2.5rem] border-none shadow-md bg-white overflow-hidden group hover:shadow-xl transition-all">
                                    <CardContent className="p-0">
                                        <div className="bg-slate-900 px-8 py-5 text-white flex justify-between items-center relative overflow-hidden">
                                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
                                            <div className="flex items-center gap-4 relative z-10">
                                                <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center border border-slate-700">
                                                    <Truck className="text-blue-400" size={24} />
                                                </div>
                                                <div>
                                                    <span className="font-black text-xl block">{truck.brand || 'ماركة غير معروفة'}</span>
                                                    <span className="text-slate-400 font-bold text-sm block mt-1">{truck.model_year || '---'}</span>
                                                </div>
                                            </div>
                                            <Badge className="bg-blue-500 font-mono text-xl px-4 py-2 shadow-sm rounded-xl relative z-10 tracking-widest border-none">
                                                {truck.plate_number}
                                            </Badge>
                                        </div>
                                        <div className="p-8 space-y-6">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <User size={14} className="text-slate-400" />
                                                        <p className="text-[11px] font-black text-slate-400 uppercase">المالك</p>
                                                    </div>
                                                    <p className="font-bold text-slate-700 text-lg truncate" title={truck.owner?.full_name}>{truck.owner?.full_name}</p>
                                                </div>
                                                <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <Truck size={14} className="text-slate-400" />
                                                        <p className="text-[11px] font-black text-slate-400 uppercase">نوع الشاحنة</p>
                                                    </div>
                                                    <p className="font-bold text-slate-700 text-lg capitalize">{truck.truck_type?.replace('_', ' ') || 'غير محدد'}</p>
                                                </div>
                                            </div>

                                            <div className="flex gap-3 pt-2">
                                                <div className="flex-1 bg-blue-50/50 p-4 rounded-2xl border border-blue-100/50 flex flex-col justify-center">
                                                    <p className="text-[10px] font-black text-blue-400 uppercase mb-1">الأجرة المحددة</p>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-xl font-black text-blue-700">{truck.rent_price || 0} <small className="text-[10px] text-blue-500">ر.س</small></span>
                                                        <Dialog>
                                                            <DialogTrigger asChild>
                                                                <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-blue-400 hover:text-blue-600 hover:bg-blue-100 rounded-lg">
                                                                    <Pencil size={16} />
                                                                </Button>
                                                            </DialogTrigger>
                                                            <DialogContent className="bg-white rounded-[2rem] p-8 outline-none border-none shadow-2xl w-[400px]">
                                                                <DialogHeader>
                                                                    <DialogTitle className="text-xl font-black text-right">تعديل أجرة الشاحنة</DialogTitle>
                                                                </DialogHeader>
                                                                <div className="space-y-6 mt-4">
                                                                    <div className="space-y-2">
                                                                        <label className="text-sm font-bold text-slate-500 block text-right">السعر الجديد (ريال سعودي)</label>
                                                                        <Input
                                                                            type="number"
                                                                            defaultValue={truck.rent_price}
                                                                            className="h-14 rounded-xl bg-slate-50 border-none font-black text-xl text-center"
                                                                            id={`price-input-${truck.id}`}
                                                                        />
                                                                    </div>
                                                                    <Button
                                                                        onClick={async () => {
                                                                            const input = document.getElementById(`price-input-${truck.id}`) as HTMLInputElement;
                                                                            const price = parseFloat(input.value);
                                                                            try {
                                                                                // @ts-ignore
                                                                                const { error } = await supabase.rpc('admin_update_truck_price', {
                                                                                    p_truck_id: truck.id,
                                                                                    p_new_price: price
                                                                                });
                                                                                if (error) throw error;
                                                                                toast.success('تم تحديث السعر بنجاح');
                                                                                fetchData();
                                                                            } catch (e) {
                                                                                toast.error('فشل في تحديث السعر');
                                                                            }
                                                                        }}
                                                                        className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl text-lg shadow-lg shadow-blue-500/20"
                                                                    >
                                                                        حفظ السعر الجديد
                                                                    </Button>
                                                                </div>
                                                            </DialogContent>
                                                        </Dialog>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex gap-3 pt-2">
                                                <Button variant="outline" className="flex-1 h-12 rounded-2xl font-bold border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-colors">
                                                    <FileCheck size={18} className="me-2 text-slate-400" /> الاستمارة
                                                </Button>
                                                <Button variant="outline" className="flex-1 h-12 rounded-2xl font-bold border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-emerald-600 transition-colors">
                                                    <ShieldAlert size={18} className="me-2 text-slate-400" /> التأمين
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                            {filteredTrucks.length === 0 && (
                                <div className="text-center py-24 bg-white rounded-[3rem] border border-slate-100 shadow-sm col-span-1 lg:col-span-2 mt-4">
                                    <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <Truck size={48} className="text-slate-300" />
                                    </div>
                                    <p className="text-slate-500 font-black text-xl">لا توجد شاحنات مطابقة للبحث</p>
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>
                )}
            </div>
        </AdminLayout>
    );
}
