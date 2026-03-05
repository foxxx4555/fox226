import { ReactNode, useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Users, Truck, Settings, LogOut, Menu, X, ShieldCheck, User, Star, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { AdminRole, RolePermissions } from "@/types/roles";
import { supabase } from "@/lib/supabase";
import { toast } from 'sonner';

export default function AdminLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { userProfile, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [userRole, setUserRole] = useState<AdminRole | null>(null);
  const [loadingRole, setLoadingRole] = useState(true);

  useEffect(() => {
    // 1. Fetch Admin Role
    const fetchRole = async () => {
      if (!userProfile?.id) {
        setLoadingRole(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userProfile.id)
          .single();

        if (data?.role) {
          // Map database role to component role
          const roleMap: Record<string, AdminRole> = {
            'super_admin': 'Super Admin',
            'operations': 'Operations',
            'carrier_manager': 'Carrier Manager',
            'vendor_manager': 'Vendor Manager',
            'support': 'Buyer Support',
            'finance': 'Finance',
            'analytics': 'Analytics',
            'admin': 'Admin'
          };

          setUserRole(roleMap[data.role] || 'Admin');
        } else {
          setUserRole('Admin'); // Fallback for old admins without explicit role
        }
      } catch (err) {
        console.error("Error fetching admin role:", err);
        setUserRole('Admin');
      } finally {
        setLoadingRole(false);
      }
    };

    fetchRole();

    // استماع لحظي لتسجيل سائق جديد والتنبيه الصوتي للإدارة
    const adminSubscription = supabase
      .channel('new-driver-alert')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'profiles' },
        (payload) => {
          try {
            const newDriverNotification = new Audio('/notification.mp3');
            newDriverNotification.play().catch(() => { });
          } catch (e) { }

          toast.info(`سائق جديد سجل الآن: ${payload.new.full_name || 'بدون اسم'} وبانتظار التوثيق! 🚛`, {
            duration: 8000,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(adminSubscription);
    };
  }, [userProfile]);
  // Define navigation items with their required roles exactly as per the provided matrix
  const navItems = [
    { label: "لوحة التحكم الرئيسية", path: "/admin/dashboard", icon: <LayoutDashboard size={20} />, roles: ["Super Admin", "Operations", "Carrier Manager", "Vendor Manager", "Buyer Support", "Finance", "Analytics", "Admin"] as AdminRole[] },

    // إدارة الشحنات: Super Admin, Operations, Buyer Support, Admin
    { label: "إدارة الشحنات", path: "/admin/loads", icon: <Truck size={20} />, roles: ["Super Admin", "Operations", "Buyer Support", "Admin"] as AdminRole[] },

    // إدارة الناقلين: Super Admin, Carrier Manager, Admin
    { label: "إدارة الناقلين (المركبات والسائقين)", path: "/admin/drivers", icon: <Truck size={20} />, roles: ["Super Admin", "Carrier Manager", "Admin"] as AdminRole[] },

    // إدارة المستخدمين: Super Admin, Buyer Support, Vendor Manager, Admin
    { label: "إدارة المستخدمين", path: "/admin/users", icon: <Users size={20} />, roles: ["Super Admin", "Buyer Support", "Vendor Manager", "Admin"] as AdminRole[] },

    // المدفوعات والفوترة: Super Admin, Finance, Admin
    { label: "العمليات المالية", path: "/admin/finance", icon: <Settings size={20} />, roles: ["Super Admin", "Finance", "Admin"] as AdminRole[] },

    // التقارير والتحليلات: All roles
    { label: "التقارير والجداول", path: "/admin/reports", icon: <Settings size={20} />, roles: ["Super Admin", "Operations", "Carrier Manager", "Vendor Manager", "Buyer Support", "Finance", "Analytics", "Admin"] as AdminRole[] },

    // تحليلات الأسطول المتقدمة: Phase 3
    { label: "تحليلات الأسطول (BI)", path: "/admin/analytics", icon: <Activity size={20} />, roles: ["Super Admin", "Analytics", "Admin"] as AdminRole[] },

    // الأمان والتدقيق (إدارة مسؤولي النظام): Super Admin ONLY
    { label: "إدارة مسؤولي النظام", path: "/admin/admins", icon: <ShieldCheck size={20} />, roles: ["Super Admin"] as AdminRole[] },

    // تقييمات السائقين: Super Admin, Operations, Buyer Support, Admin
    { label: "تقييم السائقين", path: "/admin/ratings", icon: <Star size={20} />, roles: ["Super Admin", "Operations", "Buyer Support", "Admin"] as AdminRole[] },

    { label: "إشعارات هامة", path: "/admin/alerts", icon: <Settings size={20} />, roles: ["Super Admin", "Operations", "Admin"] as AdminRole[] },
    { label: "مركز الدعم والبلاغات", path: "/admin/support", icon: <Settings size={20} />, roles: ["Super Admin", "Buyer Support", "Operations", "Admin"] as AdminRole[] },
    { label: "إعدادات النظام", path: "/admin/settings", icon: <Settings size={20} />, roles: ["Super Admin"] as AdminRole[] },
  ];

  const filteredNavItems = navItems.filter(item =>
    userRole ? item.roles.includes(userRole) : false
  );

  return (
    <div className="min-h-screen flex bg-slate-50" dir="rtl">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:static inset-y-0 right-0 z-50 w-72 bg-[#0f172a] text-white flex flex-col transition-transform duration-300",
          open ? "translate-x-0" : "translate-x-full lg:translate-x-0"
        )}
      >
        <div className="p-8 border-b border-white/5 flex justify-between items-center">
          <h1 className="font-black text-xl flex items-center gap-2">
            <ShieldCheck size={24} />
            إدارة النظام
          </h1>
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(false)}>
            <X />
          </Button>
        </div>

        <nav className="flex-1 p-6 space-y-2 overflow-y-auto">
          {loadingRole ? (
            <div className="flex flex-col gap-3">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-14 bg-white/5 animate-pulse rounded-2xl w-full"></div>
              ))}
            </div>
          ) : (
            filteredNavItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-4 px-5 py-4 rounded-2xl font-bold transition-all",
                  location.pathname === item.path
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                )}
              >
                {item.icon} {item.label}
              </Link>
            ))
          )}
        </nav>

        <div className="p-6 border-t border-white/5">
          <Button
            variant="ghost"
            className="w-full justify-start gap-4 text-rose-400 font-black h-14 rounded-2xl"
            onClick={logout}
          >
            <LogOut size={20} /> خروج
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-20 bg-white border-b px-6 flex items-center justify-between shadow-sm shrink-0">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(true)}>
            <Menu size={28} className="text-blue-600" />
          </Button>

          <div className="flex items-center gap-3 mr-auto bg-slate-50 border border-slate-100 py-1.5 px-3 rounded-full">
            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
              {userRole?.charAt(0) || 'U'}
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-black text-slate-800">{userProfile?.full_name || 'مسؤول'}</span>
              <span className="text-[10px] font-bold text-slate-500">{userRole || 'جاري التحميل...'}</span>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-10 bg-[#f8fafc]">
          {children}
        </div>
      </main>
    </div>
  );
}
