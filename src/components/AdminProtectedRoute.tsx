import { ReactNode, useState, useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { AdminRole } from "@/types/roles";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

interface AdminProtectedRouteProps {
    children: ReactNode;
    allowedRoles: AdminRole[];
}

export default function AdminProtectedRoute({ children, allowedRoles }: AdminProtectedRouteProps) {
    const { userProfile, isAuthenticated } = useAuth();
    const location = useLocation();
    const [userRole, setUserRole] = useState<AdminRole | null>(null);
    const [loadingRole, setLoadingRole] = useState(true);

    useEffect(() => {
        let isMounted = true;

        const fetchRole = async () => {
            if (!userProfile?.id) {
                if (isMounted) setLoadingRole(false);
                return;
            }

            try {
                const { data, error } = await supabase
                    .from('user_roles')
                    .select('role')
                    .eq('user_id', userProfile.id)
                    .single();

                if (isMounted) {
                    if (data?.role) {
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
                        setUserRole(roleMap[data.role] || null);
                    } else {
                        setUserRole(null);
                    }
                }
            } catch (err) {
                console.error("Error fetching admin role:", err);
            } finally {
                if (isMounted) setLoadingRole(false);
            }
        };

        fetchRole();

        return () => {
            isMounted = false;
        };
    }, [userProfile]);

    if (loadingRole) {
        return (
            <div className="h-screen flex items-center justify-center bg-slate-50">
                <Loader2 className="animate-spin text-blue-600" size={48} />
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // If user doesn't have an admin role, or their role isn't in allowedRoles
    if (!userRole || !allowedRoles.includes(userRole)) {
        // Show a subtle warning or redirect to dashboard
        toast.error("عذراً، ليس لديك صلاحية للوصول إلى هذه الصفحة", { id: 'unauthorized-access' });

        // Fallback based on typical scenarios
        if (userRole) {
            return <Navigate to="/admin/dashboard" replace />;
        } else {
            // Not an admin at all
            return <Navigate to="/" replace />;
        }
    }

    return <>{children}</>;
}
