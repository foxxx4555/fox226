import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Shield, Zap, Globe, Truck, X, Download, Star,
  Search, Cpu, ShoppingBag, Factory, Box, Home, Droplets, Store,
  ChevronRight, Menu
} from 'lucide-react';

export default function WelcomePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [showBanner, setShowBanner] = useState(true);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const dismissBanner = () => setShowBanner(false);

  const sectors = [
    { name: "السلع الاستهلاكية", icon: <ShoppingBag size={20} />, x: "15%", y: "25%" },
    { name: "الإلكترونيات", icon: <Cpu size={20} />, x: "75%", y: "30%" },
    { name: "النفط والغاز", icon: <Droplets size={20} />, x: "20%", y: "65%" },
    { name: "التصنيع", icon: <Factory size={20} />, x: "80%", y: "70%" },
    { name: "المنتجات المنزلية", icon: <Home size={20} />, x: "45%", y: "85%" },
    { name: "التجزئة", icon: <Store size={20} />, x: "55%", y: "20%" },
  ];

  const [searchID, setSearchID] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchID.trim()) {
      navigate(`/tracking?id=${searchID.trim()}`);
    }
  };

  return (
    <div className="min-h-screen relative overflow-x-hidden bg-white font-['Cairo'] flex flex-col" dir="rtl">

      {/* 🚀 الـ Navbar الاحترافي */}
      <nav className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-500 py-4 px-6 md:px-12 flex items-center justify-between
        ${scrolled ? 'bg-white shadow-xl shadow-slate-200/20 backdrop-blur-md' : 'bg-transparent'}
      `}>
        <div className="flex items-center gap-8">
          <img src="/logo.png" alt="SAS Logo" className="h-10 md:h-12 w-auto" />

          <div className="hidden lg:flex items-center gap-6">
            <a href="#" className="font-black text-slate-800 hover:text-primary transition-colors">الرئيسية</a>
            <a href="#" className="font-black text-slate-500 hover:text-primary transition-colors">عن ساس</a>
            <a href="#" className="font-black text-slate-500 hover:text-primary transition-colors">المنصات</a>
            <a href="#" className="font-black text-slate-500 hover:text-primary transition-colors">تواصل معنا</a>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => navigate('/tracking')}
            className="bg-primary hover:bg-primary/90 text-white font-black px-6 h-12 rounded-2xl flex items-center gap-2 shadow-lg shadow-primary/20 active:scale-95 transition-all"
          >
            <Truck size={18} />
            تتبع شحنتك
          </Button>

          <Button
            variant="outline"
            onClick={() => navigate('/login')}
            className="hidden md:flex font-black border-2 border-slate-100 text-slate-700 h-12 rounded-2xl hover:bg-slate-50"
          >
            دخول المسؤولين
          </Button>

          <Button variant="ghost" size="icon" className="lg:hidden rounded-xl">
            <Menu />
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-40 flex flex-col items-center justify-center overflow-hidden">

        {/* Abstract Map Background Placeholder */}
        <div className="absolute inset-0 z-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none">
          <img src="/logo.png" className="w-[120%] h-auto grayscale brightness-0" alt="" />
        </div>

        {/* Sector Nodes - موزعة بشكل يحاكي الصورة */}
        <div className="absolute inset-0 z-10 pointer-events-none hidden md:block">
          {sectors.map((sector, idx) => (
            <motion.div
              key={idx}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.5 + (idx * 0.1), duration: 0.8 }}
              style={{ left: sector.x, top: sector.y }}
              className="absolute group pointer-events-auto"
            >
              <div className="bg-white p-4 rounded-full shadow-2xl shadow-slate-200 border border-slate-50 flex flex-col items-center gap-2 hover:scale-110 hover:border-primary/30 transition-all cursor-crosshair">
                <div className="p-3 bg-slate-50 text-slate-400 group-hover:bg-primary/5 group-hover:text-primary rounded-2xl transition-all">
                  {sector.icon}
                </div>
                <span className="text-[12px] font-black text-slate-400 group-hover:text-slate-900 transition-colors whitespace-nowrap px-2">
                  {sector.name}
                </span>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1 }}
          className="container mx-auto px-6 text-center z-20"
        >
          {/* Main Badge */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="mb-8 inline-flex items-center gap-2 px-5 py-2 bg-primary/5 border border-primary/10 rounded-full text-primary font-black text-sm uppercase tracking-widest animate-fade-in"
          >
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            نظام النقل الذكي الأول في المملكة
          </motion.div>

          <h1 className="text-5xl md:text-8xl font-black text-slate-900 mb-8 leading-[1.1] tracking-tighter">
            تغطية شاملة <br />
            <span className="text-primary relative inline-block">
              لكل القطاعات
              <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 400 20" fill="none">
                <path d="M5 15Q100 5 200 15T395 5" stroke="#2563EB" strokeWidth="6" strokeLinecap="round" opacity="0.2" />
              </svg>
            </span>
            <span> في جميع المدن</span>
          </h1>

          <p className="text-xl md:text-2xl font-bold text-slate-500 mb-12 max-w-3xl mx-auto leading-relaxed">
            {t('welcome_subtitle')}. {t('welcome_desc')}
          </p>

          {/* 🔍 صندوق بحث تتبع مباشر في الهيرو */}
          <motion.form
            onSubmit={handleSearch}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="relative max-w-2xl mx-auto w-full mb-12 group"
          >
            <div className="relative flex items-center p-2 bg-white rounded-3xl shadow-2xl shadow-slate-200 border-2 border-slate-50 transition-all group-focus-within:border-primary group-focus-within:shadow-primary/10">
              <Input
                value={searchID}
                onChange={(e) => setSearchID(e.target.value)}
                placeholder="أدخل رقم الشحنة للتتبع المباشر..."
                className="h-14 md:h-18 px-6 bg-transparent border-none text-lg font-black focus-visible:ring-0 placeholder:text-slate-300"
              />
              <Button
                type="submit"
                className="h-14 md:h-14 px-8 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black flex items-center gap-2 transition-all mr-2"
              >
                <Search size={22} />
                تتبع
              </Button>
            </div>
          </motion.form>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-5">
            <Button
              onClick={() => navigate('/register')}
              className="h-16 px-12 text-xl font-black bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-2xl transition-all hover:scale-105 active:scale-95 flex items-center gap-3"
            >
              سجل كشاحن الآن
              <ChevronRight className="rotate-180" />
            </Button>

            <Button
              onClick={() => navigate('/login')}
              variant="outline"
              className="h-16 px-12 text-xl font-black border-2 border-slate-100 text-slate-600 rounded-2xl hover:bg-slate-50 hover:border-slate-200 transition-all hover:scale-105 active:scale-95"
            >
              تسجيل الدخول
            </Button>
          </div>
        </motion.div>

        {/* Decorative elements */}
        <div className="absolute top-1/2 left-0 -translate-y-1/2 w-96 h-96 bg-blue-100/50 blur-[150px] rounded-full pointer-events-none" />
        <div className="absolute top-1/2 right-0 -translate-y-1/2 w-96 h-96 bg-primary/10 blur-[150px] rounded-full pointer-events-none" />
      </section>

      {/* Stats / Features Grid */}
      <section className="py-24 bg-slate-50/50">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: <Shield size={32} />,
                title: "أمان الميناء للأمان",
                desc: "نضمن لك أعلى مستويات الأمان والموثوقية في تداول الشحنات",
                color: "text-blue-600",
                bg: "bg-blue-50"
              },
              {
                icon: <Zap size={32} />,
                title: "سرعة التنفيذ",
                desc: "أسرع استجابة لتوصيل الشحنات بفضل الأتمتة والذكاء الاصطناعي",
                color: "text-amber-500",
                bg: "bg-amber-50"
              },
              {
                icon: <Globe size={32} />,
                title: "تغطية عالمية",
                desc: "نصل لكل شبر في المملكة مع رؤية للتوسع الإقليمي والعالمي",
                color: "text-emerald-500",
                bg: "bg-emerald-50"
              }
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ y: 20, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/20 hover:shadow-2xl hover:border-primary/20 transition-all group"
              >
                <div className={`w-16 h-16 rounded-3xl ${feature.bg} ${feature.color} flex items-center justify-center mb-8 group-hover:scale-110 transition-transform`}>
                  {feature.icon}
                </div>
                <h3 className="text-2xl font-black text-slate-900 mb-4">{feature.title}</h3>
                <p className="text-slate-500 font-bold leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto py-12 px-6 border-t border-slate-100 bg-white">
        <div className="container mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-4">
            <img src="/logo.png" alt="SAS Logo" className="h-8 opacity-50 grayscale" />
            <span className="text-slate-400 font-bold text-sm">© {new Date().getFullYear()} SAS TRANSPORT. جميع الحقوق محفوظة</span>
          </div>

          <div className="flex items-center gap-8">
            <a href="#" className="text-slate-400 hover:text-primary font-black text-sm transition-colors">سياسة الخصوصية</a>
            <a href="#" className="text-slate-400 hover:text-primary font-black text-sm transition-colors">الشروط والأحكام</a>
            <a href="#" className="text-slate-400 hover:text-primary font-black text-sm transition-colors">الدعم الفني</a>
          </div>

          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-primary/5 hover:text-primary cursor-pointer transition-all">
              <Globe size={20} />
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
