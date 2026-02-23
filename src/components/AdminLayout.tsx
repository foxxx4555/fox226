import { ReactNode, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Users, Truck, Settings, LogOut, Menu, X, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { AdminRole, RolePermissions } from "@/types/roles";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { logout } = useAuth();
  const [open, setOpen] = useState(false);

  // Note: We'll retrieve the actual role from the user's profile later (e.g. from useAuth)
  // For now, we simulate a 'Super Admin' role to show all items during development.
  const userRole: AdminRole = 'Super Admin';

  const navItems = [
    { label: "لوحة التحكم الرئيسية", path: "/admin", icon: <LayoutDashboard size={20} />, roles: ["Super Admin", "Operations Manager", "Carrier Manager", "Vendor Manager", "Buyer Manager", "Support", "Finance", "Analytics"] as AdminRole[] },
    { label: "إشعارات هامة", path: "/admin/alerts", icon: <Settings size={20} />, roles: ["Super Admin", "Operations Manager"] as AdminRole[] },
    { label: "إدارة المستخدمين", path: "/admin/users", icon: <Users size={20} />, roles: ["Super Admin"] as AdminRole[] },
    { label: "إدارة الشحنات", path: "/admin/loads", icon: <Truck size={20} />, roles: RolePermissions.manage_loads },
    { label: "إدارة مسؤولي النظام", path: "/admin/admins", icon: <ShieldCheck size={20} />, roles: RolePermissions.manage_security },
    { label: "مركز الدعم والبلاغات", path: "/admin/support", icon: <Settings size={20} />, roles: RolePermissions.manage_support },
    { label: "إدارة المركبات والسائقين", path: "/admin/drivers", icon: <Truck size={20} />, roles: RolePermissions.manage_carriers },
    { label: "العمليات المالية", path: "/admin/finance", icon: <Settings size={20} />, roles: RolePermissions.manage_finance },
    { label: "التقارير والتحليلات", path: "/admin/reports", icon: <Settings size={20} />, roles: RolePermissions.view_reports },
    { label: "إعدادات النظام", path: "/admin/settings", icon: <Settings size={20} />, roles: ["Super Admin"] as AdminRole[] },
  ];

  const filteredNavItems = navItems.filter(item =>
    item.roles.includes(userRole)
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
          {filteredNavItems.map((item) => (
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
          ))}
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
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-10 bg-[#f8fafc]">
          {children}
        </div>
      </main>
    </div>
  );
}
