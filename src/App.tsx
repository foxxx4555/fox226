import { useEffect, useState } from 'react';
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import ProtectedRoute from "@/components/ProtectedRoute";
import { supabase } from '@/integrations/supabase/client';
import { Loader2, ShieldAlert, Lock } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { ThemeProvider } from "@/components/theme-provider";

// --- المراقبة اللحظية الشاملة للإيقاف ---
function GlobalSuspensionWatcher() {
  const { userProfile, isAuthenticated } = useAuth();
  const [isSuspended, setIsSuspended] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !userProfile?.id) return;

    // الفحص الاحتياطي لو كان محظور بالفعل يدخله فورا
    if (userProfile.status === 'suspended') {
      setIsSuspended(true);
      setTimeout(() => {
        supabase.auth.signOut().then(() => {
          window.location.href = '/suspended-page';
        });
      }, 3000);
      return;
    }

    const userStatusSubscription = supabase
      .channel('global-status-watcher')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${userProfile.id}`
        },
        (payload: any) => {
          if (payload.new && payload.new.status === 'suspended') {
            // 1. شغل صوت التنبيه
            try {
              const audio = new Audio('/alert_death_sound.mp3');
              audio.play().catch(e => console.log('صوت الطرد لم يعمل تلقائيا بسبب سياسة المتصفح', e));
            } catch (err) { }

            // 2. إظهار الشاشة الحمراء فوق كل شيء
            setIsSuspended(true);

            // 3. مسح الجلسة وتوجيهه بعد 3 ثواني
            setTimeout(() => {
              supabase.auth.signOut().then(() => {
                window.location.href = '/suspended-page';
              });
            }, 3000);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(userStatusSubscription);
    }
  }, [userProfile?.id, isAuthenticated, userProfile?.status]);

  if (!isSuspended) return null;

  return (
    <div className="fixed inset-0 bg-rose-950 z-[99999] flex flex-col items-center justify-center text-white" dir="rtl">
      <div className="bg-rose-500/20 p-8 rounded-full mb-6">
        <Lock size={100} className="text-rose-500 animate-pulse" />
      </div>
      <h1 className="text-4xl md:text-6xl font-black mb-4">إنذار النظام</h1>
      <p className="text-xl md:text-2xl text-rose-200 font-bold mb-8">تم إيقاف حسابك الآن للتو من قبل الإدارة!</p>
      <Loader2 size={40} className="animate-spin text-rose-500" />
      <p className="mt-4 text-sm text-slate-400 font-mono">جاري طردك من النظام...</p>
    </div>
  );
}

// --- الصفحات العامة ---
import WelcomePage from "./pages/WelcomePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import NotFound from "./pages/NotFound";
import SuspendedPage from "./pages/shared/SuspendedPage";
import PublicTrackingPage from "./pages/PublicTrackingPage";

import AdminProtectedRoute from "./components/AdminProtectedRoute";

// --- صفحات السائق ---
import DriverDashboard from "./pages/driver/DriverDashboard";
import DriverLoads from "./pages/driver/DriverLoads";
import DriverTrucks from "./pages/driver/DriverTrucks";
import DriverBids from "./pages/driver/DriverBids";
import DriverAccount from "./pages/driver/DriverAccount";
import DriverTasks from "./pages/driver/DriverTasks";
import DriverHistory from "./pages/driver/DriverHistory";
import DriverMessaging from "./pages/driver/DriverMessaging";
import DriverTrack from "./pages/driver/DriverTrack";
import DriverPrintWaybill from "./pages/driver/DriverPrintWaybill";
import UserSupport from "./pages/shared/UserSupport";
import DriverAddDriver from "./pages/driver/DriverAddDriver";
import DriverStatement from "./pages/driver/DriverStatement";

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
import ShipperLocations from "./pages/shipper/ShipperLocations";
import ShipperAddProduct from "./pages/shipper/ShipperAddProduct";
import ShipperAddReceiver from "./pages/shipper/ShipperAddReceiver";
import ShipperWaybills from "./pages/shipper/ShipperWaybills";
import ShipperBids from "./pages/shipper/ShipperBids";

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
import AdminAnalytics from "./pages/admin/AdminAnalytics";
import AdminDriverRatings from "./pages/admin/AdminDriverRatings";
import AdminShippersDrivers from "./pages/admin/AdminShippersDrivers";
import AddAdminById from "./pages/admin/AddAdminById";
import DriverMaintenance from "@/pages/driver/DriverMaintenance";

const ShipmentsRedirect = () => {
  const { userProfile, currentRole } = useAuth();
  const { id } = useParams();

  if (!userProfile) return <Navigate to="/login" replace />;

  // توجيه ذكي بناءً على دور المستخدم
  if (currentRole === 'driver') {
    return <Navigate to="/driver/track" state={{ shipmentId: id }} replace />;
  } else {
    return <Navigate to="/shipper/track" state={{ shipmentId: id }} replace />;
  }
};

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
    <ThemeProvider defaultTheme="light" storageKey="fox-logistics-theme">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Sonner position="top-center" richColors />
          <BrowserRouter
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true,
            }}
          >
            <GlobalSuspensionWatcher />
            <Routes>
              {/* المسارات العامة */}
              <Route path="/" element={<WelcomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/suspended-page" element={<SuspendedPage />} />
              <Route path="/tracking" element={<PublicTrackingPage />} />

              {/* المسارات المحمية (تحتاج تسجيل دخول) */}
              <Route element={<ProtectedRoute />}>

                {/* --- قسم السائق --- */}
                <Route path="/driver/dashboard" element={<DriverDashboard />} />
                <Route path="/driver/loads" element={<DriverLoads />} />
                <Route path="/driver/trucks" element={<DriverTrucks />} />
                <Route path="/driver/bids" element={<DriverBids />} />
                <Route path="/driver/tasks" element={<DriverTasks />} />
                <Route path="/driver/history" element={<DriverHistory />} />
                <Route path="/driver/messaging" element={<DriverMessaging />} />
                <Route path="/driver/messages" element={<DriverMessaging />} />
                <Route path="/driver/track" element={<DriverTrack />} />
                <Route path="/driver/waybill" element={<DriverPrintWaybill />} />
                <Route path="/driver/account" element={<DriverAccount />} />
                <Route path="/driver/support" element={<UserSupport />} />
                <Route path="/driver/add-driver" element={<DriverAddDriver />} />
                <Route path="/driver/statement" element={<DriverStatement />} />
                <Route path="/driver/maintenance" element={<DriverMaintenance />} />

                {/* --- قسم التاجر (الشاحن) --- */}
                <Route path="/shipper/dashboard" element={<ShipperDashboard />} />
                <Route path="/shipper/post" element={<ShipperPostLoad />} />
                <Route path="/shipper/loads" element={<ShipperLoads />} />
                <Route path="/shipper/bids" element={<ShipperBids />} />
                <Route path="/shipper/waybills" element={<ShipperWaybills />} />
                <Route path="/shipper/drivers" element={<ShipperDrivers />} />
                <Route path="/shipper/history" element={<ShipperHistory />} />
                <Route path="/shipper/statement" element={<ShipperStatement />} />
                <Route path="/shipper/messaging" element={<ShipperMessaging />} />
                <Route path="/shipper/track" element={<ShipperTrack />} />
                <Route path="/shipper/account" element={<ShipperAccount />} />
                <Route path="/shipper/locations" element={<ShipperLocations />} />
                <Route path="/shipper/products" element={<ShipperAddProduct />} />
                <Route path="/shipper/receivers" element={<ShipperAddReceiver />} />
                <Route path="/shipper/support" element={<UserSupport />} />

                {/* --- قسم الإدارة --- */}
                <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />

                <Route path="/admin/dashboard" element={
                  <AdminProtectedRoute allowedRoles={['Super Admin', 'Operations', 'Carrier Manager', 'Vendor Manager', 'Buyer Support', 'Finance', 'Analytics', 'Admin']}>
                    <AdminDashboard />
                  </AdminProtectedRoute>
                } />

                <Route path="/admin/analytics" element={
                  <AdminProtectedRoute allowedRoles={['Super Admin', 'Analytics', 'Admin']}>
                    <AdminAnalytics />
                  </AdminProtectedRoute>
                } />

                <Route path="/admin/users" element={
                  <AdminProtectedRoute allowedRoles={['Super Admin', 'Buyer Support', 'Vendor Manager', 'Admin']}>
                    <AdminUsers />
                  </AdminProtectedRoute>
                } />

                <Route path="/admin/shippers-drivers" element={
                  <AdminProtectedRoute allowedRoles={['Super Admin', 'Buyer Support', 'Vendor Manager', 'Admin']}>
                    <AdminShippersDrivers />
                  </AdminProtectedRoute>
                } />

                <Route path="/admin/loads" element={
                  <AdminProtectedRoute allowedRoles={['Super Admin', 'Operations', 'Buyer Support', 'Admin']}>
                    <AdminLoads />
                  </AdminProtectedRoute>
                } />

                <Route path="/admin/settings" element={
                  <AdminProtectedRoute allowedRoles={['Super Admin']}>
                    <AdminSettings />
                  </AdminProtectedRoute>
                } />

                <Route path="/admin/admins" element={
                  <AdminProtectedRoute allowedRoles={['Super Admin']}>
                    <AdminAdmins />
                  </AdminProtectedRoute>
                } />

                <Route path="/admin/ratings" element={
                  <AdminProtectedRoute allowedRoles={['Super Admin', 'Operations', 'Buyer Support', 'Admin']}>
                    <AdminDriverRatings />
                  </AdminProtectedRoute>
                } />

                <Route path="/admin/alerts" element={
                  <AdminProtectedRoute allowedRoles={['Super Admin', 'Operations', 'Admin']}>
                    <AdminAlerts />
                  </AdminProtectedRoute>
                } />

                <Route path="/admin/support" element={
                  <AdminProtectedRoute allowedRoles={['Super Admin', 'Buyer Support', 'Operations', 'Admin']}>
                    <AdminSupport />
                  </AdminProtectedRoute>
                } />

                <Route path="/admin/drivers" element={
                  <AdminProtectedRoute allowedRoles={['Super Admin', 'Carrier Manager', 'Admin']}>
                    <AdminDrivers />
                  </AdminProtectedRoute>
                } />

                <Route path="/admin/finance" element={
                  <AdminProtectedRoute allowedRoles={['Super Admin', 'Finance', 'Admin']}>
                    <AdminFinance />
                  </AdminProtectedRoute>
                } />


                <Route path="/admin/reports" element={
                  <AdminProtectedRoute allowedRoles={['Super Admin', 'Operations', 'Carrier Manager', 'Vendor Manager', 'Buyer Support', 'Finance', 'Analytics', 'Admin']}>
                    <AdminReports />
                  </AdminProtectedRoute>
                } />

                <Route path="/admin/ratings" element={
                  <AdminProtectedRoute allowedRoles={['Super Admin', 'Operations', 'Buyer Support', 'Admin']}>
                    <AdminDriverRatings />
                  </AdminProtectedRoute>
                } />

                {/* Temporary Route for Admin Addition */}
                <Route path="/admin/force-add-admin" element={
                  <AdminProtectedRoute allowedRoles={['Super Admin']}>
                    <AddAdminById />
                  </AdminProtectedRoute>
                } />

                <Route path="/loads/:id" element={<ShipmentsRedirect />} />

              </Route>

              {/* صفحة الخطأ 404 */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
};

export default App;
