import { useEffect, useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Search, UserCheck, UserX, UserSearch, Shield, MapPin, Phone, Trash2, Key, Eye, EyeOff } from 'lucide-react';
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

export default function AdminUsers() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdatingPass, setIsUpdatingPass] = useState(false);

  const fetchUsers = async () => {
    try {
      // إحضار كافة بيانات المستخدمين (الأدوار: تاجر وسائق)
      const { data: profiles, error: profileErr } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
      const { data: rolesData, error: rolesErr } = await supabase.from('user_roles').select('*');

      if (profileErr || rolesErr) throw profileErr || rolesErr;

      // دمج بيانات المستخدمين مع أدوارهم
      const formattedUsers = profiles?.map(p => {
        const userRole = rolesData?.find(r => r.user_id === p.id)?.role || 'غير محدد';
        return { ...p, role: userRole };
      });

      setUsers(formattedUsers || []);
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

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الحساب نهائياً؟')) return;
    setIsDeleting(true);
    try {
      await api.deleteUser(userId);
      toast.success('تم حذف المستخدم بنجاح');
      fetchUsers();
    } catch (e) {
      toast.error('فشل حذف المستخدم');
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
      toast.success('تم تغيير كلمة المرور بنجاح');
      setSelectedUser(null);
      setNewPassword('');
    } catch (e: any) {
      toast.error(e.message || 'فشل تغيير كلمة المرور');
    } finally {
      setIsUpdatingPass(false);
    }
  };

  const filteredUsers = users.filter(user =>
    user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.phone?.includes(searchQuery) ||
    user.role?.includes(searchQuery)
  );

  return (
    <AdminLayout>
      <div className="space-y-8 max-w-7xl mx-auto pb-20">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">إدارة المستخدمين</h1>
            <p className="text-muted-foreground font-medium mt-1">مراقبة وتوثيق حسابات السائقين والتجار</p>
          </div>

          <div className="relative w-full md:w-96">
            <Input
              placeholder="ابحث بالاسم، الجوال، أو الدور..."
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
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-[3rem] border-2 border-dashed border-slate-200">
            <UserSearch size={64} className="mx-auto text-slate-300 mb-4" />
            <p className="font-bold text-slate-500 text-lg">لا يوجد مستخدمين مطابقين للبحث</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {filteredUsers.map(user => (
              <Card key={user.id} className="rounded-[2rem] border-none shadow-md hover:shadow-xl transition-all bg-white relative overflow-hidden">
                <div className={`absolute top-0 right-0 w-2 h-full ${user.role === 'driver' ? 'bg-emerald-500' : 'bg-blue-600'}`}></div>
                <CardContent className="p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-2xl font-black text-slate-400">
                      {user.full_name ? user.full_name.charAt(0) : '?'}
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-slate-800">{user.full_name || 'اسم غير متوفر'}</h3>
                      <div className="flex flex-wrap items-center gap-3 mt-2 text-sm font-bold text-slate-500">
                        <span className="flex items-center gap-1"><Phone size={14} /> <span dir="ltr">{user.phone}</span></span>
                        {user.country_code && <span className="flex items-center gap-1"><MapPin size={14} /> {user.country_code}</span>}
                        <Badge variant="outline" className={`text-xs ${user.role === 'driver' ? 'text-emerald-600 border-emerald-200 bg-emerald-50' : 'text-blue-600 border-blue-200 bg-blue-50'}`}>
                          {user.role === 'driver' ? 'سائق' : user.role === 'shipper' ? 'تاجر (شاحن)' : user.role}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 w-full md:w-auto">
                    <Dialog open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
                      <DialogTrigger asChild>
                        <Button onClick={() => setSelectedUser(user)} variant="outline" className="h-10 rounded-xl font-bold bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200">
                          <Key size={16} className="me-2" /> كلمة السر
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="rounded-3xl p-8" dir="rtl">
                        <DialogHeader>
                          <DialogTitle className="text-2xl font-black text-slate-800">تغيير كلمة المرو لـ {selectedUser?.full_name}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-8">
                          <div className="space-y-2">
                            <Label className="text-sm font-bold text-slate-600">كلمة المرور الجديدة</Label>
                            <div className="relative">
                              <Input
                                type={showNewPassword ? "text" : "password"}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="h-14 rounded-2xl border-2 bg-slate-50 focus:bg-white focus:border-primary transition-all font-bold ps-4 pe-12"
                                placeholder="أدخل 6 أحرف على الأقل"
                              />
                              <button
                                type="button"
                                onClick={() => setShowNewPassword(!showNewPassword)}
                                className="absolute end-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary transition-colors"
                              >
                                {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                              </button>
                            </div>
                          </div>
                        </div>
                        <DialogFooter className="gap-2">
                          <Button onClick={() => setSelectedUser(null)} variant="ghost" className="h-12 rounded-xl font-bold">إلغاء</Button>
                          <Button onClick={handleChangePassword} disabled={isUpdatingPass} className="h-12 rounded-xl font-bold bg-primary hover:bg-primary/90 text-white flex-1">
                            {isUpdatingPass ? <Loader2 className="animate-spin" /> : 'حفظ التغييرات'}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>

                    <Button onClick={() => handleDeleteUser(user.id)} variant="outline" className="h-10 rounded-xl font-bold border-rose-100 text-rose-500 hover:bg-rose-50 hover:border-rose-200">
                      <Trash2 size={16} className="me-2" /> حذف
                    </Button>

                    <Button className="h-10 rounded-xl font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-lg shadow-slate-900/20">
                      <Shield size={16} className="me-2" /> توثيق
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
