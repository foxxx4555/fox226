import { MapPin, ShieldCheck, Lock, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/store/appStore';
import { motion } from 'framer-motion';

export default function GpsLockOverlay() {
  const isLocationEnabled = useAppStore((state) => state.isLocationEnabled);
  const locationPermission = useAppStore((state) => state.locationPermission);
  const currentRole = useAppStore((state) => state.currentRole);

  // لا يظهر القفل إلا للسائقين وفي حالة وجود مشكلة في الموقع
  if (currentRole !== 'driver' || (isLocationEnabled && locationPermission === 'granted')) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[10000] bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
      <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary rounded-full blur-[120px]" />
      </div>

      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative z-10 max-w-md w-full">
        <div className="w-24 h-24 bg-primary/20 rounded-[2.5rem] flex items-center justify-center text-primary mx-auto mb-8 rotate-3 shadow-2xl animate-pulse">
          <MapPin size={48} />
        </div>

        <h2 className="text-3xl font-black text-white mb-4 tracking-tight">نظام التتبع معطل!</h2>
        <p className="text-slate-400 text-lg mb-10 leading-relaxed font-medium">
          عذراً، يشترط نظام <span className="text-white font-bold italic text-primary">SAS Transport</span> تفعيل الـ GPS وصلاحية الموقع بشكل دائم لتتمكن من العمل واستلام الطلبات.
        </p>

        <div className="space-y-4">
          <Button 
            onClick={() => window.location.reload()}
            className="w-full h-16 rounded-2xl text-xl font-black bg-primary hover:bg-primary/90 text-white shadow-xl shadow-primary/20 gap-3"
          >
            <ShieldCheck size={24} /> تفعيل الموقع الآن
          </Button>
          
          <div className="flex items-center justify-center gap-2 py-4 px-6 rounded-xl bg-white/5 border border-white/10">
            <Lock size={16} className="text-slate-500" />
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest text-center">النظام يراقب الموقع لضمان أمان الشحنات</span>
          </div>
        </div>

        {locationPermission === 'denied' && (
          <div className="mt-8 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-start gap-3 text-start">
            <AlertTriangle className="shrink-0 mt-1" size={20} />
            <p className="text-sm font-bold leading-relaxed">
              لقد قمت بحظر الوصول للموقع. يرجى الذهاب لإعدادات المتصفح أو التطبيق وإلغاء الحظر لتتمكن من الدخول.
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
}
