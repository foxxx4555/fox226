import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { UserProfile, UserRole } from '@/types';

interface AppState {
  userProfile: UserProfile | null;
  currentRole: UserRole | null;
  // أضفنا هذه الحالات للتحكم في الموقع
  isLocationEnabled: boolean;
  locationPermission: 'prompt' | 'granted' | 'denied';
  setUserProfile: (profile: UserProfile | null) => void;
  setCurrentRole: (role: UserRole | null) => void;
  setLocationEnabled: (enabled: boolean) => void;
  setLocationPermission: (status: 'prompt' | 'granted' | 'denied') => void;
  reset: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      userProfile: null,
      currentRole: null,
      isLocationEnabled: true, // القيمة الافتراضية true لتجنب الوميض عند التحميل
      locationPermission: 'prompt',
      setUserProfile: (profile) => set({ userProfile: profile }),
      setCurrentRole: (role) => set({ currentRole: role }),
      setLocationEnabled: (enabled) => set({ isLocationEnabled: enabled }),
      setLocationPermission: (status) => set({ locationPermission: status }),
      reset: () => set({ userProfile: null, currentRole: null, isLocationEnabled: true, locationPermission: 'prompt' }),
    }),
    {
      name: 'sas-transport-storage',
    }
  )
);
