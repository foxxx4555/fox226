import { useAuth } from '@/hooks/useAuth';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { UserRole } from '@/types';

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
}

export default function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, loading, userProfile } = useAuth();
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
