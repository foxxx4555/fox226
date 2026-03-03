import { supabase } from '@/integrations/supabase/client';
import { UserProfile, AdminStats, UserRole } from '@/types';

// قائمة الأدوار الإدارية المسموح لها بدخول لوحة التحكم
const ADMIN_ROLES = [
  'super_admin', 'super_admin', 'admin', 'Admin',
  'finance', 'Finance', 'operations', 'Operations',
  'carrier_manager', 'Carrier Manager', 'vendor_manager',
  'Vendor Manager', 'support', 'Buyer Support', 'analytics', 'Analytics'
];

// 🛑 معالج أخطاء لتنظيف الـ Console
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

      const { data: profile } = await supabase
        .from('profiles')
        .select('*, user_roles(role)')
        .eq('id', data.user.id)
        .maybeSingle();

      // --- الزتونة هنا: التأكد من أن الأدوار دائماً مصفوفة ---
      const rawRoles = (profile as any)?.user_roles;
      const rolesArray = Array.isArray(rawRoles)
        ? rawRoles
        : (rawRoles ? [rawRoles] : []);

      // منطق ذكي: إعطاء الأولوية للدور الإداري إذا وُجد لضمان التوجيه للوحة التحكم
      const foundAdminRole = rolesArray.find((r: any) =>
        ADMIN_ROLES.includes(r.role)
      );

      const finalRole = foundAdminRole
        ? foundAdminRole.role
        : (rolesArray[0]?.role || 'shipper');

      return {
        profile: profile as unknown as UserProfile,
        role: finalRole as UserRole
      };
    } catch (e) { throw e; }
  },

  async loginAdmin(email: string, password: string) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', data.user.id);

      const userRoles = rolesData?.map(r => r.role) || [];
      const hasAccess = userRoles.some(role => ADMIN_ROLES.includes(role));

      if (!hasAccess) {
        await supabase.auth.signOut();
        throw new Error("عذراً، هذا الحساب لا يملك صلاحيات الإدارة.");
      }
      return data;
    } catch (e) { throw e; }
  },

  async registerUser(email: string, password: string, profile: { full_name: string; phone: string; role: UserRole }) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: profile.full_name, phone: profile.phone, role: profile.role },
        // أضف هذا السطر لمنع تضارب الجلسات وتسجيل الخروج التلقائي
        // @ts-ignore
        persistSession: false
      },
    });
    if (error) throw error;
    return data;
  },

  // ✅ إضافة الدالة ال
  // فقودة للتحقق من الكود (OTP)
  async verifyEmailOtp(email: string, token: string) {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email'
    });
    if (error) throw error;
    return data;
  },

  // ✅ إضافة دالة إعادة إرسال الكود
  async resendOtp(email: string) {
    const { data, error } = await supabase.auth.resend({
      type: 'signup',
      email,
    });
    if (error) throw error;
    return data;
  },

  // ✅ دالة إرسال رابط إعادة تعيين كلمة المرور
  async forgotPassword(email: string) {
    try {
      // الزتونة: بنحدد المسار الكامل لصفحة إعادة التعيين وبنمنع المسافات
      const resetUrl = `${window.location.origin}/reset-password`;

      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: resetUrl,
      });
      if (error) throw error;
      return data;
    } catch (e) {
      throw e;
    }
  },

  // ✅ دالة تحديث كلمة المرور الجديدة
  async updatePassword(newPassword: string) {
    try {
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword
      });
      if (error) throw error;
      return data;
    } catch (e) {
      throw e;
    }
  },

  // ✅ دالة تحديث بيانات البروفايل
  async updateProfile(userId: string, updates: { full_name?: string; phone?: string; email?: string; company_name?: string; commercial_register?: string; tax_number?: string; id_number?: string; plate_number?: string; avatar_url?: string; driving_license_url?: string; id_document_url?: string; vehicle_insurance_url?: string; }) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (e) {
      throw e;
    }
  },

  async uploadImage(file: File, bucketName: string = 'avatars') {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage.from(bucketName).upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from(bucketName).getPublicUrl(filePath);
      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  },

  // =========================
  // 🔔 نظام الإشعارات (Live)
  // =========================

  async createNotification(userId: string, title: string, message: string, type: 'accept' | 'complete' | 'new_load' | 'system') {
    try {
      const { data, error } = await (supabase as any).from('notifications').insert([{ user_id: userId, title, message, type }]).select('*').single();

      // إرسال Broadcast لضمان وصول الإشعار فوراً حتى لو كان هناك تأخير في قاعدة البيانات أو قواعد الوصول RLS
      const broadcastPayload = data || { id: Date.now().toString(), user_id: userId, title, message, type, is_read: false, created_at: new Date().toISOString() };

      supabase.channel(`user-notifs-${userId}`).send({
        type: 'broadcast',
        event: 'new_notification',
        payload: broadcastPayload
      });

      if (error) console.error("Notification DB Insert Warning:", error);
    } catch (e) { console.error("Failed executing notification flow", e); }
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
    return data;
  },

  async acceptLoad(loadId: string, driverId: string, ownerId: string, price: number) {
    await supabase.from('loads').update({
      status: 'in_progress',
      driver_id: driverId,
      price: price,
      updated_at: new Date().toISOString()
    }).eq('id', loadId);

    // Create financial record
    try {
      const { financeApi } = await import('@/lib/finances');
      await financeApi.createShipmentFinance({
        shipment_id: loadId,
        shipper_id: ownerId,
        carrier_id: driverId,
        shipment_price: price,
        commission_rate: 15
      });
    } catch (e) {
      console.error('Error creating financial record:', e);
    }

    return true;
  },

  async updateLoad(loadId: string, updates: any) {
    const { data, error } = await supabase
      .from('loads')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', loadId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async completeLoad(loadId: string) {
    await supabase.from('loads').update({ status: 'completed', updated_at: new Date().toISOString() }).eq('id', loadId);
    return true;
  },

  async submitRating(data: { load_id: string, driver_id: string, shipper_id: string, rating: number, comment?: string }) {
    try {
      const { error } = await (supabase as any).from('ratings').insert([{
        load_id: data.load_id,
        rater_id: data.driver_id,
        rated_id: data.shipper_id,
        rating: data.rating,
        comment: data.comment
      }]);
      if (error) throw error;
      return true;
    } catch (e) {
      console.error("Failed submitting rating", e);
      throw e;
    }
  },

  async cancelLoad(loadId: string) {
    await supabase.from('loads').update({ status: 'available', driver_id: null }).eq('id', loadId);
    return true;
  },

  async getAvailableLoads() {
    const { data: loads, error } = await supabase
      .from('loads')
      .select('*, owner:profiles!loads_owner_id_fkey(*)')
      .eq('status', 'available')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return loads || [];
  },

  async getAvailableDrivers() {
    const { data, error } = await (supabase as any)
      .from('profiles')
      .select('*')
      .eq('role', 'driver')
      .eq('status', 'active');

    if (error) throw error;
    return data || [];
  },

  async getAdminDriverRatings() {
    const { data: ratings, error } = await (supabase as any)
      .from('ratings')
      .select(`
        *,
        rater:profiles!ratings_rater_id_fkey(full_name, phone),
        rated:profiles!ratings_rated_id_fkey(full_name, phone, status),
        load:loads(origin, destination, package_type, price)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return ratings || [];
  },

  // =========================
  // 📦 إدارة المنتجات (Products)
  // =========================

  async addProduct(productData: any, ownerId: string) {
    const { data, error } = await supabase
      .from('products')
      .insert([{
        name: productData.name,
        type: productData.type || productData.category,
        unit: productData.unit,
        description: productData.description,
        owner_id: ownerId
      }]);
    if (error) throw error;
    return data;
  },

  async getProducts(userId: string) {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async deleteProduct(productId: string) {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', productId);
    if (error) throw error;
    return true;
  },

  // =========================
  // � إدارة المستلمين (Receivers)
  // =========================

  async addReceiver(receiverData: any, ownerId: string) {
    const { data, error } = await supabase
      .from('receivers')
      .insert([{
        name: receiverData.name,
        phone: receiverData.phone,
        address: receiverData.address,
        owner_id: ownerId
      }]);
    if (error) throw error;
    return data;
  },

  async getReceivers(userId: string) {
    const { data, error } = await supabase
      .from('receivers')
      .select('*')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async deleteReceiver(receiverId: string) {
    const { error } = await supabase
      .from('receivers')
      .delete()
      .eq('id', receiverId);
    if (error) throw error;
    return true;
  },

  // =========================
  // �👑 وظائف الإدارة (Admin)
  // =========================

  // =========================
  // 💬 الرسائل والمحادثات (Messaging)
  // =========================

  async getChatContacts(userId: string, role: 'shipper' | 'driver') {
    if (role === 'shipper') {
      const { data } = await supabase
        .from('loads')
        .select('driver:profiles!loads_driver_id_fkey(id, full_name, phone)')
        .eq('owner_id', userId)
        .not('driver_id', 'is', null);

      const uniqueDrivers = new Map();
      data?.forEach((d: any) => {
        if (d.driver && !uniqueDrivers.has(d.driver.id)) {
          uniqueDrivers.set(d.driver.id, d.driver);
        }
      });
      return Array.from(uniqueDrivers.values());
    } else {
      const { data } = await supabase
        .from('loads')
        .select('owner:profiles!loads_owner_id_fkey(id, full_name, phone)')
        .eq('driver_id', userId);

      const uniqueShippers = new Map();
      data?.forEach((d: any) => {
        if (d.owner && !uniqueShippers.has(d.owner.id)) {
          uniqueShippers.set(d.owner.id, d.owner);
        }
      });
      return Array.from(uniqueShippers.values());
    }
  },

  async getConversations(userId: string) {
    try {
      const { data, error } = await (supabase as any)
        .from('messages')
        .select(`
          id, text, created_at, sender_id, receiver_id,
          sender:profiles!messages_sender_id_fkey(id, full_name, phone),
          receiver:profiles!messages_receiver_id_fkey(id, full_name, phone)
        `)
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!data) return [];

      const conversationsMap = new Map();
      data.forEach((msg: any) => {
        const otherUser = msg.sender_id === userId ? msg.receiver : msg.sender;
        if (!otherUser) return;

        if (!conversationsMap.has(otherUser.id)) {
          conversationsMap.set(otherUser.id, {
            id: otherUser.id,
            name: otherUser.full_name,
            phone: otherUser.phone,
            lastMessage: msg.text,
            time: new Date(msg.created_at).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
            timestamp: new Date(msg.created_at).getTime()
          });
        }
      });

      return Array.from(conversationsMap.values()).sort((a: any, b: any) => b.timestamp - a.timestamp);
    } catch (err) {
      console.error('Error fetching conversations:', err);
      return [];
    }
  },

  async getMessages(userId: string, otherId: string) {
    const { data, error } = await (supabase as any)
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${userId},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${userId})`)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async sendMessage(senderId: string, receiverId: string, text: string) {
    const { data, error } = await (supabase as any)
      .from('messages')
      .insert([{ sender_id: senderId, receiver_id: receiverId, text }]);

    if (error) throw error;
    return data;
  },

  async getAdminStats(): Promise<AdminStats> {
    try {
      const { count: u } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
      const { count: c } = await supabase.from('user_roles').select('*', { count: 'exact', head: true }).eq('role', 'driver');
      const { count: s } = await supabase.from('user_roles').select('*', { count: 'exact', head: true }).eq('role', 'shipper');
      // الجلب المباشر من جدول receivers الفعلي وليس من roles نظراً لطبيعة الهيكلة
      const { count: receiversCount } = await supabase.from('receivers').select('*', { count: 'exact', head: true });

      const { count: activeLoads } = await supabase.from('loads').select('*', { count: 'exact', head: true }).eq('status', 'in_progress');
      const { count: completedTrips } = await supabase.from('loads').select('*', { count: 'exact', head: true }).eq('status', 'completed');

      const { data: completedLoads } = await supabase.from('loads').select('price').eq('status', 'completed');
      let totalCommissions = 0;
      if (completedLoads) {
        totalCommissions = completedLoads.reduce((sum, load) => sum + (Number(load.price) || 0), 0) * 0.05;
      }

      return {
        totalUsers: u || 0,
        totalCarriers: c || 0,
        totalShippers: s || 0,
        totalSubDrivers: c || 0, // In this system, drivers are basically the carriers/subdrivers
        totalTrucks: c || 0,
        totalReceivers: receiversCount || 0,
        activeLoads: activeLoads || 0,
        completedTrips: completedTrips || 0,
        totalCommissions: Math.round(totalCommissions),
        monthlyTarget: 10000
      };
    } catch (e) {
      return { totalUsers: 0, totalCarriers: 0, totalShippers: 0, totalSubDrivers: 0, totalTrucks: 0, totalReceivers: 0, activeLoads: 0, completedTrips: 0, totalCommissions: 0, monthlyTarget: 0 };
    }
  },



  async getAdminChartData() {
    try {
      // Get completed loads from the last 7 days to build the chart
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: recentLoads } = await supabase
        .from('loads')
        .select('price, updated_at')
        .eq('status', 'completed')
        .gte('updated_at', sevenDaysAgo.toISOString());

      // Prepare default structure
      const days = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
      const chartData = days.map(day => ({ name: day, loads: 0, revenue: 0 }));

      if (recentLoads) {
        recentLoads.forEach(load => {
          const date = new Date(load.updated_at);
          const dayIndex = date.getDay();
          const dayName = days[dayIndex];

          const targetDay = chartData.find(d => d.name === dayName);
          if (targetDay) {
            targetDay.loads += 1;
            targetDay.revenue += (Number(load.price) || 0) * 0.05; // Assuming revenue is the commission
          }
        });
      }

      return chartData;
    } catch (e) {
      console.error(e);
      return [];
    }
  },

  async getTickets() {
    const { data } = await supabase.from('support_tickets').select('*').order('created_at', { ascending: false });
    return data || [];
  },

  async getAllUsers() {
    const { data } = await supabase.from('profiles').select('*, user_roles(role)').order('created_at', { ascending: false });
    return data || [];
  },

  async getAllLoads() {
    const { data } = await supabase.from('loads').select(`*, owner:profiles!loads_owner_id_fkey(*), driver:profiles!loads_driver_id_fkey(*)`).order('created_at', { ascending: false });
    return data || [];
  },

  async updateUserStatus(userId: string, status: 'active' | 'suspended' | 'pending') {
    const { error } = await supabase.from('profiles').update({ status } as any).eq('id', userId);
    if (error) throw error;
    return true;
  },

  async deleteUser(userId: string) {
    const { data, error } = await supabase.functions.invoke('delete-user', {
      body: { user_id: userId }
    });
    if (error) throw error;
    return true;
  },

  async adminResetPassword(userId: string, newPassword: string) {
    // Cannot use supabase.auth.admin.updateUserById from client
    // Instead we will call an edge function (or rpc) to handle it
    const { data, error } = await supabase.functions.invoke('admin-reset-password', {
      body: { userId, newPassword }
    });

    // Fallback if Edge function doesn't exist yet but user wants it to work
    if (error && error.message.includes("Function not found")) {
      throw new Error("الرجاء إعداد وظيفة admin-reset-password السحابية في Supabase أولاً لتغيير كلمات المرور.");
    }
    if (error) throw error;
    return true;
  },

  async requestDocumentUpdate(userId: string, documentType: string) {
    await this.createNotification(userId, 'تحديث مستندات مطلوب', `يرجى تحديث المستندات التالية: ${documentType}`, 'system');
    return true;
  },

  // =========================
  // 💰 المحفظة والبيانات المالية
  // =========================

  async getWalletBalance(userId: string) {
    const { data } = await (supabase as any)
      .from('wallets')
      .select('balance')
      .eq('user_id', userId)
      .maybeSingle();
    return { balance: data?.balance || 0 };
  },

  async getTransactionHistory(userId: string) {
    try {
      // First get all wallets for this user to get their IDs
      const { data: userWallets } = await (supabase as any)
        .from('wallets')
        .select('wallet_id')
        .eq('user_id', userId);

      if (!userWallets || userWallets.length === 0) return [];

      const walletIds = userWallets.map((w: any) => w.wallet_id);

      const { data, error } = await (supabase as any)
        .from('financial_transactions')
        .select(`
          *,
          shipment:loads(origin, destination)
        `)
        .in('wallet_id', walletIds)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (e) {
      console.warn("Error fetching transaction history:", e);
      return [];
    }
  },

  async getUserWithdrawals(userId: string) {
    try {
      const { data, error } = await (supabase as any)
        .from('withdrawal_requests')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (e) {
      console.warn("Error fetching user withdrawals:", e);
      return [];
    }
  },

  async getShipperPayments(userId: string) {
    try {
      const { data, error } = await (supabase as any)
        .from('shipper_payments')
        .select('*')
        .eq('shipper_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (e) {
      console.warn("Error fetching shipper payments:", e);
      return [];
    }
  },

  async submitShipperPayment(shipperId: string, amount: number, proofImageUrl: string, notes?: string) {
    try {
      const { data, error } = await (supabase as any)
        .from('shipper_payments')
        .insert({
          shipper_id: shipperId,
          amount,
          proof_image_url: proofImageUrl,
          shipper_notes: notes,
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (e) {
      console.error("Error submitting shipper payment:", e);
      throw e;
    }
  },

  async createStripeSession(walletId: number, amount: number) {
    const response = await fetch('/api/pay/create-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wallet_id: walletId, amount })
    });
    return await response.json();
  },

  async getAllTransactions() {
    try {
      const { data, error } = await (supabase as any)
        .from('financial_transactions')
        .select(`
          *,
          wallet:wallets(user_id, profiles(full_name, phone))
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (e) {
      console.warn("Error fetching all transactions:", e);
      return [];
    }
  },

  // Admin: Get all withdrawal requests
  async getWithdrawalRequests() {
    try {
      const { data, error } = await (supabase as any)
        .from('withdrawal_requests')
        .select(`
          *,
          profile:profiles!user_id(full_name, phone, bank_name, account_name, account_number, iban)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (e) {
      console.warn("Error fetching withdrawal requests:", e);
      return [];
    }
  },

  // Admin: Process withdrawal request (approve/reject)
  async processWithdrawalRequest(requestId: number, status: 'approved' | 'rejected', proofUrl?: string, adminNotes?: string) {
    try {
      const updateData: any = { status };
      if (proofUrl) updateData.proof_image_url = proofUrl;
      if (adminNotes) updateData.admin_notes = adminNotes;

      const { data, error } = await (supabase as any)
        .from('withdrawal_requests')
        .update(updateData)
        .eq('id', requestId)
        .select()
        .single();

      if (error) throw error;

      // If approved, create a financial transaction linking to wallet withdrawal
      if (status === 'approved' && data) {
        await (supabase as any)
          .from('financial_transactions')
          .insert([{
            wallet_id: data.wallet_id,
            amount: -Number(data.amount), // Debit from wallet
            transaction_type: 'withdrawal',
            description: 'تم سحب الأرباح لحسابكم البنكي'
          }]);
      }

      return true;
    } catch (e) {
      console.error("Error processing withdrawal:", e);
      throw e;
    }
  },

  // Admin: Get all shipper payment proofs
  async getPendingShipperPayments() {
    try {
      const { data, error } = await (supabase as any)
        .from('shipper_payments')
        .select(`
          *,
          shipper:profiles!shipper_id(full_name, phone, email)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (e) {
      console.warn("Error fetching shipper payments:", e);
      return [];
    }
  },

  // Admin: Process shipper payment request (approve/reject)
  async processShipperPayment(paymentId: number, status: 'approved' | 'rejected', adminNotes?: string) {
    try {
      // 1. Get the payment request
      const { data: payment, error: fetchError } = await (supabase as any)
        .from('shipper_payments')
        .select('*')
        .eq('id', paymentId)
        .single();

      if (fetchError) throw fetchError;

      // 2. Update status
      const { error: updateError } = await (supabase as any)
        .from('shipper_payments')
        .update({
          status,
          admin_notes: adminNotes,
          processed_at: new Date().toISOString()
        })
        .eq('id', paymentId);

      if (updateError) throw updateError;

      // 3. If approved, create financial transaction to credit wallet
      if (status === 'approved') {
        const { data: wallets } = await (supabase as any)
          .from('wallets')
          .select('wallet_id')
          .eq('user_id', payment.shipper_id)
          .limit(1);

        if (wallets && wallets.length > 0) {
          const walletId = wallets[0].wallet_id;

          await (supabase as any)
            .from('financial_transactions')
            .insert({
              wallet_id: walletId,
              amount: Math.abs(payment.amount), // Add amount to wallet (pay debt)
              type: 'credit',
              description: `سداد مديونية - إيصال رقم ${paymentId}`,
              status: 'completed'
            });
        }
      }

      return true;
    } catch (e) {
      console.error("Error processing shipper payment:", e);
      throw e;
    }
  },

  async addSubDriver(driverData: any, ownerId: string) {
    const { data, error } = await supabase
      .from('sub_drivers')
      .insert([{ ...driverData, owner_id: ownerId }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteSubDriver(driverId: string) {
    const { error } = await supabase
      .from('sub_drivers')
      .delete()
      .eq('id', driverId);
    if (error) throw error;
    return true;
  },

  async submitMaintenanceRequest(payload: any) {
    const { data, error } = await supabase
      .from('maintenance_requests' as any)
      .insert([payload])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async cancelBid(bidId: string) {
    const { error } = await (supabase as any)
      .from('bids')
      .delete()
      .eq('id', bidId);
    if (error) throw error;
    return true;
  },

  async getCarrierMaintenanceRequests(carrierId: string) {
    const { data, error } = await supabase
      .from('maintenance_requests' as any)
      .select(`
        *,
        truck:trucks(plate_number, brand),
        driver:profiles!maintenance_requests_driver_id_fkey(full_name, phone)
      `)
      .eq('carrier_id', carrierId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async getDriverMaintenanceRequests(driverId: string) {
    const { data, error } = await supabase
      .from('maintenance_requests' as any)
      .select(`
        *,
        truck:trucks(plate_number, brand)
      `)
      .eq('driver_id', driverId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async updateMaintenanceStatus(requestId: string, status: string) {
    const { error } = await supabase
      .from('maintenance_requests' as any)
      .update({ status })
      .eq('id', requestId);
    if (error) throw error;
    return true;
  },

  async getFinancialChartData() {
    try {
      // نجلب فقط عمليات العمولات لآخر 30 يوم
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: commissions } = await (supabase as any)
        .from('financial_transactions')
        .select('amount, created_at')
        .eq('transaction_type', 'commission')
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: true });

      // تجميع افتراضي آخر 7 أيام عشان لو مفيش דاتا كفاية
      const days = ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7'];
      let chartData = days.map((day, ix) => ({ name: day, revenue: 0, expected: 1000 + (ix * 200) })); // Target وهمي 

      if (commissions && commissions.length > 0) {
        // لو في داتا، نجمع بناء على التواريخ
        const grouped = commissions.reduce((acc: any, curr: any) => {
          const date = new Date(curr.created_at).toLocaleDateString('ar-SA', { day: 'numeric', month: 'short' });
          if (!acc[date]) acc[date] = 0;
          acc[date] += Number(curr.amount);
          return acc;
        }, {});

        // تحويلها لـ Array مخصصة للتشارت
        chartData = Object.keys(grouped).map(date => ({
          name: date,
          revenue: grouped[date],
          expected: grouped[date] * 1.25 // نفترض أن المستهدف أعلى 25% من الفعلي كمثال
        })).slice(-10); // ناخذ آخر 10 أيام بس
      }

      return chartData;
    } catch (e) {
      console.error(e);
      return [];
    }
  },

  // =========================
  // 🏢 إدارة الأسطول والمنتجات
  // =========================

  async getTrucks(userId: string) {
    const { data } = await supabase.from('trucks').select('*').eq('owner_id', userId);
    return data || [];
  },

  async getSubDrivers(userId: string) {
    const { data } = await supabase.from('sub_drivers').select('*, trucks(*)').eq('carrier_id', userId);
    return data || [];
  },

  async getSavedLocations(userId: string) {
    const { data, error } = await (supabase as any)
      .from('saved_locations')
      .select('*')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async saveLocation(userId: string, locationData: { name: string, address: string }) {
    const { error } = await (supabase as any).from('saved_locations').insert([
      { owner_id: userId, location_name: locationData.name, address_details: locationData.address }
    ]);
    if (error) throw error;
    return true;
  },

  async updateSavedLocation(locationId: string, locationData: { name: string, address: string }) {
    const { error } = await (supabase as any).from('saved_locations').update({
      location_name: locationData.name,
      address_details: locationData.address
    }).eq('id', locationId);
    if (error) throw error;
    return true;
  },

  async deleteSavedLocation(locationId: string) {
    const { error } = await (supabase as any).from('saved_locations').delete().eq('id', locationId);
    if (error) throw error;
    return true;
  },

  async getShipperStats(userId: string) {
    const { data: loads, error } = await supabase
      .from('loads')
      .select('status')
      .eq('owner_id', userId);

    if (error || !loads) return { activeLoads: 0, completedTrips: 0, pendingLoads: 0, cancelledLoads: 0 };

    return {
      activeLoads: loads.filter(l => l.status === 'in_progress').length,
      completedTrips: loads.filter(l => l.status === 'completed').length,
      pendingLoads: loads.filter(l => l.status === 'available' || l.status === 'pending').length,
      cancelledLoads: loads.filter(l => l.status === 'cancelled').length,
    };
  },

  async getUserLoads(userId: string) {
    const { data, error } = await supabase
      .from('loads')
      .select('*, owner:profiles!loads_owner_id_fkey(*), driver:profiles!loads_driver_id_fkey(*)')
      .or(`owner_id.eq.${userId},driver_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getBids(userId: string, role: 'driver' | 'shipper') {
    if (role === 'driver') {
      const { data } = await supabase.from('load_bids').select('*, loads(*, owner:profiles!loads_owner_id_fkey(*))').eq('driver_id', userId);
      return data || [];
    } else {
      const { data: bids } = await supabase.from('load_bids').select(`*, loads!inner(*)`).eq('loads.owner_id', userId);
      return bids || [];
    }
  },

  async acceptBid(loadId: string, driverId: string, price: number, ownerId: string) {
    const { error: loadError } = await supabase
      .from('loads')
      .update({ status: 'in_progress', driver_id: driverId, price: price })
      .eq('id', loadId);
    if (loadError) throw loadError;

    await supabase.from('load_bids').update({ status: 'rejected' }).eq('load_id', loadId).neq('driver_id', driverId);
    await supabase.from('load_bids').update({ status: 'accepted' }).eq('load_id', loadId).eq('driver_id', driverId);

    // Create financial record
    try {
      const { financeApi } = await import('@/lib/finances');
      await financeApi.createShipmentFinance({
        shipment_id: loadId,
        shipper_id: ownerId,
        carrier_id: driverId,
        shipment_price: price,
        commission_rate: 15 // Default 15% commission
      });
    } catch (e) {
      console.error('Error creating financial record:', e);
      // We don't throw here to avoid failing the whole acceptance if only the finance record fails, 
      // though in a real system this should be an atomic transaction.
    }

    return true;
  },

  async rejectBid(bidId: string) {
    const { error } = await supabase
      .from('load_bids')
      .update({ status: 'rejected' })
      .eq('id', bidId);
    if (error) throw error;
    return true;
  },

  async getDriverStats(userId: string) {
    const { data: loads } = await supabase.from('loads').select('status').eq('driver_id', userId);
    const { count: bidsCount } = await supabase.from('load_bids').select('*', { count: 'exact', head: true }).eq('driver_id', userId);

    const activeLoads = loads ? loads.filter((l: any) => l.status === 'in_progress').length : 0;
    const completedTrips = loads ? loads.filter((l: any) => l.status === 'completed').length : 0;

    return {
      activeLoads,
      completedTrips,
      rating: 4.8,
      bidsCount: bidsCount || 0
    };
  }
};