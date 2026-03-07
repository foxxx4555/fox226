import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Shield, Zap, Globe, Truck, X, Download, Star,
  Search, MessageCircle, Phone, Mail, ArrowLeft,
  ChevronRight, Menu, Info, MapPin
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export default function WelcomePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [showBanner, setShowBanner] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const [searchID, setSearchID] = useState("");
  const [content, setContent] = useState({
    aboutUs: "",
    phone: "966XXXXXXXXX",
    email: "info@sas4pl.com",
    address: "الرياض، المملكة العربية السعودية"
  });

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    fetchContent();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const fetchContent = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .eq('id', 'content_config')
        .single();

      if (data && !error) {
        const config = data.data as any;
        setContent({
          aboutUs: config.aboutUs || "",
          phone: config.phone || "966XXXXXXXXX",
          email: config.email || "info@sas4pl.com",
          address: config.address || "الرياض، المملكة العربية السعودية"
        });
      }
    } catch (err) {
      console.error("Error fetching content:", err);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchID.trim()) {
      navigate(`/tracking?id=${searchID.trim()}`);
    }
  };

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen relative overflow-x-hidden bg-white font-['Cairo'] flex flex-col" dir="rtl">

      {/* 🚀 بانر تثبيت التطبيق */}
      <AnimatePresence>
        {showBanner && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="fixed top-0 left-0 right-0 z-[110] bg-white/90 backdrop-blur-xl border-b border-slate-100 px-4 py-3 flex items-center justify-between shadow-sm"
          >
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400" onClick={() => setShowBanner(false)}>
                <X size={18} />
              </Button>
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <img src="/favicon.png" alt="SAS Icon" className="w-6 h-6 object-contain" />
              </div>
              <div className="flex flex-col text-right">
                <h3 className="text-[12px] font-black text-slate-900 leading-tight">تطبيق SAS TRANSPORT</h3>
                <p className="text-[10px] text-slate-500 font-bold italic">أسرع • أسهل • آمن</p>
              </div>
            </div>
            <Button size="sm" className="bg-primary hover:bg-primary/90 text-white text-[11px] font-black h-8 px-4 rounded-lg shadow-lg shadow-primary/20">
              تثبيت الآن
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🚀 الـ Navbar الاحترافي - الشعار على اليسار */}
      <nav className={`fixed ${showBanner ? 'top-[65px]' : 'top-0'} left-0 right-0 z-[100] transition-all duration-500 py-6 px-6 md:px-12 flex items-center justify-between
        ${scrolled ? 'bg-white/90 shadow-xl shadow-slate-200/20 backdrop-blur-md' : 'bg-transparent'}
      `}>
        {/* الشعار على اليسار وحجمه كبير كما طلب المستخدم */}
        <div className="flex items-center gap-4">
          <img
            src="/logo.png"
            alt="SAS Logo"
            className="h-16 md:h-20 w-auto object-contain cursor-pointer transition-transform hover:scale-105 active:scale-95"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          />
        </div>

        {/* روابط التنقل في المنتصف / اليمين (للعربي) */}
        <div className="hidden lg:flex items-center gap-10">
          <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="font-black text-slate-800 hover:text-primary transition-all text-lg">الرئيسية</button>
          <button onClick={() => scrollToSection('about-us')} className="font-black text-slate-500 hover:text-primary transition-all text-lg">من نحن</button>
          <button onClick={() => scrollToSection('contact-us')} className="font-black text-slate-500 hover:text-primary transition-all text-lg">تواصل معنا</button>
          <Button
            variant="ghost"
            onClick={() => navigate('/tracking')}
            className="font-black text-primary hover:bg-primary/5 transition-all text-lg flex items-center gap-2"
          >
            <Search size={20} />
            تتبع شحنة
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <Button
            onClick={() => navigate('/login')}
            className="bg-slate-900 hover:bg-slate-800 text-white font-black px-8 h-14 rounded-2xl shadow-xl transition-all hover:scale-105 active:scale-95"
          >
            دخول النظام
          </Button>
          <Button variant="ghost" size="icon" className="lg:hidden rounded-xl">
            <Menu />
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-48 pb-32 md:pt-64 md:pb-48 flex flex-col items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_50%_50%,rgba(37,99,235,0.05),transparent_70%)]" />

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          className="container mx-auto px-6 text-center z-20"
        >
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="mb-8 inline-flex items-center gap-2 px-6 py-2 bg-primary/5 border border-primary/10 rounded-full text-primary font-black text-sm uppercase tracking-widest shadow-sm"
          >
            <Zap size={16} className="animate-pulse" />
            نظام النقل الذكي SAS TRANSPORT
          </motion.div>

          <h1 className="text-6xl md:text-8xl font-black text-slate-900 mb-8 leading-[1.1] tracking-tighter">
            مستقبل النقل <br />
            <span className="text-primary italic">في متناول يدك</span>
          </h1>

          <p className="text-xl md:text-2xl font-bold text-slate-500 mb-12 max-w-3xl mx-auto leading-relaxed px-4">
            {t('welcome_subtitle')}. {t('welcome_desc')}
          </p>

          {/* 🔍 صندوق بحث تتبع مباشر */}
          <motion.form
            onSubmit={handleSearch}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="relative max-w-3xl mx-auto w-full mb-16 group px-4"
          >
            <div className="relative flex items-center p-3 bg-white/70 backdrop-blur-xl rounded-[2.5rem] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] border-2 border-white transition-all group-focus-within:border-primary/30 group-focus-within:shadow-primary/10">
              <Input
                value={searchID}
                onChange={(e) => setSearchID(e.target.value)}
                placeholder="أدخل رقم الشحنة للتتبع المباشر..."
                className="h-16 md:h-20 px-10 bg-transparent border-none text-xl font-black focus-visible:ring-0 placeholder:text-slate-300"
              />
              <Button
                type="submit"
                className="h-16 md:h-16 px-12 rounded-[2rem] bg-primary hover:bg-primary/90 text-white font-black flex items-center gap-3 transition-all mr-2 shadow-lg shadow-primary/20"
              >
                <Search size={24} />
                تتبع
              </Button>
            </div>
          </motion.form>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
            {[
              { icon: <Shield className="text-primary" />, text: "آمن وموثوق" },
              { icon: <Zap className="text-amber-500" />, text: "سرعة فائقة" },
              { icon: <Globe className="text-emerald-500" />, text: "تغطية شاملة" },
              { icon: <Truck className="text-primary" />, text: "أسطول ضخم" },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + i * 0.1 }}
                className="bg-white/40 backdrop-blur-md border border-white p-6 rounded-[2rem] flex flex-col items-center gap-3 hover:scale-105 transition-all shadow-sm"
              >
                <div className="p-3 bg-white rounded-2xl shadow-sm">{item.icon}</div>
                <span className="text-sm font-black text-slate-800">{item.text}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* About Us Section */}
      <section id="about-us" className="py-32 bg-slate-50/50 relative overflow-hidden">
        <div className="container mx-auto px-6 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            <motion.div
              initial={{ x: 50, opacity: 0 }}
              whileInView={{ x: 0, opacity: 1 }}
              viewport={{ once: true }}
              className="space-y-8"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-xl font-black text-sm">
                <Info size={18} />
                من نحن
              </div>
              <h2 className="text-4xl md:text-5xl font-black text-slate-900 leading-tight">
                رواد الحلول اللوجستية <br />
                <span className="text-primary">في المملكة العربية السعودية</span>
              </h2>
              <p className="text-lg md:text-xl text-slate-600 font-bold leading-relaxed">
                {content.aboutUs || "نحن شركة رائدة في مجال النقل والخدمات اللوجستية، نسعى دائماً لتقديم أفضل الحلول التقنية لتسهيل عمليات النقل وضمان وصول شحناتكم بأمان وفي أسرع وقت ممكن."}
              </p>
              <Button onClick={() => navigate('/register')} className="h-14 px-10 rounded-2xl bg-slate-900 text-white font-black text-lg gap-3 shadow-xl">
                ابدأ رحلتك معنا
                <ChevronRight className="rotate-180" />
              </Button>
            </motion.div>
            <motion.div
              initial={{ x: -100, opacity: 0 }}
              whileInView={{ x: 0, opacity: 1 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="aspect-square bg-gradient-to-br from-primary to-blue-800 rounded-[3rem] shadow-2xl overflow-hidden relative group">
                <img
                  src="/logo.png"
                  className="absolute inset-x-8 inset-y-8 object-contain opacity-20 group-hover:scale-110 transition-transform duration-1000 grayscale brightness-200"
                  alt=""
                />
                <div className="absolute inset-0 flex items-center justify-center p-12 text-center text-white">
                  <h3 className="text-3xl font-black leading-relaxed">رؤية واضحة .. مستقبل مضمون</h3>
                </div>
              </div>
              <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-white/80 backdrop-blur-xl p-8 rounded-[2rem] shadow-xl border border-white flex flex-col items-center justify-center text-center">
                <p className="text-4xl font-black text-primary mb-1">100%</p>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">إدارة ذكية</p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Contact Us Section */}
      <section id="contact-us" className="py-32 bg-white">
        <div className="container mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-20 space-y-6">
            <h2 className="text-4xl md:text-5xl font-black text-slate-900">تواصل معنا</h2>
            <p className="text-slate-500 font-bold text-lg leading-relaxed">فريقنا جاهز للرد على استفساراتكم على مدار الساعة</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <motion.div
              whileHover={{ y: -10 }}
              className="p-10 bg-slate-50 rounded-[2.5rem] border border-slate-100 group transition-all text-center"
            >
              <div className="w-16 h-16 bg-white rounded-3xl shadow-sm text-primary flex items-center justify-center mx-auto mb-8 group-hover:bg-primary group-hover:text-white transition-all">
                <Phone size={32} />
              </div>
              <h4 className="text-xl font-black text-slate-800 mb-2">اتصل بنا</h4>
              <p className="font-bold text-slate-500 text-lg" dir="ltr">{content.phone}</p>
            </motion.div>

            <motion.div
              whileHover={{ y: -10 }}
              className="p-10 bg-slate-50 rounded-[2.5rem] border border-slate-100 group transition-all text-center"
            >
              <div className="w-16 h-16 bg-white rounded-3xl shadow-sm text-emerald-500 flex items-center justify-center mx-auto mb-8 group-hover:bg-emerald-500 group-hover:text-white transition-all">
                <MessageCircle size={32} />
              </div>
              <h4 className="text-xl font-black text-slate-800 mb-2">واتساب</h4>
              <p className="font-bold text-slate-500 text-lg" dir="ltr">{content.phone}</p>
            </motion.div>

            <motion.div
              whileHover={{ y: -10 }}
              className="p-10 bg-slate-50 rounded-[2.5rem] border border-slate-100 group transition-all text-center"
            >
              <div className="w-16 h-16 bg-white rounded-3xl shadow-sm text-blue-500 flex items-center justify-center mx-auto mb-8 group-hover:bg-blue-500 group-hover:text-white transition-all">
                <Mail size={32} />
              </div>
              <h4 className="text-xl font-black text-slate-800 mb-2">البريد الإلكتروني</h4>
              <p className="font-bold text-slate-500 text-lg">{content.email}</p>
            </motion.div>
          </div>

          <div className="mt-20 p-12 bg-slate-900 rounded-[3rem] text-white flex flex-col md:flex-row items-center justify-between gap-10 overflow-hidden relative">
            <div className="z-10 space-y-4">
              <div className="flex items-center gap-3 text-slate-400 font-bold">
                <MapPin size={24} />
                {content.address}
              </div>
              <h3 className="text-3xl font-black">جاهز للبدء؟</h3>
              <p className="text-slate-400 font-bold">انضم إلى مئات الشركات التي تثق في SAS TRANSPORT</p>
            </div>
            <Button onClick={() => navigate('/register')} className="z-10 h-16 px-12 rounded-2xl bg-white text-slate-900 hover:bg-slate-100 font-black text-xl shadow-2xl hover:scale-105 transition-all">
              سجل الآن مجاناً
            </Button>
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2" />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-slate-100 bg-white">
        <div className="container mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-6">
            <img src="/logo.png" alt="SAS Logo" className="h-10 opacity-30 grayscale transition-all hover:opacity-100 cursor-pointer" />
            <span className="text-slate-400 font-bold text-sm">© {new Date().getFullYear()} SAS TRANSPORT. جميع الحقوق محفوظة</span>
          </div>

          <div className="flex items-center gap-8">
            <a href="#" className="text-slate-400 hover:text-primary font-black text-sm transition-colors">سياسة الخصوصية</a>
            <a href="#" className="text-slate-400 hover:text-primary font-black text-sm transition-colors">الشروط والأحكام</a>
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-primary/5 hover:text-primary cursor-pointer transition-all">
                <Globe size={20} />
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
