import { useEffect, useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Search, ShieldCheck, UserCheck, ShieldAlert, Key, Plus } from 'lucide-react';
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { api } from '@/services/api';

// --- دالة موحدة لتحويل المسميات لأسماء قاعدة البيانات ---
const mapRoleForDB = (role: string) => {
    const mapping: Record<string, string> = {
        'مدير عام': 'super_admin',
        'العمليات': 'operations',
        'إدارة الناقلين': 'carrier_manager',
        'إدارة التجار': 'vendor_manager',
        'دعم العملاء': 'support',
        'المالية': 'finance',
        'التحليلات': 'analytics',
        'التاجر': 'shipper'
    };
    return mapping[role] || 'admin';
};

export default function AdminAdmins() {
    const [admins, setAdmins] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showAddAdmin, setShowAddAdmin] = useState(false);
    const [isAdding, setIsAdding] = useState(false);
    const [newAdmin, setNewAdmin] = useState({
        full_name: '',
        phone: '',
        username: '',
        email: '',
        password: '',
        role: 'العمليات'
    });
    const [showEditAdmin, setShowEditAdmin] = useState(false);
    const [editingAdmin, setEditingAdmin] = useState<any>(null);
    const [isUpdating, setIsUpdating] = useState(false);

    // OTP states
    const [otpStep, setOtpStep] = useState(false);
    const [otpCode, setOtpCode] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const [savedEmail, setSavedEmail] = useState('');
    const [dbRole, setDbRole] = useState('');

    const fetchAdmins = async () => {
        try {
            // Fetch user roles that are of type 'Super Admin', 'Operations Manager', etc.
            const { data: rolesData, error: rolesErr } = await supabase
                .from('user_roles')
                .select('*, profiles!user_id(*)');

            if (rolesErr) throw rolesErr;

            // Filter to only include admin-type roles (excluding driver and shipper)
            const nonAdminRoles = ['driver', 'shipper'];

            const adminUsers = rolesData
                ?.filter(r => !nonAdminRoles.includes(r.role?.toLowerCase()))
                ?.map((r: any) => {
                    const dbRole = r.role;
                    const displayRoles: Record<string, string> = {
                        'super_admin': 'مدير عام',
                        'operations': 'العمليات',
                        'carrier_manager': 'إدارة الناقلين',
                        'vendor_manager': 'إدارة التجار',
                        'support': 'دعم العملاء',
                        'finance': 'المالية',
                        'analytics': 'التحليلات',
                        'shipper': 'التاجر',
                        'admin': 'مسؤول نظام'
                    };
                    return {
                        ...(r.profiles || {}),
                        role: displayRoles[dbRole] || 'مسؤول نظام',
                        role_id: r.id
                    };
                }) || [];

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

    const handleRevokePermission = async (admin: any) => {
        if (!window.confirm(`هل أنت متأكد من سحب صلاحيات المسؤول ${admin.full_name}؟`)) return;
        try {
            const { error } = await supabase.from('user_roles').delete().eq('id', admin.role_id);
            if (error) throw error;
            toast.success('تم إيقاف صلاحية المسؤول بنجاح');
            fetchAdmins();
        } catch (e: any) {
            toast.error(e.message || 'حدث خطأ أثناء إيقاف الصلاحية');
        }
    };

    const handleUpdateRole = async () => {
        if (!editingAdmin) return;
        setIsUpdating(true);
        try {
            const dbRole = mapRoleForDB(editingAdmin.newRole);
            const { error } = await supabase.from('user_roles').update({ role: dbRole as any }).eq('id', editingAdmin.role_id);

            if (error) throw error;
            toast.success('تم تحديث الصلاحية بنجاح');
            setShowEditAdmin(false);
            setEditingAdmin(null);
            fetchAdmins();
        } catch (e: any) {
            toast.error(e.message || 'حدث خطأ أثناء تحديث الصلاحية');
        } finally {
            setIsUpdating(false);
        }
    };

    const filteredAdmins = admins.filter(admin =>
        admin.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        admin.role?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleAddAdmin = async () => {
        if (!newAdmin.full_name || !newAdmin.phone || !newAdmin.password) {
            toast.error('يرجى تعبئة جميع الحقول المطلوبة');
            return;
        }

        setIsAdding(true);
        try {
            const adminUsername = newAdmin.username.trim();
            if (!adminUsername) {
                toast.error('اسم المستخدم مطلوب');
                setIsAdding(false);
                return;
            }

            // التحقق من توفر اسم المستخدم قبل البدء لتجنب تعليق الحساب في Auth
            const exists = await api.checkUsernameExists(adminUsername);
            if (exists) {
                toast.error('اسم المستخدم هذا محجوز مسبقاً، يرجى اختيار اسم آخر.');
                setIsAdding(false);
                return;
            }

            const hasEmail = !!newAdmin.email.trim();
            // نستخدم رقم الهاتف الخام كجزء من الهوية التقنية لضمان المطابقة مع كود تسجيل الدخول
            const adminEmail = hasEmail 
                ? newAdmin.email.trim() 
                : `${newAdmin.phone.trim()}@sasgo.com`;

            const mappedRole = mapRoleForDB(newAdmin.role);
            setDbRole(mappedRole);
            setSavedEmail(adminEmail);

            const { user } = await api.registerUser(adminEmail, newAdmin.password, {
                full_name: newAdmin.full_name,
                phone: newAdmin.phone,
                username: adminUsername,
                email: hasEmail ? newAdmin.email.trim() : 'NA', // سيتم تخزينها كـ NA كما طلبت
                role: mappedRole as any
            });

            toast.success('تم إنشاء حساب المسؤول بنجاح');
            setShowAddAdmin(false);
            setNewAdmin({ full_name: '', phone: '', username: '', email: '', password: '', role: 'العمليات' });
            fetchAdmins();
        } catch (e: any) {
            // تجاهل خطأ استبدال الجلسة إذا حدث بسبب قيود Supabase للمتصفح (بدون سيرفر)
            if (e.message?.includes('already registered')) {
                toast.error('رقم الجوال أو الحساب مسجل مسبقاً');
            } else {
                toast.error(e.message || 'فشل إضافة المسؤول يرجى التحقق من المدخلات');
            }
        } finally {
            setIsAdding(false);
        }
    };

    const handleVerifyOtp = async () => {
        if (!otpCode) {
            toast.error('يرجى إدخال رمز التحقق');
            return;
        }

        setIsVerifying(true);
        try {
            // 1. تفعيل الحساب بالرمز
            const { user } = await api.verifyEmailOtp(savedEmail, otpCode);

            // 2. مباااااارك! 
            // مش هنعمل أي Upsert هنا لا لـ profiles ولا لـ user_roles
            // لأن الـ SQL Trigger اللي عملناه هيشتغل "لحظياً" أول ما الحساب يتفعل

            toast.success('تم إنشاء حساب المسؤول بنجاح وتفعيله');

            // 3. تنظيف الواجهة
            setShowAddAdmin(false);
            setOtpStep(false);
            setOtpCode('');
            setNewAdmin({ full_name: '', phone: '', email: '', password: '', role: 'العمليات' });

            // 4. تحديث القائمة
            fetchAdmins();

        } catch (e: any) {
            toast.error(e.message || 'رمز التحقق غير صحيح أو منتهي الصلاحية');
        } finally {
            setIsVerifying(false);
        }
    };

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

                <div className="flex justify-end">
                    <Dialog open={showAddAdmin} onOpenChange={(open) => {
                        setShowAddAdmin(open);
                        if (!open) setOtpStep(false);
                    }}>
                        <DialogTrigger asChild>
                            <Button className="h-12 px-6 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black shadow-xl shadow-blue-500/20 gap-2">
                                <Plus size={20} /> إضافة مسؤول جديد
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-sm rounded-[2rem] p-5" dir="rtl">
                            <DialogHeader>
                                <DialogTitle className="text-xl font-black text-slate-900 border-b pb-2 mb-2">
                                    {otpStep ? 'تأكيد الحساب' : 'مسؤول جديد'}
                                </DialogTitle>
                            </DialogHeader>

                            <div className={otpStep ? "hidden" : "block"}>
                                <div className="space-y-2">
                                    <div className="space-y-1">
                                        <Label className="font-bold text-slate-700 text-xs">الاسم الكامل</Label>
                                        <Input value={newAdmin.full_name} onChange={e => setNewAdmin({ ...newAdmin, full_name: e.target.value })} className="h-9 rounded-xl bg-slate-50 font-bold text-sm" placeholder="الاسم الكامل" />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="font-bold text-slate-700 text-xs">رقم الجوال</Label>
                                        <Input value={newAdmin.phone} onChange={e => setNewAdmin({ ...newAdmin, phone: e.target.value })} className="h-9 rounded-xl bg-slate-50 font-bold text-left text-sm" dir="ltr" placeholder="+966" />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="font-bold text-slate-700 text-xs">البريد الإلكتروني (اختياري)</Label>
                                        <Input value={newAdmin.email} onChange={e => setNewAdmin({ ...newAdmin, email: e.target.value })} className="h-9 rounded-xl bg-slate-50 font-bold text-left text-sm" dir="ltr" placeholder="admin@sasgo.com" />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="font-bold text-slate-700 text-xs">اسم المستخدم</Label>
                                        <Input value={newAdmin.username} onChange={e => setNewAdmin({ ...newAdmin, username: e.target.value })} className="h-9 rounded-xl bg-slate-50 font-bold text-left text-sm" dir="ltr" placeholder="username" />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="font-bold text-slate-700 text-xs">كلمة المرور المؤقتة</Label>
                                        <Input type="password" value={newAdmin.password} onChange={e => setNewAdmin({ ...newAdmin, password: e.target.value })} className="h-9 rounded-xl bg-slate-50 font-bold text-sm" placeholder="••••••••" />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="font-bold text-slate-700 text-xs">قطاع الصلاحية</Label>
                                        <Select value={newAdmin.role} onValueChange={val => setNewAdmin({ ...newAdmin, role: val })}>
                                            <SelectTrigger className="h-9 rounded-xl bg-slate-50 font-bold border-slate-200 text-sm">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="font-bold text-sm">
                                                <SelectItem value="مدير عام">مدير عام للنظام</SelectItem>
                                                <SelectItem value="العمليات">أخصائي عمليات</SelectItem>
                                                <SelectItem value="إدارة الناقلين">إدارة الناقلين</SelectItem>
                                                <SelectItem value="إدارة التجار">إدارة البائعين والتجار</SelectItem>
                                                <SelectItem value="دعم العملاء">دعم المشترين</SelectItem>
                                                <SelectItem value="المالية">المالية والحسابات</SelectItem>
                                                <SelectItem value="التحليلات">البيانات والتحليلات</SelectItem>
                                                <SelectItem value="التاجر">التاجر / صاحب الشحنات</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <DialogFooter className="mt-4 border-t pt-3 gap-2 flex-row flex">
                                    <Button onClick={handleAddAdmin} disabled={isAdding} className="h-10 flex-1 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-md">
                                        {isAdding ? <Loader2 className="animate-spin" /> : 'المتابعة للتحقق'}
                                    </Button>
                                </DialogFooter>
                            </div>

                            <div className={!otpStep ? "hidden" : "block"}>
                                <div className="space-y-4 py-4 text-center">
                                    <p className="text-sm font-bold text-slate-500">تم إرسال رمز التحقق (OTP) المكون من 6 أرقام إلى البريد الإلكتروني القادم للتوثيق.</p>
                                    <div className="space-y-2">
                                        <Input
                                            value={otpCode}
                                            onChange={e => setOtpCode(e.target.value)}
                                            className="h-14 text-center text-2xl tracking-[0.5em] font-black rounded-xl bg-slate-50 border-2 focus:border-blue-500"
                                            placeholder="------"
                                            maxLength={6}
                                            dir="ltr"
                                        />
                                    </div>
                                </div>
                                <DialogFooter className="mt-4 border-t pt-4 gap-3 flex-row flex">
                                    <Button onClick={handleVerifyOtp} disabled={isVerifying} className="h-12 flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm shadow-md">
                                        {isVerifying ? <Loader2 className="animate-spin" /> : 'تأكيد التسجيل'}
                                    </Button>
                                    <Button onClick={() => setOtpStep(false)} variant="outline" className="h-12 w-1/3 rounded-xl font-bold text-sm">رجوع</Button>
                                </DialogFooter>
                            </div>
                        </DialogContent>
                    </Dialog>

                    {/* Edit Admin Modal */}
                    <Dialog open={showEditAdmin} onOpenChange={setShowEditAdmin}>
                        <DialogContent className="max-w-sm rounded-3xl p-6" dir="rtl">
                            <DialogHeader>
                                <DialogTitle className="text-2xl font-black text-slate-900 border-b pb-3 mb-3">تعديل الصلاحيات</DialogTitle>
                            </DialogHeader>
                            {editingAdmin && (
                                <div className="space-y-3">
                                    <div className="space-y-1.5">
                                        <Label className="font-bold text-slate-700 text-sm">قطاع الصلاحية الجديد</Label>
                                        <Select value={editingAdmin.newRole} onValueChange={val => setEditingAdmin({ ...editingAdmin, newRole: val })}>
                                            <SelectTrigger className="h-10 rounded-xl bg-slate-50 font-bold border-slate-200">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="font-bold">
                                                <SelectItem value="مدير عام">مدير عام للنظام</SelectItem>
                                                <SelectItem value="العمليات">أخصائي عمليات</SelectItem>
                                                <SelectItem value="إدارة الناقلين">إدارة الناقلين</SelectItem>
                                                <SelectItem value="إدارة التجار">إدارة البائعين والتجار</SelectItem>
                                                <SelectItem value="دعم العملاء">دعم المشترين</SelectItem>
                                                <SelectItem value="المالية">المالية والحسابات</SelectItem>
                                                <SelectItem value="التحليلات">البيانات والتحليلات</SelectItem>
                                                <SelectItem value="التاجر">التاجر / صاحب الشحنات</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            )}
                            <DialogFooter className="mt-6 border-t pt-4 gap-3 flex-row flex">
                                <Button onClick={handleUpdateRole} disabled={isUpdating} className="h-12 flex-1 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-sm shadow-md">
                                    {isUpdating ? <Loader2 className="animate-spin" /> : 'حفظ التعديلات'}
                                </Button>
                                <Button onClick={() => setShowEditAdmin(false)} variant="outline" className="h-12 flex-1 rounded-xl font-bold text-sm">إلغاء</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
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
                                            onClick={() => {
                                                setEditingAdmin({ ...admin, newRole: admin.role });
                                                setShowEditAdmin(true);
                                            }}
                                            className="flex-1 h-12 rounded-xl font-bold border-blue-100 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                                        >
                                            تعديل الصلاحيات
                                        </Button>
                                        <Button
                                            variant="outline"
                                            onClick={() => handleRevokePermission(admin)}
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
