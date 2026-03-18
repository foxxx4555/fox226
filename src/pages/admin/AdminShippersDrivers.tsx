import { useEffect, useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Search, UserCheck, UserX, UserSearch, Shield, MapPin, Phone, Trash2, Key, Eye, EyeOff, Calendar, Mail, FileText, CheckCircle, Wallet, Truck, Download, Star, Clock, Activity, Edit, Package } from 'lucide-react';
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
import { ChevronDown, MoreVertical, Ban, FileUp, Filter, Users as UsersIcon, FileSpreadsheet } from 'lucide-react';
import { motion } from 'framer-motion';
import { exportToExcel } from '@/lib/exportUtils';

export default function AdminShippersDrivers() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdatingPass, setIsUpdatingPass] = useState(false);

  // حالات إدارة المحفظة
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [selectedUserWallet, setSelectedUserWallet] = useState<any>(null);
  const [adjustmentAmount, setAdjustmentAmount] = useState('');
  const [adjustmentType, setAdjustmentType] = useState<'deposit' | 'deduction'>('deposit');
  const [adjustmentNotes, setAdjustmentNotes] = useState('');
  const [isProcessingWallet, setIsProcessingWallet] = useState(false);
  const [showUserDetails, setShowUserDetails] = useState(false);
  const [userDetails, setUserDetails] = useState<any>(null);
  const [userStats, setUserStats] = useState({
    walletBalance: 0,
    completedLoads: 0,
    activeLoads: 0,
    rating: 4.9,
    ratingCount: 120
  });

  const [isEditingUser, setIsEditingUser] = useState(false);
  const [editFormData, setEditFormData] = useState({
    full_name: '',
    phone: '',
    id_number: '',
    plate_number: ''
  });

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
    if (!confirm('هل أنت متأكد من حذف هذا الحساب نهائياً؟')) return;
    setIsDeleting(true);
    try {
      await api.deleteUser(userId);
      await logAdminAction('DELETE_USER', userId, 'حذف المستخدم نهائياً');
      toast.success('تم حذف المستخدم بنجاح');
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
      await logAdminAction('UPDATE_STATUS', userId, `تغيير الحالة إلى ${status}`);
      toast.success(status === 'active' ? 'تم تفعيل الحساب بنجاح' : 'تم إيقاف الحساب مؤقتاً');

      // تحديث الحالة فوراً في الـ UI للجداول
      setUsers(users.map(u => u.id === userId ? { ...u, status } : u));

      // تحديث الحالة في نافذة التفاصيل المفتوحة حالياً
      if (userDetails && userDetails.id === userId) {
        setUserDetails({ ...userDetails, status });
      }
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

  const openUserDetails = async (user: any) => {
    setUserDetails(user);
    setShowUserDetails(true);
    setUserStats({ walletBalance: 0, completedLoads: 0, activeLoads: 0, rating: 4.9, ratingCount: 120 }); // reset

    try {
      const [walletRes, completedRes, activeRes] = await Promise.all([
        (supabase as any).from('wallets').select('balance').eq('user_id', user.id).maybeSingle(),
        (supabase as any).from('loads')
          .select('*', { count: 'exact', head: true })
          .eq(user.role === 'shipper' ? 'owner_id' : 'driver_id', user.id)
          .eq('status', 'completed'),
        (supabase as any).from('loads')
          .select('*', { count: 'exact', head: true })
          .eq(user.role === 'shipper' ? 'owner_id' : 'driver_id', user.id)
          .in('status', ['available', 'pending', 'in_progress', 'picked_up', 'out_for_delivery'])
      ]);

      setUserStats({
        walletBalance: walletRes.data?.balance || 0,
        completedLoads: completedRes.count || 0,
        activeLoads: activeRes.count || 0,
        rating: 4.9, // Static for now unless rating table is present
        ratingCount: 120
      });
    } catch (e) {
      console.error('Failed to fetch user stats', e);
    }
  };

  const handleEditUser = (user: any) => {
    setEditFormData({
      full_name: user.full_name || '',
      phone: user.phone || '',
      id_number: user.id_number || '',
      plate_number: user.plate_number || ''
    });
    setIsEditingUser(true);
  };

  const saveEditedUser = async () => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: editFormData.full_name,
          phone: editFormData.phone,
          id_number: editFormData.id_number,
          plate_number: editFormData.plate_number
        })
        .eq('id', userDetails.id);

      if (error) throw error;

      toast.success('تم تحديث البيانات بنجاح');
      setIsEditingUser(false);

      // Update local state
      const updatedUser = { ...userDetails, ...editFormData };
      setUserDetails(updatedUser);
      setUsers(users.map(u => u.id === updatedUser.id ? { ...u, ...editFormData } : u));
    } catch (e: any) {
      toast.error('فشل تحديث البيانات: ' + e.message);
    }
  };

  const openWalletManager = async (user: any) => {
    setSelectedUser(user);
    setIsWalletModalOpen(true);
    try {
      const { data, error } = await (supabase as any)
        .from('wallets')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      setSelectedUserWallet(data);
    } catch (e) {
      toast.error('فشل في جلب بيانات المحفظة');
    }
  };

  const handleBalanceAdjustment = async () => {
    if (!adjustmentAmount || Number(adjustmentAmount) <= 0) {
      toast.error('يرجى إدخال مبلغ صحيح');
      return;
    }

    setIsProcessingWallet(true);
    const amount = Number(adjustmentAmount);

    try {
      if (!selectedUserWallet) {
        toast.error('لا توجد محفظة لهذا المستخدم');
        return;
      }

      // تسجيل العملية في جدول المعاملات المالية (التريجر سيتكفل بتحديث الرصيد اللحظي)
      const { error: transErr } = await (supabase as any).from('financial_transactions').insert([{
        wallet_id: selectedUserWallet.wallet_id,
        amount: amount,
        type: adjustmentType === 'deposit' ? 'credit' : 'debit',
        transaction_type: adjustmentType === 'deposit' ? 'deposit' : 'manual_adjustment',
        description: adjustmentNotes || `تعديل يدوي من الإدارة: ${adjustmentType === 'deposit' ? 'إيداع' : 'خصم'}`,
      }]);

      if (transErr) throw transErr;

      await logAdminAction('WALLET_ADJUSTMENT', selectedUser.id, `تعديل رصيد: ${adjustmentType === 'deposit' ? '+' : '-'}${amount} ر.س`);

      toast.success('تم تحديث الرصيد بنجاح');
      setIsWalletModalOpen(false);
      setAdjustmentAmount('');
      setAdjustmentNotes('');
    } catch (e: any) {
      console.error(e);
      toast.error('حدث خطأ أثناء تحديث الرصيد: ' + (e.message || ''));
    } finally {
      setIsProcessingWallet(false);
    }
  };

  const handleExportUsers = () => {
    if (filteredUsers.length === 0) {
      toast.error("لا توجد بيانات لتصديرها");
      return;
    }

    const exportData = filteredUsers.map(u => ({
      'الاسم': u.full_name || 'غير متوفر',
      'رقم الهاتف': u.phone || 'غير متوفر',
      'الدور': u.adminRole ? getAdminRoleLabel(u.adminRole) : (u.role === 'shipper' ? 'شاحن' : u.role === 'driver' ? 'سائق' : 'مستلم'),
      'رقم الهوية': u.id_number || '-',
      'رقم اللوحة': u.plate_number || '-',
      'الحالة': u.status === 'suspended' ? 'محظور' : 'نشط',
      'موثق': u.is_verified ? 'نعم' : 'لا',
      'تاريخ التسجيل': u.created_at ? new Date(u.created_at).toLocaleDateString('ar-SA') : 'غير متوفر'
    }));

    // Set column widths
    const colWidths = [
      { wch: 25 }, // الاسم
      { wch: 15 }, // رقم الهاتف
      { wch: 15 }, // الدور
      { wch: 15 }, // رقم الهوية
      { wch: 15 }, // رقم اللوحة
      { wch: 10 }, // الحالة
      { wch: 10 }, // موثق
      { wch: 15 }  // تاريخ التسجيل
    ];

    exportToExcel(exportData, `قائمة_المستخدمين_${new Date().toISOString().split('T')[0]}`, 'المستخدمين', colWidths);
    toast.success("تم تصدير قائمة المستخدمين بنجاح");
  };

  const filteredUsers = users.filter((user: any) => {
    const searchLower = searchQuery.toLowerCase();
    const phoneStr = user?.phone || '';
    const fullNameStr = user?.full_name?.toLowerCase() || '';
    const serialStr = user?.serial_number ? String(user.serial_number) : '';

    return fullNameStr.includes(searchLower) || phoneStr.includes(searchLower) || serialStr.includes(searchLower);
  });

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

  const UserList = ({ items, type }: { items: any[], type: 'shipper' | 'driver' }) => (
    <div className="bg-white rounded-[2.5rem] p-6 shadow-xl border border-slate-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-right" dir="rtl">
          <thead>
            <tr className="border-b-2 border-slate-100">
              <th className="pb-4 px-4 font-black text-slate-400 text-sm whitespace-nowrap">الاسم</th>
              <th className="pb-4 px-4 font-black text-slate-400 text-sm whitespace-nowrap">رقم العميل/الناقل</th>
              <th className="pb-4 px-4 font-black text-slate-400 text-sm whitespace-nowrap">رقم الجوال</th>
              <th className="pb-4 px-4 font-black text-slate-400 text-sm whitespace-nowrap">تاريخ التسجيل</th>
              <th className="pb-4 px-4 font-black text-slate-400 text-sm whitespace-nowrap">حالة الحساب</th>
              <th className="pb-4 px-4 font-black text-slate-400 text-sm whitespace-nowrap text-center">الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-500 font-bold">لا يوجد بيانات لعرضها</td>
              </tr>
            ) : items.map((user, index) => {
              const prefix = type === 'shipper' ? 'SH' : 'CA';
              const customerId = user.serial_number ? `${prefix}-${user.serial_number}` : `${prefix}-${user.id?.substring(0, 4).toUpperCase()}`;
              const createdDate = user.created_at ? new Date(user.created_at).toLocaleDateString('en-GB') : 'غير متوفر';

              const isPending = user.role === 'driver' && !user.is_verified;

              let statusLabel = 'نشط';
              let statusClasses = 'bg-emerald-50 text-emerald-600 border-emerald-100';

              if (user.status === 'suspended') {
                statusLabel = 'محظور';
                statusClasses = 'bg-rose-50 text-rose-600 border-rose-100';
              } else if (isPending) {
                statusLabel = 'قيد المراجعة';
                statusClasses = 'bg-amber-50 text-amber-600 border-amber-100';
              }

              return (
                <tr key={user.id || index} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                  <td className="py-5 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-black text-slate-500 text-sm">
                        {user.full_name ? user.full_name.charAt(0) : '?'}
                      </div>
                      <span className="font-black text-slate-800">{user.full_name || 'اسم غير متوفر'}</span>
                    </div>
                  </td>
                  <td className="py-5 px-4 font-bold text-slate-600 whitespace-nowrap" dir="ltr">#{customerId}</td>
                  <td className="py-5 px-4 font-bold text-slate-600 whitespace-nowrap" dir="ltr">{user.phone}</td>
                  <td className="py-5 px-4 font-bold text-slate-500 whitespace-nowrap" dir="ltr">{createdDate}</td>
                  <td className="py-5 px-4 whitespace-nowrap">
                    <Badge variant="outline" className={`font-bold px-3 py-1 ${statusClasses}`}>
                      {statusLabel}
                    </Badge>
                  </td>
                  <td className="py-5 px-4 text-center whitespace-nowrap">
                    <Button onClick={() => openUserDetails(user)} variant="ghost" className="h-10 px-4 rounded-xl text-blue-600 bg-blue-50 hover:bg-blue-100 font-bold">
                      <Eye size={18} className="ml-2" /> (التفاصيل)
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <AdminLayout>
      <div className="max-w-[1400px] mx-auto space-y-8 pb-32">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-6 md:p-8 rounded-[3rem] shadow-sm border border-slate-100">
            <div>
              <h1 className="text-3xl font-black text-slate-800 flex items-center gap-3">
                <Truck className="text-blue-600" size={32} />
                إدارة الشاحنين والناقلين
              </h1>
              <p className="text-slate-500 font-bold mt-2">متابعة حسابات التجار (الشاحنين) والسائقين (الناقلين) وتدقيق بياناتهم</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <Input
                  placeholder="بحث برقم الجوال أو رقم العميل..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-12 h-12 w-full md:w-[350px] rounded-2xl bg-slate-50 border-slate-200 font-bold focus:ring-blue-500"
                />
              </div>
              <Button 
                variant="outline" 
                className="h-12 rounded-2xl font-black text-slate-600 gap-2 border-slate-200 hover:bg-slate-50"
                onClick={handleExportUsers}
              >
                <Download size={18} /> تصدير
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-32 space-y-4">
              <Loader2 className="animate-spin text-blue-600" size={64} strokeWidth={3} />
              <p className="font-black text-slate-400 text-xl animate-pulse">جاري جلب بيانات المستخدمين...</p>
            </div>
          ) : (
            <Tabs defaultValue="shippers" className="w-full space-y-8" dir="rtl">
              <div className="flex items-center justify-start bg-white p-3 rounded-3xl shadow-sm border border-slate-50 w-full overflow-x-auto">
                <TabsList className="bg-transparent border-none gap-2 flex-shrink-0">
                  <TabsTrigger value="shippers" className="rounded-2xl px-6 h-12 font-black data-[state=active]:bg-blue-600 data-[state=active]:text-white transition-all text-slate-500">
                    شاحنون ({shippers.length})
                  </TabsTrigger>
                  <TabsTrigger value="drivers" className="rounded-2xl px-6 h-12 font-black data-[state=active]:bg-blue-600 data-[state=active]:text-white transition-all text-slate-500">
                    ناقلون وسائقون ({drivers.length})
                  </TabsTrigger>
                  {pendingDrivers.length > 0 && (
                    <TabsTrigger value="pending" className="rounded-2xl px-6 h-12 font-black data-[state=active]:bg-amber-500 data-[state=active]:text-white text-amber-600 transition-all border border-amber-100 bg-amber-50">
                      بانتظار التوثيق ({pendingDrivers.length})
                    </TabsTrigger>
                  )}
                </TabsList>
              </div>

              <TabsContent value="shippers" className="mt-0 outline-none">
                <UserList items={shippers} type="shipper" />
              </TabsContent>
              <TabsContent value="drivers" className="mt-0 outline-none">
                <UserList items={drivers} type="driver" />
              </TabsContent>
              <TabsContent value="pending" className="mt-0 outline-none">
                <UserList items={pendingDrivers} type="driver" />
              </TabsContent>
            </Tabs>
          )}

          <Dialog open={showUserDetails} onOpenChange={setShowUserDetails}>
            <DialogContent className="max-w-md md:max-w-3xl rounded-[2.5rem] p-0 overflow-hidden border-none" dir="rtl">
              {userDetails && (
                <div className="flex flex-col h-[85vh] max-h-[800px]">
                  <div className="bg-slate-900 p-8 text-white relative flex-shrink-0">
                    <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                      <Package size={200} className="-ml-10 -mt-10 rotate-12" />
                    </div>
                    <div className="flex items-start justify-between relative z-10">
                      <div className="flex items-center gap-4">
                        <div className="w-20 h-20 rounded-[2rem] bg-blue-600 text-white flex items-center justify-center text-4xl font-black border-4 border-white/20 shadow-xl overflow-hidden">
                          {userDetails.avatar_url ? (
                            <img src={userDetails.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                          ) : (
                            userDetails.full_name?.charAt(0) || '?'
                          )}
                        </div>
                        <div>
                          <h2 className="text-3xl font-black">{userDetails.full_name}</h2>
                          <div className="flex items-center gap-3 mt-2">
                            <Badge className="bg-white/20 text-white border-none font-bold">
                              {userDetails.adminRole ? getAdminRoleLabel(userDetails.adminRole) :
                                userDetails.role === 'driver' ? 'سائق/ناقل' :
                                  userDetails.role === 'shipper' ? 'شاحن (تاجر)' : 'مستلم'}
                            </Badge>
                            <span className="text-sm font-bold text-slate-300 font-mono" dir="ltr">
                              #{userDetails.role === 'shipper' ? 'SH' : 'CA'}-{userDetails.serial_number || userDetails.id?.substring(0, 4).toUpperCase()}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-left bg-white/10 p-3 rounded-2xl backdrop-blur-sm border border-white/10">
                        <p className="text-xs text-slate-400 font-bold mb-1">التقييم العام</p>
                        <div className="flex items-center gap-1.5 text-xl font-black text-amber-400">
                          <Star size={20} fill="currentColor" /> {userStats.rating} <span className="text-sm text-slate-300">({userStats.ratingCount})</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto bg-slate-50 p-6 md:p-8 space-y-8">
                    {/* Header Units - أرقام واحصائيات سريعة */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
                        <div className="flex items-center gap-2 text-slate-500 mb-2 font-bold text-sm">
                          <Wallet size={16} className="text-emerald-500" /> الرصيد المالي
                        </div>
                        <div className="text-2xl font-black text-slate-800" dir="ltr">{Number(userStats.walletBalance).toLocaleString()} <span className="text-sm text-slate-400">SAR</span></div>
                        <div className="text-xs text-slate-400 font-bold mt-1">المستحقات والمدفوعات</div>
                      </div>
                      <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
                        <div className="flex items-center gap-2 text-slate-500 mb-2 font-bold text-sm">
                          <CheckCircle size={16} className="text-blue-500" /> شحنات مكتملة
                        </div>
                        <div className="text-2xl font-black text-slate-800">{userStats.completedLoads}</div>
                        <div className="text-xs font-bold text-emerald-500 mt-1">عملية ناجحة</div>
                      </div>
                      <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
                        <div className="flex items-center gap-2 text-slate-500 mb-2 font-bold text-sm">
                          <Clock size={16} className="text-amber-500" /> شحنات جارية
                        </div>
                        <div className="text-2xl font-black text-slate-800">{userStats.activeLoads}</div>
                        <div className="text-xs text-slate-400 font-bold mt-1">قيد التوصيل الآن</div>
                      </div>
                      <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
                        <div className="flex items-center gap-2 text-slate-500 mb-2 font-bold text-sm">
                          <Activity size={16} className="text-purple-500" /> حالة الحساب
                        </div>
                        <div className={`text-xl font-black ${userDetails.status === 'suspended' ? 'text-rose-500' : 'text-emerald-500'}`}>
                          {userDetails.status === 'suspended' ? 'محظور / موقوف' : 'مفعل ونشط'}
                        </div>
                        <div className="text-xs text-slate-400 font-bold mt-1">التسجيل: {new Date(userDetails.created_at).toLocaleDateString('ar-SA')}</div>
                      </div>
                    </div>

                    {/* Details Body - بيانات الملف الشخصي */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
                        <h3 className="font-black text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
                          <UserSearch size={18} className="text-blue-500" /> بيانات التواصل والهوية الأساسية
                        </h3>
                        <div className="space-y-4">
                          <div className="flex justify-between items-center bg-slate-50 p-3 rounded-2xl">
                            <span className="text-sm font-bold text-slate-500">رقم الجوال</span>
                            <span className="font-black text-slate-800" dir="ltr">{userDetails.phone}</span>
                          </div>
                          {userDetails.email && (
                            <div className="flex justify-between items-center bg-slate-50 p-3 rounded-2xl">
                              <span className="text-sm font-bold text-slate-500">البريد الإلكتروني</span>
                              <span className="font-black text-slate-800" dir="ltr">{userDetails.email}</span>
                            </div>
                          )}
                          {userDetails.id_number && (
                            <div className="flex justify-between items-center bg-slate-50 p-3 rounded-2xl">
                              <span className="text-sm font-bold text-slate-500">رقم الهوية / الإقامة</span>
                              <span className="font-black text-slate-800">{userDetails.id_number}</span>
                            </div>
                          )}
                          {userDetails.plate_number && (
                            <div className="flex justify-between items-center bg-slate-50 p-3 rounded-2xl">
                              <span className="text-sm font-bold text-slate-500">رقم اللوحة</span>
                              <span className="font-black text-slate-800" dir="ltr">{userDetails.plate_number}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
                        <h3 className="font-black text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
                          <FileText size={18} className="text-emerald-500" /> الوثائق والمستندات (السجل/الثبوتيات)
                        </h3>

                        {userDetails.role === 'driver' ? (
                          <div className="grid grid-cols-2 gap-3">
                            <div className={`p-4 rounded-2xl border flex flex-col items-center justify-center text-center gap-2 ${userDetails.id_document_url ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                              <UserSearch size={24} />
                              <span className="font-bold text-sm">الهوية الوطنية</span>
                              {userDetails.id_document_url ? <a href={userDetails.id_document_url} target="_blank" rel="noreferrer" className="text-xs bg-emerald-100 px-3 py-1 rounded-full hover:bg-emerald-200 transition-colors">عرض الوثيقة</a> : <span className="text-xs">غير مرفق</span>}
                            </div>
                            <div className={`p-4 rounded-2xl border flex flex-col items-center justify-center text-center gap-2 ${userDetails.driving_license_url ? 'bg-blue-50 border-blue-100 text-blue-700' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                              <FileText size={24} />
                              <span className="font-bold text-sm">رخصة القيادة</span>
                              {userDetails.driving_license_url ? <a href={userDetails.driving_license_url} target="_blank" rel="noreferrer" className="text-xs bg-blue-100 px-3 py-1 rounded-full hover:bg-blue-200 transition-colors">عرض الوثيقة</a> : <span className="text-xs">غير مرفق</span>}
                            </div>
                            <div className={`p-4 rounded-2xl border flex flex-col items-center justify-center text-center gap-2 col-span-2 ${userDetails.vehicle_insurance_url ? 'bg-amber-50 border-amber-100 text-amber-700' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                              <Shield size={24} />
                              <span className="font-bold text-sm">التأمين / الاستمارة</span>
                              {userDetails.vehicle_insurance_url ? <a href={userDetails.vehicle_insurance_url} target="_blank" rel="noreferrer" className="text-xs bg-amber-100 px-3 py-1 rounded-full hover:bg-amber-200 transition-colors">عرض الوثيقة</a> : <span className="text-xs">غير مرفق</span>}
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center py-8 text-slate-400 text-center gap-3">
                            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center"><FileText size={28} /></div>
                            <p className="font-bold text-sm">لا توجد وثائق سجل تجاري مرفوعة لهذا الشاحن/التاجر حالياً.</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Activity Log - سجل النشاط */}
                    <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <h3 className="font-black text-slate-800 flex items-center gap-2">
                          <Activity size={18} className="text-blue-500" /> سجل الحركات الأخير (Activity Log)
                        </h3>
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                          <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                            <Edit size={18} />
                          </div>
                          <div>
                            <p className="font-bold text-slate-800 text-sm">آخر تحديث لبيانات الملف الشخصي</p>
                            <p className="text-xs text-slate-500 mt-1">تمت بواسطة النظام الآلي</p>
                          </div>
                          <div className="mr-auto text-xs font-black text-slate-400 bg-white px-3 py-1.5 rounded-lg border border-slate-200" dir="ltr">
                            {new Date(userDetails.updated_at || userDetails.created_at).toLocaleString('ar-SA')}
                          </div>
                        </div>
                        <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 opacity-70 grayscale">
                          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                            <UserCheck size={18} />
                          </div>
                          <div>
                            <p className="font-bold text-slate-800 text-sm">تم إنشاء الحساب بنجاح</p>
                            <p className="text-xs text-slate-500 mt-1">عبر التسجيل الذاتي</p>
                          </div>
                          <div className="mr-auto text-xs font-black text-slate-400 bg-white px-3 py-1.5 rounded-lg border border-slate-200" dir="ltr">
                            {new Date(userDetails.created_at).toLocaleString('ar-SA')}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="bg-white p-4 border-t border-slate-100 flex items-center justify-between flex-shrink-0">
                    <div className="flex gap-2">
                      <Button onClick={() => handleUpdateStatus(userDetails.id, userDetails.status === 'active' ? 'suspended' : 'active')} variant="outline" className={`h-12 rounded-2xl px-6 font-black ${userDetails.status === 'active' ? 'text-rose-600 hover:bg-rose-50 border-rose-200' : 'text-emerald-600 hover:bg-emerald-50 border-emerald-200'}`}>
                        {userDetails.status === 'active' ? <><Ban size={18} className="ml-2" /> حظر المستخدم</> : <><UserCheck size={18} className="ml-2" /> فك الحظر</>}
                      </Button>
                      <Button onClick={() => handleEditUser(userDetails)} variant="outline" className="h-12 rounded-2xl px-6 font-black text-slate-600 border-slate-200 hover:bg-slate-50">
                        <Edit size={18} className="ml-2" /> تعديل البيانات
                      </Button>
                    </div>
                    <Button onClick={() => setShowUserDetails(false)} variant="ghost" className="h-12 rounded-2xl px-8 font-black text-slate-500 hover:bg-slate-100">
                      إغلاق
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* نافذة إدارة رصيد المحفظة */}
          <Dialog open={isWalletModalOpen} onOpenChange={setIsWalletModalOpen}>
            <DialogContent className="rounded-[2.5rem] p-0 overflow-hidden max-w-md border-none shadow-2xl" dir="rtl">
              <div className="bg-slate-900 p-8 text-white relative">
                <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                  <Wallet size={200} className="-ml-10 -mt-10 rotate-12" />
                </div>
                <DialogTitle className="text-2xl font-black mb-2 relative z-10 text-right">إدارة الرصيد</DialogTitle>
                <p className="text-slate-400 font-bold relative z-10 text-right">المستخدم: {selectedUser?.full_name}</p>

                <div className="mt-6 bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 relative z-10 text-center">
                  <p className="text-xs font-bold text-slate-300 mb-1">الرصيد الحالي</p>
                  <h4 className="text-3xl font-black" dir="ltr">
                    {Number(selectedUserWallet?.balance || 0).toLocaleString()} <span className="text-sm font-bold opacity-60">SAR</span>
                  </h4>
                </div>
              </div>

              <div className="p-8 space-y-6 bg-white">
                <div className="flex p-1 bg-slate-100 rounded-2xl gap-1">
                  <button
                    onClick={() => setAdjustmentType('deposit')}
                    className={`flex-1 h-12 rounded-xl font-black transition-all ${adjustmentType === 'deposit' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                  >إيداع رصيد</button>
                  <button
                    onClick={() => setAdjustmentType('deduction')}
                    className={`flex-1 h-12 rounded-xl font-black transition-all ${adjustmentType === 'deduction' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                  >خصم رصيد</button>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2 text-right">
                    <Label className="font-black text-slate-700 mr-2">المبلغ (ر.س)</Label>
                    <Input
                      type="number"
                      value={adjustmentAmount}
                      onChange={e => setAdjustmentAmount(e.target.value)}
                      className="h-14 rounded-2xl border-2 bg-slate-50 font-black text-xl text-center focus:ring-blue-500"
                      placeholder="0.00"
                    />
                  </div>

                  <div className="space-y-2 text-right">
                    <Label className="font-black text-slate-700 mr-2">ملاحظات العملية</Label>
                    <Input
                      value={adjustmentNotes}
                      onChange={e => setAdjustmentNotes(e.target.value)}
                      className="h-12 rounded-2xl border-2 bg-slate-50 font-bold"
                      placeholder="سبب الإيداع أو الخصم..."
                    />
                  </div>
                </div>

                <Button
                  onClick={handleBalanceAdjustment}
                  disabled={isProcessingWallet}
                  className={`w-full h-14 rounded-2xl font-black text-lg text-white shadow-xl transition-all active:scale-95 ${adjustmentType === 'deposit' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20' : 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/20'
                    }`}
                >
                  {isProcessingWallet ? <Loader2 className="animate-spin" /> : (adjustmentType === 'deposit' ? 'تأكيد الإيداع' : 'تأكيد الخصم')}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* نافذة تعديل بيانات المستخدم */}
          <Dialog open={isEditingUser} onOpenChange={setIsEditingUser}>
            <DialogContent className="rounded-[2.5rem] p-8 max-w-md border-none shadow-2xl" dir="rtl">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black text-slate-800 text-right">تعديل بيانات الحساب</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2 text-right">
                  <Label className="font-bold text-slate-700">الاسم الكامل</Label>
                  <Input
                    value={editFormData.full_name}
                    onChange={e => setEditFormData({ ...editFormData, full_name: e.target.value })}
                    className="h-12 rounded-xl border-slate-200 font-bold"
                  />
                </div>
                <div className="space-y-2 text-right">
                  <Label className="font-bold text-slate-700">رقم الجوال</Label>
                  <Input
                    value={editFormData.phone}
                    onChange={e => setEditFormData({ ...editFormData, phone: e.target.value })}
                    className="h-12 rounded-xl border-slate-200 font-bold"
                  />
                </div>
                <div className="space-y-2 text-right">
                  <Label className="font-bold text-slate-700">رقم الهوية / الإقامة</Label>
                  <Input
                    value={editFormData.id_number}
                    onChange={e => setEditFormData({ ...editFormData, id_number: e.target.value })}
                    className="h-12 rounded-xl border-slate-200 font-bold"
                  />
                </div>
                {userDetails?.role === 'driver' && (
                  <div className="space-y-2 text-right">
                    <Label className="font-bold text-slate-700">رقم اللوحة</Label>
                    <Input
                      value={editFormData.plate_number}
                      onChange={e => setEditFormData({ ...editFormData, plate_number: e.target.value })}
                      className="h-12 rounded-xl border-slate-200 font-bold"
                    />
                  </div>
                )}
              </div>
              <DialogFooter className="mt-8 flex gap-2">
                <Button onClick={saveEditedUser} className="h-12 px-8 rounded-xl bg-blue-600 hover:bg-blue-700 font-black text-white">حفظ التغييرات</Button>
                <Button onClick={() => setIsEditingUser(false)} variant="ghost" className="h-12 rounded-xl font-bold">إلغاء</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </AdminLayout >
  );
}
