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
          <h1 class
