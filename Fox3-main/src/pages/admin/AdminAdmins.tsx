import { useEffect, useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Search, ShieldCheck, UserCheck, ShieldAlert, Key } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function AdminAdmins() {
    const [admins, setAdmins] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    const fetchAdmins = async () => {
        try {
            // Fetch user roles that are of type 'Super Admin', 'Operations Manager', etc.
            const { data: rolesData, error: rolesErr } = await supabase
                .from('user_roles')
                .select('*, profiles(*)');

            if (rolesErr) throw rolesErr;

            // Filter to only include admin-type roles (excluding driver and shipper)
            const adminTypes = ['super_admin', 'operations', 'carrier_manager', 'support', 'finance', 'analytics', 'Super Admin', 'Operations Manager', 'Carrier Manager', 'Vendor Manager', 'Buyer Manager', 'Support', 'Finance', 'Analytics'];

            const adminUsers = rolesData?.filter(r => adminTypes.includes(r.role))?.map((r: any) => ({
                ...(r.profiles || {}),
                role: r.role,
                role_id: r.id
            })) || [];

            // Remove duplicates if a user has multiple admin roles
            const uniqueAdmins = Array.from(new Map(adminUsers.map(item => [item.id, item])).values());

            setAdmins(uniqueAdmins);
        } catch (e) {
            console.error(e);
            toast.error('حدث خطأ أثناء جلب مسؤولي النظام');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAdmins();
    }, []);

    const handleEditPermissions = () => {
        toast.info('ميزة تعديل الصلاحيات قيد التطوير');
    };

    const filteredAdmins = admins.filter(admin =>
        admin.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        admin.role?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <AdminLayout>
            <div className="space-y-8 max-w-7xl mx-auto pb-20">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                            <ShieldCheck className="text-blue-600" size={32} />
                            إدارة مسؤولي النظام
                        </h1>
                        <p className="text-muted-foreground font-medium mt-2">عرض وإدارة الحسابات ذات الصلاحيات الإدارية في النظام</p>
                    </div>

                    <div className="relative w-full md:w-96">
                        <Input
                            placeholder="ابحث بالاسم أو الصلاحية..."
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
                ) : filteredAdmins.length === 0 ? (
                    <div className="text-center py-24 bg-white rounded-[3rem] border-2 border-dashed border-slate-200">
                        <ShieldAlert size={64} className="mx-auto text-slate-300 mb-4" />
                        <p className="font-bold text-slate-500 text-lg">لا يوجد أي مدراء مطابقين للبحث</p>
                    </div>
                ) : (
                    <div className="grid gap-6 md:grid-cols-2">
                        {filteredAdmins.map(admin => (
                            <Card key={admin.id + admin.role} className="rounded-[2rem] border-none shadow-md hover:shadow-xl transition-all bg-white relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-2 h-full bg-blue-600"></div>

                                <CardContent className="p-6 flex flex-col justify-between h-full gap-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-xl font-black text-slate-400">
                                            {admin.full_name ? admin.full_name.charAt(0) : '?'}
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-black text-slate-800">{admin.full_name || 'مدير نظام'}</h3>
                                            <p className="text-sm font-bold text-slate-500 mt-1" dir="ltr">{admin.phone || admin.email || '---'}</p>
                                        </div>
                                    </div>

                                    <div className="bg-slate-50 rounded-2xl p-4 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Key size={16} className="text-slate-400" />
                                            <span className="text-sm font-black text-slate-600">قطاع الصلاحية:</span>
                                        </div>
                                        <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50 font-bold px-3 py-1">
                                            {admin.role}
                                        </Badge>
                                    </div>

                                    <div className="pt-2 border-t border-slate-50 flex gap-3">
                                        <Button
                                            variant="outline"
                                            onClick={handleEditPermissions}
                                            className="flex-1 h-12 rounded-xl font-bold border-blue-100 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                                        >
                                            تعديل الصلاحيات
                                        </Button>
                                        <Button
                                            variant="outline"
                                            onClick={handleEditPermissions}
                                            className="flex-1 h-12 rounded-xl font-bold border-rose-100 text-rose-500 hover:bg-rose-50 hover:text-rose-600"
                                        >
                                            إيقاف الصلاحية
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
