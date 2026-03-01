import { useAuth } from '@/hooks/useAuth';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Loader2, ShieldAlert } from 'lucide-react';
import { UserRole } from '@/types';
import { Button } from '@/components/ui/button';

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
}

export default function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, loading, userProfile, logout } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-background gap-4">
        <div className="relative">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
        </div>
        <p className="text-sm font-bold text-muted-foreground animate-pulse tracking-widest uppercase">SAS Transport</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // --- شاشة الإيقاف المؤقت (حظر المستخدمين الموقوفين من الوصول) ---
  if (userProfile?.status === 'suspended') {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-slate-50 gap-4 p-6 text-center" dir="rtl">
        <div className="bg-rose-500/10 p-6 rounded-full mb-6">
          <ShieldAlert size={80} className="text-rose-600 animate-pulse" />
        </div>
        <h1 className="text-4xl font-black mb-4 text-slate-900">تم إيقاف حسابك مؤقتاً</h1>
        <p className="text-slate-500 max-w-lg leading-relaxed font-bold text-lg mb-4">
          عذراً، لا يمكنك متابعة العمل حالياً نظراً لإيقاف حسابك من قبل الإدارة. يرجى التحدث مع فريق الدعم والإدارة المختصة لمراجعة حسابك واستعادة التفعيل.
        </p>
        <Button onClick={logout} className="mt-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl h-14 px-10 font-black text-lg shadow-xl shadow-slate-900/10">
          العودة وتسجيل الخروج
        </Button>
      </div>
    );
  }

  if (allowedRoles && allowedRoles.length > 0) {
    // Check if user has at least one of the allowed roles
    const userRoles = userProfile?.user_roles?.map(ur => ur.role) || [];
    const hasRequiredRole = allowedRoles.some(role => userRoles.includes(role));

    if (!hasRequiredRole) {
      // Redirect to unauthorized or a default safe page based on their primary role
      if (userRoles.includes('driver')) return <Navigate to="/driver" replace />;
      if (userRoles.includes('shipper')) return <Navigate to="/shipper" replace />;
      // Or if they are some kind of admin but lack specific access:
      if (userRoles.some(r => r !== 'driver' && r !== 'shipper')) return <Navigate to="/admin" replace />;

      return <Navigate to="/login" replace />;
    }
  }

  return <Outlet />;
}
