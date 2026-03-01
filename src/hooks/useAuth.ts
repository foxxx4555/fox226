import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';
import { useAppStore } from '@/store/appStore';
import { useNavigate } from 'react-router-dom';
import { UserRole } from '@/types';

export function useAuth() {
  const { userProfile, currentRole, setUserProfile, setCurrentRole, reset } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [profileChannel, setProfileChannel] = useState<RealtimeChannel | null>(null);
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

    let currentChannel: RealtimeChannel | null = null;
    let pollInterval: NodeJS.Timeout;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        setLoading(false);
        return;
      }

      // 1. نظام الحماية الأول: Realtime Listener
      currentChannel = supabase.channel(`public:profiles:auth_security`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${session.user.id}` },
          (payload) => {
            if (payload.new) {
              setUserProfile(payload.new as any);
              if (payload.new.status === 'suspended') {
                // الطرد الإجباري عند الإيقاف اللحظي
                window.location.href = '/login'; // Force redirect to avoid stale state issues
              }
            }
          }
        )
        .subscribe();

      setProfileChannel(currentChannel);

      // 2. نظام الحماية الثاني: Polling (فحص دوري كل 20 ثانية لتأكيد الحالة)
      pollInterval = setInterval(async () => {
        try {
          const { data: latestProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .maybeSingle();

          if (latestProfile && (latestProfile as any).status === 'suspended') {
            setUserProfile({ ...(latestProfile as any), status: 'suspended' });
            window.location.href = '/login'; // Force redirect
          }
        } catch (err) {
          console.error('Security Poll Error:', err);
        }
      }, 20000); // 20 Seconds
    });

    return () => {
      subscription.unsubscribe();
      if (currentChannel) supabase.removeChannel(currentChannel);
      if (pollInterval) clearInterval(pollInterval);
    };
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    reset();
    navigate('/login');
  };

  return { userProfile, currentRole, loading, logout, isAuthenticated: !!userProfile };
}
