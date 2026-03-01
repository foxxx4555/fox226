import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Shield, Zap, Globe, Truck, X, Download, Star } from 'lucide-react';

export default function WelcomePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [showBanner, setShowBanner] = useState(true);

  // كود لإخفاء البانر عند الضغط على X
  const dismissBanner = () => setShowBanner(false);

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#0a0c10] flex flex-col items-center justify-center p-6 font-['Cairo']">
      
      {/* 🚀 بانر تثبيت التطبيق - ثابت في الأعلى */}
      <AnimatePresence>
        {showBanner && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="fixed top-0 left-0 right-0 z-[100] bg-black/60 backdrop-blur-xl border-b border-white/10 px-4 py-3 flex items-center justify-between shadow-2xl"
          >
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-slate-400 hover:text-white rounded-full"
                onClick={dismissBanner}
              >
                <X size={18} />
              </Button>
              
              {/* أيقونة التطبيق الصغيرة */}
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary to-blue-700 p-0.5 shadow-lg shadow-primary/20">
                <div className="w-full h-full bg-[#0a0c10] rounded-[0.9rem] flex items-center justify-center overflow-hidden">
                  <img src="/favicon.png" alt="SAS Icon" className="w-8 h-8 object-contain" />
                </div>
              </div>

              <div className="flex flex-col text-right">
                <h3 className="text-[13px] font-black text-white leading-tight">تطبيق SAS TRANSPORT</h3>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-slate-400 font-bold italic">أسرع • أسهل • آمن</span>
                  <div className="flex gap-0.5 ml-1">
                    {[1,2,3,4,5].map(s => <Star key={s} size={8} className="fill-amber-400 text-amber-400" />)}
                  </div>
                </div>
              </div>
            </div>

            <Button 
              size="sm"
              className="bg-primary hover:bg-primary/90 text-white text-[11px] font-black h-9 px-4 rounded-xl gap-2 shadow-lg shadow-primary/20 active:scale-95 transition-transform"
            >
              <Download size={14} />
              تثبيت
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Background Effects */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(37,99,235,0.15),transparent_50%)]" />
      <div className="absolute -top-24 -start-24 w-96 h-96 bg-primary/20 blur-[120px] rounded-full animate-pulse" />
      <div className="absolute -bottom-24 -end-24 w-96 h-96 bg-accent/20 blur-[120px] rounded-full animate-pulse" />

      {/* Main Content - ضفنا pt-20 عشان ننزله تحت البانر شوية */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="text-center z-10 max-w-4xl relative pt-20"
      >
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-12"
        >
          {/* اللوجو الجديد - نزلناه تحت شوية وزودنا الظل المحيط به */}
          <div className="mb-10 rotate-2 hover:rotate-0 transition-all duration-700 cursor-pointer">
            <img 
              src="/logo.png" 
              alt="SASGO Logo" 
              className="w-56 md:w-80 h-auto mx-auto drop-shadow-[0_25px_60px_rgba(37,99,235,0.4)]" 
            />
          </div>

          <h1 className="text-5xl md:text-7xl font-black text-white mb-6 tracking-tight">
            SAS <span className="text-primary">Transport</span>
          </h1>

          <p className="text-xl md:text-2xl font-bold text-slate-300 mb-4 px-4">
            {t('welcome_subtitle')}
          </p>

          <p className="text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed font-medium">
            {t('welcome_desc')}
          </p>
        </motion.div>

        {/* المميزات الأربعة */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12 px-2"
        >
          {[
            { icon: <Shield className="text-primary" />, text: "آمن وموثوق" },
            { icon: <Zap className="text-amber-400" />, text: "سرعة فائقة" },
            { icon: <Globe className="text-emerald-400" />, text: "تغطية شاملة" },
            { icon: <Truck className="text-primary" />, text: "أسطول ضخم" },
          ].map((item, i) => (
            <div key={i} className="bg-white/5 backdrop-blur-md border border-white/10 p-4 rounded-[2rem] flex flex-col items-center gap-2 hover:bg-white/10 transition-colors">
              <div className="p-2 bg-white/5 rounded-2xl">{item.icon}</div>
              <span className="text-[13px] font-black text-slate-200">{item.text}</span>
            </div>
          ))}
        </motion.div>

        {/* الأزرار الرئيسية */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-md mx-auto"
        >
          <Button
            onClick={() => navigate('/login')}
            className="w-full sm:flex-1 h-16 text-xl font-black bg-primary hover:bg-primary/90 text-white rounded-[1.8rem] shadow-xl shadow-primary/20 transition-all hover:scale-[1.03] active:scale-[0.97]"
          >
            {t('login')}
          </Button>
          <Button
            onClick={() => navigate('/register')}
            variant="outline"
            className="w-full sm:flex-1 h-16 text-xl font-black border-2 border-white/10 text-white bg-white/5 hover:bg-white/10 rounded-[1.8rem] transition-all hover:scale-[1.03] active:scale-[0.97]"
          >
            {t('register')}
          </Button>
        </motion.div>
      </motion.div>

      {/* العلامة التجارية في الأسفل */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.4 }}
        transition={{ delay: 1 }}
        className="mt-12 mb-6 text-slate-500 font-black tracking-widest uppercase text-[10px]"
      >
        World Class Logistics Platform • Powered by SASGO
      </motion.div>
    </div>
  );
}
