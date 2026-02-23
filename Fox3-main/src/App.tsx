import { useEffect, useState } from 'react';
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "@/components/ProtectedRoute";
import { supabase } from '@/integrations/supabase/client';
import { Loader2, ShieldAlert } from 'lucide-react';

// --- الصفحات العامة ---
import WelcomePage from "./pages/WelcomePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import NotFound from "./pages/NotFound";

// --- صفحات السائق ---
import DriverDashboard from "./pages/driver/DriverDashboard";
import DriverLoads from "./pages/driver/DriverLoads";
import DriverTrucks from "./pages/driver/DriverTrucks";
import DriverAccount from "./pages/driver/DriverAccount";
import DriverTasks from "./pages/driver/DriverTasks";
import DriverHistory from "./pages/driver/DriverHistory";
import DriverMessaging from "./pages/driver/DriverMessaging";
import DriverTrack from "./pages/driver/DriverTrack";
import DriverPrintWaybill from "./pages/driver/DriverPrintWaybill";
import UserSupport from "./pages/shared/UserSupport";

// --- صفحات التاجر (الشاحن) ---
import ShipperDashboard from "./pages/shipper/ShipperDashboard";
import ShipperPostLoad from "./pages/shipper/ShipperPostLoad";
import ShipperLoads from "./pages/shipper/ShipperLoads";
import ShipperDrivers from "./pages/shipper/ShipperDrivers";
import ShipperHistory from "./pages/shipper/ShipperHistory";
import ShipperTrack from "./pages/shipper/ShipperTrack";
import ShipperAccount from "./pages/shipper/ShipperAccount";
import ShipperStatement from "./pages/shipper/ShipperStatement";
import ShipperMessaging from "./pages/shipper/ShipperMessaging";

// --- صفحات الإدارة ---
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminLoads from "./pages/admin/AdminLoads";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminAdmins from "./pages/admin/AdminAdmins";
import AdminAlerts from "./pages/admin/AdminAlerts";
import AdminSupport from "./pages/admin/AdminSupport";
import AdminDrivers from "./pages/admin/AdminDrivers";
import AdminFinance from "./pages/admin/AdminFinance";
import AdminReports from "./pages/admin/AdminReports";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => {
  const [systemActive, setSystemActive] = useState<boolean | null>(null);

  useEffect(() => {
    let isMounted = true;

    // 🔒 فحص حالة النظام من سوبابيز (مفتاح الأمان)
    const checkStatus = async () => {
      try {
        const { data, error } = await supabase
          .from('system_status' as any)
          .select('is_active')
          .maybeSingle();

        if (isMounted) {
          // لو القيمة false يقفل السيستم، لو true أو مش موجود يفتح عادي
          setSystemActive((data as any)?.is_active ?? true);
        }
      } catch (e) {
        if (isMounted) setSystemActive(true);
      }
    };

    checkStatus();
    document.documentElement.dir = 'rtl';
    document.documentElement.lang = 'ar';

    return () => { isMounted = false; };
  }, []);

  // 🛑 شاشة التوقف (تظهر فقط إذا جعلت is_active = false في سوبابيز)
  if (systemActive === false) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-[#0a0c10] text-white p-6 text-center" dir="rtl">
        <div className="bg-rose-500/10 p-6 rounded-full mb-6">
          <ShieldAlert size={80} className="text-rose-500 animate-pulse" />
        </div>
        <h1 className="text-3xl font-black mb-4">النظام متوقف حالياً</h1>
        <p className="text-slate-400 max-w-md leading-relaxed">
          عذراً، انتهت الفترة التجريبية للنظام أو تم تعليق الصلاحية مؤقتاً.
          يرجى التواصل مع المطور (محمد) لتفعيل النظام ومتابعة العمل.
        </p>
        <div className="mt-8 p-4 bg-white/5 rounded-2xl border border-white/10 font-mono text-xs text-rose-400">
          Error: LICENCE_EXPIRED_OR_SUSPENDED
        </div>
      </div>
    );
  }

  // 🔄 شاشة التحميل عند فتح التطبيق
  if (systemActive === null) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#0a0c10]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-blue-600" size={48} />
          <p className="text-white/50 font-bold animate-pulse">جاري فحص النظام...</p>
        </div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Sonner position="top-center" richColors />
        <BrowserRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <Routes>
            {/* المسارات العامة */}
            <Route path="/" element={<WelcomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />

            {/* المسارات المحمية (تحتاج تسجيل دخول) */}
            <Route element={<ProtectedRoute />}>

              {/* --- قسم السائق --- */}
              <Route path="/driver/dashboard" element={<DriverDashboard />} />
              <Route path="/driver/loads" element={<DriverLoads />} />
              <Route path="/driver/tasks" element={<DriverTasks />} />
              <Route path="/driver/trucks" element={<DriverTrucks />} />
              <Route path="/driver/history" element={<DriverHistory />} />
              <Route path="/driver/messaging" element={<DriverMessaging />} />
              <Route path="/driver/track" element={<DriverTrack />} />
              <Route path="/driver/waybill" element={<DriverPrintWaybill />} />
              <Route path="/driver/account" element={<DriverAccount />} />
              <Route path="/driver/support" element={<UserSupport />} />

              {/* --- قسم التاجر (الشاحن) --- */}
              <Route path="/shipper/dashboard" element={<ShipperDashboard />} />
              <Route path="/shipper/post" element={<ShipperPostLoad />} />
              <Route path="/shipper/loads" element={<ShipperLoads />} />
              <Route path="/shipper/drivers" element={<ShipperDrivers />} />
              <Route path="/shipper/history" element={<ShipperHistory />} />
              <Route path="/shipper/statement" element={<ShipperStatement />} />
              <Route path="/shipper/messaging" element={<ShipperMessaging />} />
              <Route path="/shipper/track" element={<ShipperTrack />} />
              <Route path="/shipper/account" element={<ShipperAccount />} />
              <Route path="/shipper/support" element={<UserSupport />} />

              {/* --- قسم الإدارة --- */}
              <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/admin/users" element={<AdminUsers />} />
              <Route path="/admin/loads" element={<AdminLoads />} />
              <Route path="/admin/settings" element={<AdminSettings />} />
              <Route path="/admin/admins" element={<AdminAdmins />} />
              <Route path="/admin/alerts" element={<AdminAlerts />} />
              <Route path="/admin/support" element={<AdminSupport />} />
              <Route path="/admin/drivers" element={<AdminDrivers />} />
              <Route path="/admin/finance" element={<AdminFinance />} />
              <Route path="/admin/reports" element={<AdminReports />} />

            </Route>

            {/* صفحة الخطأ 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
