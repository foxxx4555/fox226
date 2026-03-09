import { useEffect, useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Search, UserCheck, UserX, UserSearch, Shield, MapPin, Phone, Trash2, Key, Eye, EyeOff, Calendar, Mail, FileText, CheckCircle, Wallet } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { api } from '@/services/api';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, MoreVertical, Ban, FileUp, Filter, Users as UsersIcon } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AdminUsers() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdatingPass, setIsUpdatingPass] = useState(false);

  const [showUserDetails, setShowUserDetails] = useState(false);
  const [userDetails, setUserDetails] = useState<any>(null);

  const fetchUsers = async () => {
    try {
      // إحضار كافة بيانات المستخدمين وأدوارهم في استعلام واحد (Single Query)
      // تم إزالة التحديد الصريح للأعمدة لتجنب خطأ PGRST204 إذا لم يكن العمود is_verified موجوداً بعد في الكاش الخاص بـ PostgREST
      const { data: profiles, error: profileErr } = await supabase
        .from('profiles')
        .select('*, user_roles(role)')
        .order('created_at', { ascending: false });

      if (profileErr) throw profileErr;

      // دمج بيانات المستخدمين مع أدوارهم الإدارية إن وجدت للحفاظ على الدور الأساسي (role)
      const adminRolesList = ['super_admin', 'operations', 'carrier_manager', 'vendor_manager', 'support', 'finance', 'analytics', 'admin'];

      // جلب بيانات المستلمين (جهات الاتصال التي أضافها التجار)
      const { data: receiversData, error: receiversErr } = await supabase.from('receivers').select('*');
      if (receiversErr) throw receiversErr;

      const formattedUsers = profiles?.map(p => {
        const rawRoles = (p as any).user_roles;
        const rolesArray = Array.isArray(rawRoles) ? rawRoles : (rawRoles ? [rawRoles] : []);
        const adminRoleEntry = rolesArray.find((r: any) => adminRolesList.includes(r.role));
        const roleStr = rolesArray[0]?.role;
        const isAdmin = !!adminRoleEntry;

        return {
          ...p,
          role: roleStr && !isAdmin ? roleStr : (p as any).role, // تحديث الدور الأساسي إذا لم يكن إدارياً
          adminRole: isAdmin ? adminRoleEntry.role : null
        };
      }) || [];

      // تنسيق المستلمين ليظهروا كأنهم مستخدمين في القائمة 
      const formattedReceivers = receiversData?.map(r => ({
        id: r.id,
        full_name: r.name,
        phone: r.phone,
        role: 'receiver',
        is_contact_only: true, // علامة تدل على أنه ليس حساب تسجيل دخول حقيقي
        created_at: r.created_at,
        status: 'active'
      })) || [];

      setUsers([...formattedUsers, ...formattedReceivers]);
    } catch (e) {
      console.error(e);
      toast.error('حدث خطأ أثناء جلب المستخدمين');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const logAdminAction = async (action: string, targetUserId: string, details?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await (supabase as any).from('admin_logs').insert([{
        admin_id: user.id,
        target_user_id: targetUserId,
        action,
        details
      }]);
    } catch (e) {
      // نتجاهل الخطأ إذا لم يكن الجدول موجوداً بعد
    }
  };

  const handleDeleteUser = async (userId: string) => {
    // التحقق من صلاحية السوبر أدمن للحذف الشامل
    const { data: authUser } = await supabase.auth.getUser();
    const currentUserId = authUser.user?.id;

    if (!currentUserId) {
      toast.error('لم يتم العثور على المستخدم الحالي.');
      return;
    }

    const { data: rolesData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', currentUserId);

    const rolesArray = rolesData || [];
    const isSuperAdmin = rolesArray.some((r: { role: string }) => r.role === 'super_admin');

    const warningMsg = isSuperAdmin
      ? '🚨 تحذير نهائي: أنت على وشك مسح هذا المستخدم وكل ما يتعلق به من "شحنات، محافظ مالية، عروض، وسجلات" نهائياً من النظام. هذه العملية لا يمكن التراجع عنها. هل أنت متأكد تماماً؟'
      : 'هل أنت متأكد من حذف هذا الحساب؟';

    if (!confirm(warningMsg)) return;

    setIsDeleting(true);
    try {
      if (isSuperAdmin) {
        // استدعاء الحذف الشامل الذي يعتمد على CASCADE في قاعدة البيانات
        await api.deleteUserEntirely(userId);
      } else {
        // الحذف العادي للمسؤولين الآخرين
        await api.deleteUser(userId);
      }

      await logAdminAction('DELETE_USER', userId, isSuperAdmin ? 'حذف شامل (مدير عام)' : 'حذف مستخدم');
      toast.success('تم مسح كافة بيانات المستخدم بنجاح');
      fetchUsers();
    } catch (e: any) {
      toast.error(e.message || 'فشل حذف المستخدم');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast.error('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }
    setIsUpdatingPass(true);
    try {
      await api.adminResetPassword(selectedUser.id, newPassword);
      await logAdminAction('CHANGE_PASSWORD', selectedUser.id, 'تغيير كلمة المرور');
      toast.success('تم تغيير كلمة المرور بنجاح');
      setSelectedUser(null);
      setNewPassword('');
    } catch (e: any) {
      toast.error(e.message || 'فشل تغيير كلمة المرور');
    } finally {
      setIsUpdatingPass(false);
    }
  };

  const handleUpdateStatus = async (userId: string, status: 'active' | 'suspended') => {
    try {
      await api.updateUserStatus(userId, status);
      await logAdminAction('UPDATE_STATUS', userId, `تغيير الحالة إلى ${status === 'active' ? 'نشط' : 'موقف'}`);
      toast.success(status === 'active' ? 'تم تفعيل الحساب بنجاح' : 'تم إيقاف الحساب مؤقتاً');
      // تحديث الحالة فوراً في الـ UI دون انتظار Reload
      setUsers(users.map(u => u.id === userId ? { ...u, status } : u));
    } catch (e) {
      toast.error('فشل تحديث الحالة');
    }
  };

  const handleVerifyDriver = async (userId: string) => {
    try {
      const { error } = await supabase.rpc('admin_update_user_status', {
        target_user_id: userId,
        new_status: 'active',
        is_verified_status: true
      });

      if (error) {
        // Fallback
        await api.updateProfile(userId, { is_verified: true, status: 'active' } as any);
      }

      await logAdminAction('VERIFY_DRIVER', userId, 'توثيق حساب السائق المباشر');
      toast.success('تم توثيق السائق بنجاح');
      setUsers(users.map(u => u.id === userId ? { ...u, is_verified: true, status: 'active' } : u));
    } catch (e) {
      toast.error('فشل توثيق السائق');
    }
  };

  const handleRequestDocs = async (userId: string) => {
    try {
      await api.requestDocumentUpdate(userId, 'الهوية ورخصة القيادة');
      toast.success('تم إرسال طلب تحديث المستندات');
    } catch (e) {
      toast.error('فشل إرسال الطلب');
    }
  };

  const openUserDetails = (user: any) => {
    setUserDetails(user);
    setShowUserDetails(true);
  };


  const filteredUsers = users.filter((user: any) =>
    user?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user?.phone?.includes(searchQuery)
  );

  const shippers = filteredUsers.filter(u => u.role === 'shipper' && !u.adminRole);
  const drivers = filteredUsers.filter(u => u.role === 'driver' && !u.adminRole);
  const receivers = filteredUsers.filter(u => u.role === 'receiver' && !u.adminRole);
  const admins = filteredUsers.filter(u => !!u.adminRole);
  const pendingDrivers = drivers.filter(u => !u.is_verified);

  const getAdminRoleLabel = (role: string) => {
    const roles: Record<string, string> = {
      'super_admin': 'مدير عام للنظام',
      'operations': 'أخصائي عمليات',
      'carrier_manager': 'إدارة الناقلين',
      'vendor_manager': 'إدارة البائعين',
      'support': 'دعم المشترين',
      'finance': 'المالية والحسابات',
      'analytics': 'البيانات والتحليلات',
      'admin': 'مسؤول'
    };
    return roles[role] || 'مسؤول';
  };

  // تم تحويلها من Component إلى Render Function لمنع إعادة التحميل (Re-render lag)
  const renderUserList = (items: any[]) => (
    <div className="grid gap-6">
      {items.map(user => (
        <Card key={user.id} className="rounded-[2.5rem] border-none shadow-xl hover:shadow-2xl transition-all bg-white relative overflow-hidden group">
          <div className={`absolute top-0 right-0 w-2.5 h-full transition-all duration-500 group-hover:w-4 ${user.status === 'suspended' ? 'bg-rose-500' :
            user.adminRole ? 'bg-purple-500' :
              user.role === 'driver' ? 'bg-emerald-500' : 'bg-blue-600'
            }`}></div>
          <CardContent className="p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 rounded-[2rem] bg-slate-100 flex items-center justify-center text-3xl font-black text-slate-400 border-4 border-white shadow-inner relative">
                {user.full_name ? user.full_name.charAt(0) : '?'}
                {user.status === 'active' && (
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 border-4 border-white rounded-full"></div>
                )}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <h3 className="text-2xl font-black text-slate-800">{user.full_name || 'اسم غير متوفر'}</h3>
                  {user.status === 'suspended' && <Badge className="bg-rose-100 text-rose-600 border-none font-bold">موقوف</Badge>}
                </div>
                <div className="flex flex-wrap items-center gap-4 text-sm font-bold text-slate-400 mt-2">
                  <span className="flex items-center gap-1.5"><Phone size={16} className="text-slate-300" /> <span dir="ltr">{user.phone}</span></span>
                  <span className="flex items-center gap-1.5">
                    <Shield size={16} className={user.adminRole ? "text-purple-400" : "text-slate-300"} />
                    {user.adminRole ? <span className="text-purple-600 bg-purple-50 px-2 py-0.5 rounded-md">{getAdminRoleLabel(user.adminRole)}</span> :
                      user.role === 'driver' ? 'سائق' :
                        user.role === 'shipper' ? 'شاحن (تاجر)' : 'مستلم'}
                  </span>
                  {user.role === 'driver' && !user.adminRole && (
                    <Badge className={user.is_verified ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-amber-50 text-amber-600 border-amber-100 animate-pulse"}>
                      {user.is_verified ? "هوية موثقة" : "بانتظار التوثيق"}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              {!user.is_contact_only && (
                <>
                  <Dialog open={selectedUser?.id === user.id} onOpenChange={(open) => !open && setSelectedUser(null)}>
                    <DialogTrigger asChild>
                      <Button onClick={() => setSelectedUser(user)} variant="outline" className="h-12 rounded-2xl font-bold bg-slate-50 border-slate-100 text-slate-600 hover:bg-white transition-all">
                        كلمة المرور
                      </Button>
                    </DialogTrigger>

                    <DialogContent className="rounded-[2.5rem] p-10 max-w-md" dir="rtl">
                      <DialogHeader>
                        <DialogTitle className="text-3xl font-black text-slate-900 mb-2 text-right">أمان الحساب</DialogTitle>
                        <p className="text-slate-400 font-bold mb-6 text-right">تحديث كلمة المرور لـ {user.full_name}</p>
                      </DialogHeader>
                      <div className="space-y-6 py-4">
                        <div className="space-y-2">
                          <Label className="font-black text-slate-700 mr-2">كلمة المرور الجديدة</Label>
                          <div className="relative">
                            <Input
                              type={showNewPassword ? "text" : "password"}
                              value={newPassword}
                              onChange={e => setNewPassword(e.target.value)}
                              className="h-14 rounded-2xl border-2 bg-slate-50 font-bold px-6"
                              placeholder="8 أحرف كحد أدنى"
                            />
                            <button onClick={() => setShowNewPassword(!showNewPassword)} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                              {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                          </div>
                        </div>
                      </div>
                      <DialogFooter className="mt-8 gap-3">
                        <Button onClick={handleChangePassword} disabled={isUpdatingPass} className="h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-lg flex-1 shadow-lg shadow-blue-500/20">
                          {isUpdatingPass ? <Loader2 className="animate-spin" /> : 'تحديث الآن'}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="icon" className="h-12 w-12 rounded-2xl border-slate-100 bg-slate-50 hover:bg-white">
                        <MoreVertical size={20} className="text-slate-400" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-64 rounded-2xl p-2 font-bold">
                      <DropdownMenuLabel className="px-4 py-2 opacity-50 text-xs">إجراءات إدارية</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => handleRequestDocs(user.id)} className="rounded-xl h-12 gap-3 cursor-pointer">
                        <FileUp size={18} className="text-blue-500" /> طلب تحديث مستندات
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="my-1" />
                      {user.role === 'driver' && !user.is_verified && (
                        <DropdownMenuItem onClick={() => handleVerifyDriver(user.id)} className="rounded-xl h-12 gap-3 cursor-pointer text-emerald-600 bg-emerald-50 mb-1">
                          <CheckCircle size={18} /> توثيق الآن
                        </DropdownMenuItem>
                      )}
                      {user.status === 'suspended' ? (
                        <DropdownMenuItem onClick={() => handleUpdateStatus(user.id, 'active')} className="rounded-xl h-12 gap-3 cursor-pointer text-emerald-600">
                          <CheckCircle size={18} /> تفعيل الحساب
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem onClick={() => handleUpdateStatus(user.id, 'suspended')} className="rounded-xl h-12 gap-3 cursor-pointer text-amber-600">
                          <Ban size={18} /> إيقاف مؤقت
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => handleDeleteUser(user.id)} className="rounded-xl h-12 gap-3 cursor-pointer text-rose-600">
                        <Trash2 size={18} /> حذف نهائي
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              )}

              <Button onClick={() => openUserDetails(user)} className="h-12 px-6 rounded-2xl bg-slate-900 border-none text-white font-black shadow-xl shadow-slate-900/10 hover:shadow-slate-900/20 transition-all flex items-center gap-2">
                <UserSearch size={18} /> عرض التفاصيل
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <AdminLayout>
      <div className="space-y-10 max-w-7xl mx-auto pb-32 px-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 bg-white p-10 rounded-[3rem] shadow-xl border border-slate-50">
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-4">
              <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-500/20 text-white">
                <UsersIcon size={32} />
              </div>
              إدارة المستخدمين
            </h1>
            <p className="text-slate-400 font-bold text-lg mt-2 mr-16">مراقبة وتوثيق حسابات السائقين والشركاء</p>
          </motion.div>

          <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
            <div className="relative w-full md:w-80">
              <Input
                placeholder="ابحث بالاسم، الجوال، أو البريد..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-14 pl-12 pr-6 bg-slate-50 border-none rounded-2xl font-bold focus:ring-4 focus:ring-blue-100 transition-all shadow-inner"
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500" size={20} />
            </div>
            <Button
              onClick={() => window.location.href = '/admin/admins'}
              className="h-14 px-6 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black shadow-lg w-full md:w-auto gap-2"
            >
              <Shield size={20} /> إدارة الصلاحيات والمسؤولين
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-4">
            <Loader2 className="animate-spin text-blue-600" size={64} strokeWidth={3} />
            <p className="font-black text-slate-400 text-xl animate-pulse">جاري جلب بيانات المستخدمين...</p>
          </div>
        ) : (
          <Tabs defaultValue="all" className="w-full space-y-8" dir="rtl">
            <div className="flex items-center justify-between bg-white p-3 rounded-3xl shadow-lg border border-slate-50">
              <TabsList className="bg-transparent border-none gap-2">
                <TabsTrigger value="all" className="rounded-2xl px-6 h-12 font-black data-[state=active]:bg-blue-600 data-[state=active]:text-white transition-all">الكل ({filteredUsers.length})</TabsTrigger>
                <TabsTrigger value="shippers" className="rounded-2xl px-6 h-12 font-black data-[state=active]:bg-blue-600 data-[state=active]:text-white transition-all">شاحنون ({shippers.length})</TabsTrigger>
                <TabsTrigger value="drivers" className="rounded-2xl px-6 h-12 font-black data-[state=active]:bg-blue-600 data-[state=active]:text-white transition-all">ناقلون وسائقون ({drivers.length})</TabsTrigger>
                {pendingDrivers.length > 0 && (
                  <TabsTrigger value="pending" className="rounded-2xl px-6 h-12 font-black data-[state=active]:bg-amber-500 data-[state=active]:text-white text-amber-600 transition-all border border-amber-100 bg-amber-50">
                    بانتظار التوثيق ({pendingDrivers.length})
                  </TabsTrigger>
                )}
                <TabsTrigger value="receivers" className="rounded-2xl px-6 h-12 font-black data-[state=active]:bg-blue-600 data-[state=active]:text-white transition-all">مستلمين ({receivers.length})</TabsTrigger>
                <TabsTrigger value="admins" className="rounded-2xl px-6 h-12 font-black data-[state=active]:bg-blue-600 data-[state=active]:text-white transition-all">الإدارة ({admins.length})</TabsTrigger>
              </TabsList>
              <Button variant="ghost" className="rounded-xl h-12 px-6 gap-2 text-slate-400 font-bold hover:bg-slate-50">
                <Filter size={18} /> تصفية متقدمة
              </Button>
            </div>

            <TabsContent value="all" className="mt-0 outline-none">
              {renderUserList(filteredUsers)}
            </TabsContent>
            <TabsContent value="shippers" className="mt-0 outline-none">
              {renderUserList(shippers)}
            </TabsContent>
            <TabsContent value="drivers" className="mt-0 outline-none">
              {renderUserList(drivers)}
            </TabsContent>
            <TabsContent value="pending" className="mt-0 outline-none">
              {renderUserList(pendingDrivers)}
            </TabsContent>
            <TabsContent value="receivers" className="mt-0 outline-none">
              {renderUserList(receivers)}
            </TabsContent>
            <TabsContent value="admins" className="mt-0 outline-none">
              {renderUserList(admins)}
            </TabsContent>
          </Tabs>
        )}

        <Dialog open={showUserDetails} onOpenChange={setShowUserDetails}>
          <DialogContent className="max-w-md md:max-w-lg rounded-3xl p-6" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black text-slate-900 border-b pb-3 mb-3">تفاصيل المستخدم</DialogTitle>
            </DialogHeader>
            {userDetails && (
              <div className="space-y-6 max-h-[70vh] overflow-y-auto px-2 pb-4">
                <div className="flex flex-col items-center text-center gap-4">
                  <div className="w-24 h-24 rounded-3xl bg-blue-50 text-blue-600 flex items-center justify-center text-4xl font-black border-4 border-white shadow-xl relative overflow-hidden">
                    {userDetails.avatar_url ? (
                      <img src={userDetails.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      userDetails.full_name?.charAt(0) || '?'
                    )}
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-slate-800">{userDetails.full_name}</h2>
                    <Badge variant="outline" className={`mt-2 font-bold px-3 py-1 text-sm ${userDetails.adminRole ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-slate-50'}`}>
                      {userDetails.adminRole ? getAdminRoleLabel(userDetails.adminRole) :
                        userDetails.role === 'driver' ? 'سائق/ناقل' :
                          userDetails.role === 'shipper' ? 'شاحن (تاجر)' : 'مستلم'}
                    </Badge>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-[2rem] p-6 border border-slate-100 space-y-4">
                  <h3 className="font-black text-slate-800 border-b border-slate-200 pb-2 mb-4 flex items-center gap-2"><UserSearch size={18} className="text-blue-500" /> بيانات التواصل والهوية</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="space-y-1">
                      <span className="text-xs font-bold text-slate-400">رقم الجوال</span>
                      <p className="font-black text-slate-700 flex items-center gap-2" dir="ltr"><Phone size={14} /> {userDetails.phone}</p>
                    </div>
                    {userDetails.email && (
                      <div className="space-y-1">
                        <span className="text-xs font-bold text-slate-400">البريد الإلكتروني</span>
                        <p className="font-black text-slate-700 flex items-center gap-2 overflow-hidden text-ellipsis" dir="ltr"><Mail size={14} className="shrink-0" /> {userDetails.email}</p>
                      </div>
                    )}
                    {(userDetails.id_number || userDetails.plate_number) && (
                      <>
                        <div className="space-y-1">
                          <span className="text-xs font-bold text-slate-400">رقم الهوية/الإقامة</span>
                          <p className="font-black text-slate-700">{userDetails.id_number || 'غير متوفر'}</p>
                        </div>
                        <div className="space-y-1">
                          <span className="text-xs font-bold text-slate-400">رقم اللوحة</span>
                          <p className="font-black text-slate-700" dir="ltr">{userDetails.plate_number || 'غير متوفر'}</p>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {userDetails.role === 'driver' && (
                  <div className="bg-emerald-50/50 rounded-[2rem] p-6 border border-emerald-100 space-y-4">
                    <h3 className="font-black text-emerald-800 border-b border-emerald-200 pb-2 mb-4 flex items-center gap-2"><Shield size={18} /> حالة التوثيق الأمني</h3>
                    <div className="grid grid-cols-3 gap-2 text-center text-xs font-bold">
                      <div className={`p-3 rounded-xl border ${userDetails.id_document_url ? 'bg-emerald-100 border-emerald-200 text-emerald-700' : 'bg-white border-slate-200 text-slate-400'}`}>
                        {userDetails.id_document_url ? <a href={userDetails.id_document_url} target="_blank" rel="noreferrer" className="flex flex-col items-center gap-1 hover:underline"><CheckCircle size={16} /> الهوية</a> : <span className="flex flex-col items-center gap-1"><UserX size={16} /> لا يوجد</span>}
                      </div>
                      <div className={`p-3 rounded-xl border ${userDetails.driving_license_url ? 'bg-emerald-100 border-emerald-200 text-emerald-700' : 'bg-white border-slate-200 text-slate-400'}`}>
                        {userDetails.driving_license_url ? <a href={userDetails.driving_license_url} target="_blank" rel="noreferrer" className="flex flex-col items-center gap-1 hover:underline"><CheckCircle size={16} /> الرخصة</a> : <span className="flex flex-col items-center gap-1"><FileText size={16} /> لا يوجد</span>}
                      </div>
                      <div className={`p-3 rounded-xl border ${userDetails.vehicle_insurance_url ? 'bg-emerald-100 border-emerald-200 text-emerald-700' : 'bg-white border-slate-200 text-slate-400'}`}>
                        {userDetails.vehicle_insurance_url ? <a href={userDetails.vehicle_insurance_url} target="_blank" rel="noreferrer" className="flex flex-col items-center gap-1 hover:underline"><CheckCircle size={16} /> التأمين</a> : <span className="flex flex-col items-center gap-1"><Shield size={16} /> لا يوجد</span>}
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 mt-6">
                  <div className="bg-slate-50 p-4 rounded-[1.5rem] border border-slate-100 flex flex-col items-center text-center">
                    <div className="flex items-center gap-1.5 text-slate-500 mb-1 font-bold text-xs"><Calendar size={14} /> تاريخ التسجيل</div>
                    <div className="text-sm font-black text-slate-800">{new Date(userDetails.created_at).toLocaleDateString('ar-SA')}</div>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-[1.5rem] border border-slate-100 flex flex-col items-center text-center">
                    <div className="flex items-center gap-1.5 text-slate-500 mb-1 font-bold text-xs"><Shield size={14} /> حالة الحساب</div>
                    <div className={`text-sm font-black ${userDetails.status === 'suspended' ? 'text-rose-600' : 'text-emerald-600'}`}>{userDetails.status === 'suspended' ? 'موقوف' : 'نشط'}</div>
                  </div>
                </div>

                <div className="mt-6">
                  <h3 className="text-sm font-black text-slate-800 mb-3 flex items-center gap-2"><FileText size={16} className="text-blue-500" /> سجل النشاط الحقيقي</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center p-4 bg-white border border-slate-100 rounded-[1.5rem] shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center">
                          <CheckCircle size={16} />
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 text-sm">آخر دخول / تحديث للبيانات</p>
                          <p className="text-[11px] text-slate-400 font-medium mt-0.5">سجل النظام لحظياً</p>
                        </div>
                      </div>
                      <span className="text-xs font-black text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg" dir="ltr">
                        {new Date(userDetails.updated_at || userDetails.created_at).toLocaleString('ar-SA', {
                          year: 'numeric', month: 'short', day: 'numeric',
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter className="mt-6 border-t pt-4">
              <Button onClick={() => setShowUserDetails(false)} variant="outline" className="h-10 w-full rounded-xl font-bold text-sm">إغلاق</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </AdminLayout>
  );
}
