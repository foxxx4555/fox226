import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useAppStore } from '@/store/appStore';

export function useLocationTracker() {
  const { userProfile, currentRole } = useAuth();
  const setLocationEnabled = useAppStore((state) => state.setLocationEnabled);
  const setLocationPermission = useAppStore((state) => state.setLocationPermission);

  const startTracking = useCallback(() => {
    // التتبع للسائقين فقط
    if (currentRole !== 'driver' || !userProfile?.id) return;

    const options = {
      enableHighAccuracy: true, // دقة عالية جداً
      timeout: 10000,
      maximumAge: 0,
    };

    const success = async (position: GeolocationPosition) => {
      setLocationPermission('granted');
      setLocationEnabled(true);
      
      const { latitude, longitude } = position.coords;
      
      // تحديث موقع السائق في قاعدة البيانات
      await supabase
        .from('profiles')
        .update({ 
          latitude, 
          longitude, 
          last_seen_at: new Date().toISOString() 
        })
        .eq('id', userProfile.id);
    };

    const error = (err: GeolocationPositionError) => {
      console.error("GPS Error:", err.message);
      if (err.code === 1) { // تم رفض الصلاحية
        setLocationPermission('denied');
      }
      // في حال الرفض أو إغلاق الـ GPS نقفل السستم
      setLocationEnabled(false);
    };

    const watchId = navigator.geolocation.watchPosition(success, error, options);
    return watchId;
  }, [userProfile, currentRole, setLocationEnabled, setLocationPermission]);

  useEffect(() => {
    const watchId = startTracking();
    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, [startTracking]);
}
