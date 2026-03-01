import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { UserProfile, UserRole } from '@/types';

interface AppState {
  // --- بيانات المستخدم والأمان ---
  userProfile: UserProfile | null;
  currentRole: UserRole;
  isAuthenticated: boolean;

  // --- إعدادات الموقع والجغرافي ---
  isLocationEnabled: boolean;
  locationPermission: 'prompt' | 'granted' | 'denied';

  // --- الدوال (Actions) ---
  setUserProfile: (profile: UserProfile | null) => void;
  setCurrentRole: (role: UserRole) => void;

  // دالة تسجيل الدخول الشاملة
  setAuth: (profile: UserProfile, role: UserRole) => void;

  setLocationEnabled: (enabled: boolean) => void;
  setLocationPermission: (status: 'prompt' | 'granted' | 'denied') => void;

  // دالة الخروج (Logout) - تنظف كل شيء وتصفر الذاكرة
  reset: () => void;

  // دالة مساعدة للتحقق هل المستخدم إداري أم لا
  isAdmin: () => boolean;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // القيمة الابتدائية
      userProfile: null,
      currentRole: null,
      isAuthenticated: false,
      isLocationEnabled: true,
      locationPermission: 'prompt',

      setUserProfile: (profile) => set({
        userProfile: profile,
        isAuthenticated: !!profile
      }),

      setCurrentRole: (role) => set({ currentRole: role }),

      setAuth: (profile, role) => set({
        userProfile: profile,
        currentRole: role,
        isAuthenticated: true
      }),

      setLocationEnabled: (enabled) => set({ isLocationEnabled: enabled }),

      setLocationPermission: (status) => set({ locationPermission: status }),

      // دالة التحقق من الصلاحية الإدارية
      isAdmin: () => {
        const adminRoles: UserRole[] = [
          'super_admin', 'admin', 'finance', 'operations',
          'carrier_manager', 'vendor_manager', 'support', 'analytics'
        ];
        return adminRoles.includes(get().currentRole);
      },

      // تنظيف الـ Store بالكامل عند تسجيل الخروج (حل مشكلة فوكس)
      reset: () => {
        // حذف البيانات من الـ LocalStorage أيضاً لضمان عدم التعليق
        localStorage.removeItem('sas-transport-storage');
        set({
          userProfile: null,
          currentRole: null,
          isAuthenticated: false,
          isLocationEnabled: true,
          locationPermission: 'prompt'
        });
      },
    }),
    {
      name: 'sas-transport-storage', // اسم الملف في الـ LocalStorage
      storage: createJSONStorage(() => localStorage), // استخدام التخزين المحلي
    }
  )
);