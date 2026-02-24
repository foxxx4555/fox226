import { supabase } from '@/integrations/supabase/client';
import { UserProfile, AdminStats, UserRole } from '@/types';

// 🛑 معالج أخطاء لتنظيف الـ Console من الرسائل التقنية المزعجة
const handleApiError = (err: any) => {
  if (err.name === 'AbortError' || err.message?.includes('aborted')) return null;
  console.error("⚠️ API Error:", err.message || err);
  throw err;
};

export const api = {
  // =========================
  // 🔐 المصادقة (Auth)
  // =========================

  async loginByEmail(email: string, password: string) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      // جلب البروفايل والدور بشكل متوازي لتحسين الأداء والدقة
      const [profileRes, roleRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', data.user.id).maybeSingle(),
        supabase.from('user_roles').select('role').eq('user_id', data.user.id).maybeSingle()
      ]);

      const profile = profileRes.data;
      const roleData = roleRes.data;

      return {
        profile: profile as unknown as UserProfile,
        role: (roleData?.role || 'shipper') as UserRole
      };
    } catch (e) { throw e; }
  },

  async loginAdmin(email: string, password: string) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      // التأكد من صلاحية الأدمن
      const { data: roleData } = await supabase.from('user_roles').select('role').eq('user_id', data.user.id).maybeSingle();
      if (!roleData || roleData.role !== 'admin') {
        await supabase.auth.signOut();
        throw new Error("عذراً، هذا الحساب لا يملك صلاحيات الإدارة.");
      }
      return data;
    } catch (e) { throw e; }
  },

  async registerUser(email: string, password: string, profile: { full_name: string; phone: string; role: UserRole; email: string }) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: profile.full_name,
          phone: profile.phone,
          role: profile.role,
          email: profile.email // إرسال البريد هنا يضمن وصوله لـ Trigger قاعدة البيانات
        }
      },
    });
    if (error) throw error;

    return data;
  },

  async verifyEmailOtp(email: string, token: string) {
    const { data, error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
    if (error) throw error;
    return data;
  },

  async resendOtp(email: string) {
    await supabase.auth.resend({ type: "signup", email });
  },

  // =========================
  // 🔔 نظام الإشعارات (Live)
  // =========================

  async createNotification(userId: string, title: string, message: string, type: 'accept' | 'complete' | 'new_load' | 'system') {
    try {
      await (supabase as any).from('notifications').insert([{ user_id: userId, title, message, type }]);
    } catch (e) { handleApiError(e); }
  },

  async getNotifications(userId: string) {
    const { data } = await (supabase as any).from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    return data || [];
  },

  async clearAllNotifications(userId: string) {
    await (supabase as any).from('notifications').delete().eq('user_id', userId);
  },

  // =========================
  // 🚚 إدارة الشحنات
  // =========================

  async postLoad(loadData: any, userId: string) {
    const { data, error } = await supabase.from('loads').insert([{ ...loadData, owner_id: userId, status: 'available' }]).select().single();
    if (error) throw error;

    // رادار حي: إخطار السائقين بوجود شحنة جديدة
    const { data: drivers } = await supabase.from('user_roles').select('user_id').eq('role', 'driver');
    if (drivers) {
      const bulkNotifs = drivers.map(d => ({
        user_id: d.user_id,
        title: "📦 شحنة جديدة متاحة!",
        message: `حمل جديد من ${loadData.origin} بـ ${loadData.price} ريال`,
        type: 'new_load'
      }));
      await (supabase as any).from('notifications').insert(bulkNotifs);
    }
    return data;
  },

  async acceptLoad(loadId: string, driverId: string) {
    const { data: load } = await supabase.from('loads').select('owner_id, origin').eq('id', loadId).single();
    await supabase.from('loads').update({ status: 'in_progress', driver_id: driverId, updated_at: new Date().toISOString() }).eq('id', loadId);
    if (load) {
      await this.createNotification(load.owner_id, "✅ تم قبول شحنتك", `الناقل في طريقه إليك الآن.`, 'accept');
    }
    return true;
  },

  async completeLoad(loadId: string) {
    const { data: load } = await supabase.from('loads').select('owner_id').eq('id', loadId).single();
    await supabase.from('loads').update({ status: 'completed', updated_at: new Date().toISOString() }).eq('id', loadId);
    if (load) {
      await this.createNotification(load.owner_id, "🏁 وصلت الشحنة بسلام", "تم تسليم الشحنة بنجاح. شكراً لك.", 'complete');
    }
    return true;
  },

  async cancelLoad(loadId: string) {
    await supabase.from('loads').update({ status: 'available', driver_id: null }).eq('id', loadId);
    return true;
  },

  // =========================
  // 👑 وظائف الإدارة (Admin) - حل المشكلة الأساسية
  // =========================

  async getAdminStats(): Promise<AdminStats> {
    try {
      const { count: u } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
      const { count: l } = await supabase.from('loads').select('*', { count: 'exact', head: true }).eq('status', 'in_progress');
      const { count: d } = await supabase.from('user_roles').select('*', { count: 'exact', head: true }).eq('role', 'driver');
      const { count: s } = await supabase.from('user_roles').select('*', { count: 'exact', head: true }).eq('role', 'shipper');

      return {
        totalUsers: u || 0,
        totalDrivers: d || 0,
        totalShippers: s || 0,
        activeLoads: l || 0,
        completedTrips: 0
      };
    } catch (e) {
      return { totalUsers: 0, totalDrivers: 0, totalShippers: 0, activeLoads: 0, completedTrips: 0 };
    }
  },

  async getTickets() {
    try {
      const { data, error } = await supabase.from('support_tickets').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (e) { return []; }
  },

  async getAllUsers() {
    try {
      const { data, error } = await supabase.from('profiles').select('*, user_roles(role)').order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (e) { return []; }
  },

  async deleteUser(userId: string) {
    try {
      // حذف من الجداول المرتبطة أولاً (Profiles سيحذف تلقائياً بسبب Cascade إذا تم ضبطه)
      const { error } = await supabase.from('profiles').delete().eq('id', userId);
      if (error) throw error;
      return true;
    } catch (e) { throw e; }
  },

  async adminResetPassword(userId: string, newPassword: string) {
    try {
      // ملاحظة: تغيير كلمة السر لمستخدم آخر يحتاج صلاحيات أدمن (Service Role)
      // أو استخدام Edge Function. حالياً سنحاول استخدام تحديث RPC إذا كان متاحاً
      // أو إبلاغ المستخدم بضرورة إعداد Edge Function لهذه الميزة الحساسة
      const { error } = await supabase.rpc('admin_update_user_password', {
        target_user_id: userId,
        new_password: newPassword
      });
      if (error) throw error;
      return true;
    } catch (e) { throw e; }
  },

  async getAllLoads() {
    try {
      const { data, error } = await supabase.from('loads').select(`*, owner:profiles!loads_owner_id_fkey(*), driver:profiles!loads_driver_id_fkey(*)`).order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (e) { return []; }
  },

  // =========================
  // 📈 وظائف الجلب الأخرى
  // =========================

  async getShipperStats(userId: string) {
    const { count: a } = await supabase.from('loads').select('*', { count: 'exact', head: true }).eq('owner_id', userId).eq('status', 'in_progress');
    const { count: c } = await supabase.from('loads').select('*', { count: 'exact', head: true }).eq('owner_id', userId).eq('status', 'completed');
    return { activeLoads: a || 0, completedTrips: c || 0 };
  },

  async getDriverStats(userId: string) {
    const { count: a } = await supabase.from('loads').select('*', { count: 'exact', head: true }).eq('driver_id', userId).eq('status', 'in_progress');
    const { count: c } = await supabase.from('loads').select('*', { count: 'exact', head: true }).eq('driver_id', userId).eq('status', 'completed');
    return { activeLoads: a || 0, completedTrips: c || 0, rating: 4.9 };
  },

  async getAvailableLoads() {
    const { data } = await supabase.from('loads').select(`*, owner:profiles!loads_owner_id_fkey (*)`).eq('status', 'available').order('created_at', { ascending: false });
    return data || [];
  },

  async getUserLoads(userId: string) {
    const { data } = await supabase.from('loads').select(`*, owner:profiles!loads_owner_id_fkey(*), driver:profiles!loads_driver_id_fkey(*)`).or(`owner_id.eq.${userId},driver_id.eq.${userId}`).order('created_at', { ascending: false });
    return data || [];
  },

  async getAvailableDrivers() {
    const { data } = await supabase.from('profiles').select('*, user_roles!inner(role)').eq('user_roles.role', 'driver');
    return data || [];
  },

  async updateProfile(userId: string, updates: any) {
    await supabase.from('profiles').update(updates).eq('id', userId);
  },

  // =========================
  // 💰 المحفظة والبيانات المالية
  // =========================

  async getWalletBalance(userId: string) {
    try {
      // ملاحظة: تأكد من أن جدول profiles يحتوي على عمود اسمه balance 
      // أو قم بتغيير اسم الجدول إذا كان لديك جدول منفصل للمحفظة
      const { data, error } = await supabase
        .from('profiles')
        .select('balance' as any)
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;
      return (data as any)?.balance || 0;
    } catch (e) {
      console.error("Error fetching wallet balance:", e);
      return 0;
    }
  },

  async getTransactionHistory(userId: string) {
    try {
      // هذا مجرد مثال، تأكد من وجود جدول transactions في قاعدة بياناتك
      const { data, error } = await (supabase as any)
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (e) {
      return [];
    }
  },


  // =========================
  // 💬 نظام المراسلة (Real-time Messaging)
  // =========================

  async getConversations(userId: string) {
    // جلب قائمة الأشخاص الذين تواصلت معهم (سائقين أو أصحاب شحنات)
    const { data, error } = await supabase
      .from('messages')
      .select(`
        id, text, created_at, sender_id, receiver_id,
        sender:profiles!messages_sender_id_fkey(full_name, phone),
        receiver:profiles!messages_receiver_id_fkey(full_name, phone)
      `)
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (error) return [];

    // منطق لتصفية الأسماء الفريدة لعمل قائمة المحادثات
    const contactsMap = new Map();
    data.forEach((msg: any) => {
      const otherUser = msg.sender_id === userId ? msg.receiver : msg.sender;
      const otherId = msg.sender_id === userId ? msg.receiver_id : msg.sender_id;
      if (!contactsMap.has(otherId) && otherUser) {
        contactsMap.set(otherId, {
          id: otherId,
          name: otherUser.full_name,
          phone: otherUser.phone,
          lastMessage: msg.text,
          time: new Date(msg.created_at).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })
        });
      }
    });
    return Array.from(contactsMap.values());
  },

  async getMessages(userId: string, otherId: string) {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${userId},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${userId})`)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async sendMessage(senderId: string, receiverId: string, text: string) {
    const { data, error } = await supabase
      .from('messages')
      .insert([{ sender_id: senderId, receiver_id: receiverId, text }])
      .select();
    if (error) throw error;
    return data;
  }

};
