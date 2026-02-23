import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAppStore } from '@/store/appStore';
import { useNavigate } from 'react-router-dom';
import { UserRole } from '@/types';

export function useAuth() {
  const { userProfile, currentRole, setUserProfile, setCurrentRole, reset } = useAppStore();
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        reset();
        setLoading(false);
        return;
      }

      if (session?.user && !userProfile) {
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
        const { data: roleData } = await supabase.from('user_roles').select('role').eq('user_id', session.user.id).maybeSingle();

        if (profile) setUserProfile(profile);
        if (roleData) setCurrentRole(roleData.role as UserRole);
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    reset();
    navigate('/login');
  };

  return { userProfile, currentRole, loading, logout, isAuthenticated: !!userProfile };
}
