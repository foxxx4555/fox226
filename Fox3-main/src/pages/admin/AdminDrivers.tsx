import { useEffect, useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Search, Truck, MapPin, Phone, CheckCircle2, XCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function AdminDrivers() {
    const [drivers, setDrivers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    const fetchDrivers = async () => {
        try {
            // Fetch users with the 'driver' role
            const { data: driverRoles, error: rolesErr } = await supabase
                .from('user_roles')
                .select('user_id')
                .eq('role', 'driver');

            if (rolesErr) throw rolesErr;

            const driverIds = driverRoles?.map(r => r.user_id) || [];
            if (driverIds.length === 0) {
                setDrivers([]);
                return;
            }

            // Fetch profiles for these driver IDs
            const { data: profiles, error: profileErr } = await supabase
                .from('profiles')
                .select('*')
                .in('id', driverIds)
                .order('created_at', { ascending: false });

            if (profileErr) throw profileErr;

            // Fetch their trucks
            const { data: trucksData, error: truckErr } = await supabase
                .from('trucks')
                .select('*')
                .in('owner_id', driverIds);

            if (truckErr) throw truckErr;

            // Connect profiles with truck data
            const driversWithData = profiles?.map(profile => {
                const userTrucks = trucksData?.filter(t => t.owner_id === profile.id) || [];
                return {
                    ...profile,
                    trucks: userTrucks
                };
            });

            setDrivers(driversWithData || []);
        } catch (e) {
            console.error(e);
            toast.error('حدث خطأ أثناء جلب المستودعات والمركبات');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDrivers();
    }, []);

    const handleAction = () => {
        toast.info('هذه الميزة تحت التطوير');
    }

    const filteredDrivers = drivers.filter(driver =>
        driver.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        driver.phone?.includes(searchQuery) ||
        driver.trucks.some((t: any) => t.plate_number?.includes(searchQuery))
    );

    return (
        <AdminLayout>
            <div className="space-y-8 max-w-7xl mx-auto pb-20">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                            <Truck className="text-blue-600" size={32} />
                            إدارة السائقين والمركبات
                        </h1>
                        <p className="text-muted-foreground font-medium mt-2">متابعة حسابات السائقين الناقلين وبيانات شاحناتهم</p>
                    </div>

                    <div className="relative w-full md:w-96">
                        <Input
                            placeholder="ابحث بالاسم، الجوال أو رقم اللوحة..."
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
                ) : filteredDrivers.length === 0 ? (
                    <div className="text-center py-24 bg-white rounded-[3rem] border-2 border-dashed border-slate-200">
                        <Truck size={64} className="mx-auto text-slate-300 mb-4" />
                        <p className="font-bold text-slate-500 text-lg">لا يوجد أي سائق مطابق للبحث</p>
                    </div>
                ) : (
                    <div className="grid gap-6">
                        {filteredDrivers.map(driver => (
                            <Card key={driver.id} className="rounded-[2rem] border-none shadow-md hover:shadow-xl transition-all bg-white relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-2 h-full bg-emerald-500"></div>

                                <CardContent className="p-6 flex flex-col md:flex-row justify-between items-start gap-8">
                                    {/* بيانات السائق */}
                                    <div className="flex items-start gap-5 min-w-[300px]">
                                        <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center text-2xl font-black text-emerald-600 border border-emerald-100">
                                            {driver.full_name ? driver.full_name.charAt(0) : 'س'}
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-black text-slate-800">{driver.full_name || 'سائق غير معروف'}</h3>
                                            <div className="flex flex-col gap-2 mt-2 font-bold text-slate-500 text-sm">
                                                <span className="flex items-center gap-2"><Phone size={14} className="text-slate-400" /> <span dir="ltr">{driver.phone || 'لا يوجد هاتف'}</span></span>
                                                <span className="flex items-center gap-2"><MapPin size={14} className="text-slate-400" /> {driver.country_code || 'السعودية'}</span>
                                            </div>
                                            <Badge variant="outline" className="mt-3 bg-slate-50 border-slate-200 text-slate-600">
                                                {new Date(driver.created_at).toLocaleDateString('ar-SA')} تاريخ التسجيل
                                            </Badge>
                                        </div>
                                    </div>

                                    {/* بيانات الشاحنة */}
                                    <div className="flex-1 w-full bg-slate-50 rounded-2xl p-5 border border-slate-100">
                                        <h4 className="font-black text-slate-700 mb-4 flex items-center gap-2">
                                            <Truck size={16} className="text-slate-400" /> المركبات المسجلة ({driver.trucks.length})
                                        </h4>

                                        {driver.trucks.length > 0 ? (
                                            <div className="space-y-3">
                                                {driver.trucks.map((truck: any) => (
                                                    <div key={truck.id} className="flex flex-wrap items-center justify-between gap-4 p-3 bg-white rounded-xl border border-slate-200">
                                                        <div>
                                                            <p className="font-bold text-slate-800">{truck.brand || 'غير محدد'} {truck.model_year || ''}</p>
                                                            <p className="text-xs font-bold text-slate-500 mt-1 capitalize">{truck.truck_type?.replace('_', ' ') || 'نوع الشاحنة غير محدد'}</p>
                                                        </div>
                                                        <Badge variant="outline" className="text-lg py-1 px-3 bg-slate-100 tracking-widest font-mono">
                                                            {truck.plate_number}
                                                        </Badge>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="p-4 bg-white rounded-xl border border-slate-200 text-center text-slate-500 font-bold text-sm">
                                                لا توجد مركبات مسجلة في ملف السائق
                                            </div>
                                        )}
                                    </div>

                                    {/* أزرار الإجراءات */}
                                    <div className="flex flex-row md:flex-col gap-3 w-full md:w-auto mt-4 md:mt-0">
                                        <Button
                                            variant="outline"
                                            onClick={handleAction}
                                            className="flex-1 h-12 rounded-xl font-bold border-slate-200 text-slate-600 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200"
                                        >
                                            <CheckCircle2 size={16} className="me-2" /> تنشيط السائق
                                        </Button>
                                        <Button
                                            variant="outline"
                                            onClick={handleAction}
                                            className="flex-1 h-12 rounded-xl font-bold border-slate-200 text-slate-600 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200"
                                        >
                                            <XCircle size={16} className="me-2" /> إيقاف الحساب
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
