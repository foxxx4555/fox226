import { useEffect, useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Search, UserCheck, UserX, UserSearch, Shield, MapPin, Phone } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function AdminUsers() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

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

  const handleToggleStatus = async (userId: string, currentRole: string) => {
    // في النظام الحالي، قد لا يوجد حقل 'is_active' مباشر في profiles
    // لكن يمكننا إضافة حالة تعليق أو حظر في قاعدة البيانات مستقبلاً
    // حالياً سنعرض رسالة فقط للتوضيح
    toast.info('ميزة تفعيل/تعطيل الحسابات سيتم ربطها قريباً مع نظام التوثيق');
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

                  <div className="flex gap-3 w-full md:w-auto">
                    <Button onClick={() => handleToggleStatus(user.id, user.role)} variant="outline" className="flex-1 md:flex-none h-12 rounded-xl font-bold border-rose-200 text-rose-500 hover:bg-rose-50 hover:border-rose-300">
                      <UserX size={18} className="me-2" /> حظر
                    </Button>
                    <Button className="flex-1 md:flex-none h-12 rounded-xl font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-lg shadow-slate-900/20">
                      <Shield size={18} className="me-2" /> توثيق الحساب
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
