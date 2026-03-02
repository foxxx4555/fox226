import { ReactNode, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Users, Truck, Settings, LogOut, Menu, X, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { logout } = useAuth();
  const [open, setOpen] = useState(false);

  const navItems = [
    { label: "الرئيسية", path: "/admin", icon: <LayoutDashboard size={20} /> },
    { label: "المستخدمين", path: "/admin/users", icon: <Users size={20} /> },
    { label: "الشحنات", path: "/admin/loads", icon: <Truck size={20} /> },
    { label: "الإعدادات", path: "/admin/settings", icon: <Settings size={20} /> },
  ];

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
          <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
            لوحة الإدارة
          </h1>
          <Button variant="ghost" size="icon" className="lg:hidden text-slate-400 hover:text-white" onClick={() => setOpen(false)}>
            <X size={20} />
          </Button>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-bold",
                  isActive
                    ? "bg-blue-600 shadow-lg shadow-blue-500/20 text-white"
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                )}
                onClick={() => setOpen(false)}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/5">
          <Button
            variant="ghost"
            className="w-full justify-start text-rose-400 hover:text-rose-300 hover:bg-rose-400/10 font-bold h-12 rounded-xl"
            onClick={logout}
          >
            <LogOut size={20} className="me-3" />
            تسجيل الخروج
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 transition-all duration-300 bg-slate-50/50">
        <header className="h-20 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 sticky top-0 z-40 px-4 md:px-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="lg:hidden text-slate-600" onClick={() => setOpen(true)}>
              <Menu size={24} />
            </Button>
            <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-full">
              <ShieldCheck className="text-slate-500" size={18} />
              <span className="text-sm font-bold text-slate-600">بيئة الإدارة المحمية</span>
            </div>
          </div>
        </header>

        <div className="flex-1 p-4 md:p-8 overflow-y-auto w-full">
          <div className="mx-auto max-w-7xl animate-in fade-in zoom-in-95 duration-300 py-6">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
