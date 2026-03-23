import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Shield, Zap, Globe, Truck, X, Download, Star, UserCircle2,
  Search, MessageCircle, Phone, Mail, ArrowLeft,
  ChevronRight, Menu, Info, MapPin, Send, CheckCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';

export default function WelcomePage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [searchID, setSearchID] = useState("");
  const [content, setContent] = useState({
    aboutUs: "",
    phone: "+966 55 025 8358",
    email: "pr@sas3pl.com",
    address: "الرياض، المملكة العربية السعودية",
    whatsapp: "",
    contactFormEmail: "yalqlb019@gmail.com",
    emailjsServiceId: "service_0p2k5ih",
    emailjsTemplateId: "template_tboeo2t",
    emailjsPublicKey: "uFVJ_0paYoHGm544e"
  });

  const [contactData, setContactData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    subject: '',
    message: ''
  });
  const [isSending, setIsSending] = useState(false);

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
          email: config.email || "pr@sas3pl.com",
          address: config.address || "الرياض، المملكة العربية السعودية",
          whatsapp: config.whatsapp || "",
          contactFormEmail: config.contactFormEmail || "",
          emailjsServiceId: config.emailjsServiceId || "",
          emailjsTemplateId: config.emailjsTemplateId || "",
          emailjsPublicKey: config.emailjsPublicKey || ""
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

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactData.name || !contactData.email || !contactData.message) {
      toast.error("يرجى ملء الحقول الإلزامية");
      return;
    }

    setIsSending(true);
    try {
      // 1. أولاً: محاولة الحفظ في قاعدة البيانات (بشكل منفصل حتى لا يعطل الإرسال)
      try {
        await (supabase as any)
          .from('contact_messages')
          .insert([{
            name: contactData.name,
            email: contactData.email,
            phone: contactData.phone,
            company: contactData.company,
            subject: contactData.subject,
            message: contactData.message,
            to_email: "yalqlb019@gmail.com"
          }]);
      } catch (dbErr) {
        console.warn("⚠️ فشل الحفظ في قاعدة البيانات ولكن سنحاول إرسال الإيميل:", dbErr);
      }

      // 2. ثانياً: إرسال الإيميل (قوة واحترافية)
      console.log("🚀 محاولة الإرسال لـ EmailJS...");

      // تجهيز رابط الواتساب بشكل صحيح
      const cleanPhone = contactData.phone?.replace(/\D/g, '') || '';
      const waPhone = cleanPhone.startsWith('0') ? '966' + cleanPhone.substring(1) : (cleanPhone.startsWith('966') ? cleanPhone : '966' + cleanPhone);
      const whatsapp_link = cleanPhone ? `https://wa.me/${waPhone}` : `https://wa.me/966550258358`;

      const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id: "service_0p2k5ih",
          template_id: "template_tboeo2t",
          user_id: "uFVJ_0paYoHGm544e",
          template_params: {
            from_name: contactData.name,
            user_name: contactData.name,
            from_email: contactData.email,
            user_email: contactData.email,
            phone: contactData.phone,
            user_phone: contactData.phone,
            company: contactData.company,
            user_company: contactData.company,
            subject: contactData.subject || "طلب تواصل جديد",
            user_subject: contactData.subject || "طلب تواصل جديد",
            message: contactData.message,
            whatsapp_link: whatsapp_link,
            to_email: "yalqlb019@gmail.com" // الإيميل المباشر لضمان الوصول
          }
        })
      });

      if (response.ok) {
        console.log("✅ تم الإرسال بنجاح والرسالة وصلت!");
        toast.success("تم إرسال رسالتك بنجاح!");
        setContactData({ name: '', email: '', phone: '', company: '', subject: '', message: '' });
      } else {
        const errorMsg = await response.text();
        console.error("❌ فشل الإرسال من سيرفر EmailJS:", errorMsg);
        toast.error("فشل إرسال الإيميل: " + errorMsg);
      }

    } catch (err: any) {
      console.error("❌ خطأ غير متوقع:", err);
      toast.error("حدث خطأ ما أثناء الإرسال");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-x-hidden bg-white font-['Cairo'] flex flex-col" dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>


      <Navbar />

      {/* Hero Section - أقصى ضغط لتقليل الفراغات */}
      <section className="relative pt-8 pb-6 md:pt-14 md:pb-10 flex flex-col items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_50%_50%,rgba(37,99,235,0.05),transparent_70%)]" />

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          className="container mx-auto px-6 text-center z-20"
        >

          {/* 🚀 الشعار مضغوط لأقصى درجة */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="mb-2"
          >
            <img
              src="/logo.png"
              alt="SAS Logo"
              className="h-32 md:h-52 w-auto object-contain mx-auto drop-shadow-xl"
            />
          </motion.div>

          <h1 className="text-3xl md:text-6xl font-black text-slate-900 mb-4 leading-[1.1] tracking-tighter">
            {t('ship_what_you_want', 'اشحن ما تريد . وقت ما تريد .')}
          </h1>

          <p className="text-base md:text-xl font-black text-slate-600 mb-8 max-w-3xl mx-auto leading-relaxed px-4">
            {t('all_shipments_controlled', 'كل شحناتك تحت السيطرة - من الانطلاقة حتى التسليم . بسرعة وكفاءة.')}
          </p>

          {/* 🔍 صندوق بحث تتبع مباشر */}
          <motion.form
            onSubmit={handleSearch}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="relative max-w-2xl mx-auto w-full mb-6 group px-4"
          >
            <div className="relative flex items-center p-1.5 bg-white/70 backdrop-blur-xl rounded-[1.5rem] shadow-lg border-2 border-white transition-all group-focus-within:border-primary/30">
              <Input
                value={searchID}
                onChange={(e) => setSearchID(e.target.value)}
                placeholder={t('tracking_placeholder_welcome', 'أدخل رقم الشحنة للتتبع المباشر...')}
                className="h-10 md:h-12 px-6 bg-transparent border-none text-sm font-black focus-visible:ring-0 placeholder:text-slate-300"
              />
              <Button
                type="submit"
                className="h-10 md:h-10 px-8 rounded-[1rem] bg-primary hover:bg-primary/90 text-white font-black flex items-center gap-2 transition-all mr-2 shadow-md shadow-primary/20 text-xs"
              >
                <Search size={16} />
                {t('track', 'تتبع')}
              </Button>
            </div>
          </motion.form>

          {/* Features grid removed per user request */}

          {/* Bottom CTA buttons removed per user request */}
        </motion.div>
      </section>

      {/* About Us Section */}
      <section id="about-us" className="py-20 bg-slate-50/50 relative overflow-hidden">
        <div className="container mx-auto px-6 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            <motion.div
              initial={{ x: i18n.language === 'ar' ? 50 : -50, opacity: 0 }}
              whileInView={{ x: 0, opacity: 1 }}
              viewport={{ once: true }}
              className="space-y-8"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-xl font-black text-sm">
                <Info size={18} />
                {t('about_us_nav', 'من نحن')}
              </div>
              <h2 className="text-2xl md:text-3xl font-black text-slate-900 leading-tight">
                {t('logistic_pioneers', 'رواد الحلول اللوجستية')} <br />
                <span className="text-primary">{t('in_saudi_arabia', 'في المملكة العربية السعودية')}</span>
              </h2>
              <p className="text-base md:text-lg text-slate-600 font-bold leading-relaxed">
                {content.aboutUs || t('about_us_default', "نحن شركة رائدة في مجال النقل والخدمات اللوجستية، نسعى دائماً لتقديم أفضل الحلول التقنية لتسهيل عمليات النقل وضمان وصول شحناتكم بأمان وفي أسرع وقت ممكن.")}
              </p>
              <Button onClick={() => navigate('/register')} className="h-14 px-10 rounded-2xl bg-slate-900 text-white font-black text-lg gap-3 shadow-xl">
                {t('start_journey_with_us', 'ابدأ رحلتك معنا')}
                <ChevronRight className={i18n.language === 'ar' ? "rotate-180" : ""} />
              </Button>
            </motion.div>
            <motion.div
              initial={{ x: i18n.language === 'ar' ? -100 : 100, opacity: 0 }}
              whileInView={{ x: 0, opacity: 1 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="aspect-square bg-gradient-to-br from-primary via-blue-700 to-blue-900 rounded-[3rem] shadow-2xl overflow-hidden relative group p-1">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.1),transparent_50%)]"></div>

                {/* الشعار في المنتصف وبحجم كبير وهيبة قوية */}
                <div className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center text-white space-y-8">
                  <motion.img
                    src="/logo.png"
                    className="w-full h-full object-contain brightness-0 invert opacity-20 group-hover:opacity-50 group-hover:scale-105 transition-all duration-1000 drop-shadow-2xl p-4"
                    alt="SASGO"
                    initial={{ scale: 0.8 }}
                    whileInView={{ scale: 1 }}
                  />
                  <div className="space-y-4">
                    <h3 className="text-3xl md:text-4xl font-black leading-tight drop-shadow-md">{t('clear_vision', 'رؤية واضحة .. مستقبل مضمون')}</h3>
                    <div className="h-1.5 w-24 bg-white/30 mx-auto rounded-full overflow-hidden">
                      <div className="h-full w-1/2 bg-white rounded-full animate-loader"></div>
                    </div>
                  </div>
                </div>
              </div>
              <div className={`absolute -bottom-10 ${i18n.language === 'ar' ? '-right-10' : '-left-10'} w-48 h-48 bg-white/80 backdrop-blur-xl p-8 rounded-[2rem] shadow-xl border border-white flex flex-col items-center justify-center text-center`}>
                <p className="text-4xl font-black text-primary mb-1">100%</p>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">{t('smart_management', 'إدارة ذكية')}</p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Contact Us Section */}
      <section id="contact-us" className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
            <h2 className="text-2xl md:text-3xl font-black text-slate-900">{t('contact_us_nav', 'تواصل معنا')}</h2>
            <p className="text-slate-500 font-bold text-base leading-relaxed">{t('contact_desc', 'فريقنا جاهز للرد على استفساراتكم على مدار الساعة')}</p>
          </div>

          <div className="container mx-auto px-6">
            <div className="flex flex-col lg:flex-row gap-16">

              {/* 📝 نموذج المراسلة (Left Side) */}
              <motion.div
                initial={{ opacity: 0, x: i18n.language === 'ar' ? -50 : 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8 }}
                className="lg:w-2/3 bg-white p-8 md:p-12 rounded-[3.5rem] shadow-2xl shadow-slate-200/50 border border-slate-50 relative overflow-hidden"
              >
                <div className={`absolute top-0 ${i18n.language === 'ar' ? 'right-0' : 'left-0'} w-32 h-32 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 ${i18n.language === 'ar' ? 'translate-x-1/2' : '-translate-x-1/2'}`} />

                <div className="relative z-10 space-y-8">
                  <div>
                    <h3 className="text-3xl font-black text-slate-900 mb-4">{t('send_message', 'أرسل لنا رسالة')}</h3>
                    <p className="text-slate-500 font-bold">{t('send_message_desc', 'اترك استفسارك هنا وسيقوم فريقنا بالرد عليك في أسرع وقت ممكن.')}</p>
                  </div>

                  <form onSubmit={handleContactSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <label className="font-black text-slate-700 text-sm">{t('full_name_label', 'الاسم الكامل')} <span className="text-rose-500">*</span></label>
                      <Input
                        required
                        value={contactData.name}
                        onChange={e => setContactData({ ...contactData, name: e.target.value })}
                        placeholder={t('enter_name', 'أدخل اسمك')}
                        className="h-14 bg-slate-50 border-none rounded-2xl font-bold focus:ring-2 ring-primary/20 transition-all"
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="font-black text-slate-700 text-sm">{t('email', 'البريد الإلكتروني')} <span className="text-rose-500">*</span></label>
                      <Input
                        required
                        type="email"
                        value={contactData.email}
                        onChange={e => setContactData({ ...contactData, email: e.target.value })}
                        placeholder="name@example.com"
                        className={`h-14 bg-slate-50 border-none rounded-2xl font-bold focus:ring-2 ring-primary/20 transition-all ${i18n.language === 'en' ? 'text-left' : 'text-right'}`}
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="font-black text-slate-700 text-sm">{t('mobile_whatsapp', 'الجوال / واتساب')} <span className="text-slate-400 text-[10px]">({t('optional', 'اختياري')})</span></label>
                      <Input
                        value={contactData.phone}
                        onChange={e => setContactData({ ...contactData, phone: e.target.value })}
                        placeholder="05XXXXXXXX"
                        className={`h-14 bg-slate-50 border-none rounded-2xl font-bold focus:ring-2 ring-primary/20 transition-all ${i18n.language === 'en' ? 'text-left' : 'text-right'}`}
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="font-black text-slate-700 text-sm">{t('company_name', 'اسم الشركة')} <span className="text-slate-400 text-[10px]">({t('optional', 'اختياري')})</span></label>
                      <Input
                        value={contactData.company}
                        onChange={e => setContactData({ ...contactData, company: e.target.value })}
                        placeholder={t('company_placeholder', 'شركة...')}
                        className="h-14 bg-slate-50 border-none rounded-2xl font-bold focus:ring-2 ring-primary/20 transition-all"
                      />
                    </div>
                    <div className="md:col-span-2 space-y-3">
                      <label className="font-black text-slate-700 text-sm">{t('subject_label', 'الموضوع')}</label>
                      <Input
                        value={contactData.subject}
                        onChange={e => setContactData({ ...contactData, subject: e.target.value })}
                        placeholder={t('subject_placeholder', 'عن ماذا تريد التحدث؟')}
                        className="h-14 bg-slate-50 border-none rounded-2xl font-bold focus:ring-2 ring-primary/20 transition-all"
                      />
                    </div>
                    <div className="md:col-span-2 space-y-3">
                      <label className="font-black text-slate-700 text-sm">{t('message_label', 'الرسالة')} <span className="text-rose-500">*</span></label>
                      <Textarea
                        required
                        rows={5}
                        value={contactData.message}
                        onChange={e => setContactData({ ...contactData, message: e.target.value })}
                        placeholder={t('message_placeholder', 'اكتب رسالتك هنا...')}
                        className="bg-slate-50 border-none rounded-[2rem] font-bold p-6 focus:ring-2 ring-primary/20 transition-all min-h-[150px]"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Button
                        type="submit"
                        disabled={isSending}
                        className="w-full md:w-auto h-16 px-12 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black text-lg shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] flex items-center gap-3"
                      >
                        {isSending ? t('sending', "جاري الإرسال...") : (
                          <>
                            <Send size={20} className={i18n.language === 'ar' ? "rotate-180" : ""} />
                            {t('submit_message', 'إرسال الرسالة')}
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </div>
              </motion.div>

              {/* 📋 معلومات التواصل (Right Side) */}
              <motion.div
                initial={{ opacity: 0, x: i18n.language === 'ar' ? 50 : -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8 }}
                className="lg:w-1/3 space-y-6"
              >
                {/* بطاقة الاتصال */}
                <div className="p-8 bg-slate-900 rounded-[3rem] text-white space-y-8 relative overflow-hidden group">
                  <div className={`absolute top-0 ${i18n.language === 'ar' ? 'right-0' : 'left-0'} w-32 h-32 bg-primary/20 rounded-full blur-3xl -translate-y-1/2 ${i18n.language === 'ar' ? 'translate-x-1/2' : '-translate-x-1/2'} group-hover:bg-primary/30 transition-all`} />

                  <h3 className="text-2xl font-black relative z-10">{t('contact_info', 'معلومات التواصل')}</h3>

                  <div className="space-y-6 relative z-10">
                    <div className="flex items-center gap-5">
                      <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center text-primary backdrop-blur-md">
                        <Phone size={28} />
                      </div>
                      <div>
                        <p className="text-slate-400 font-bold text-xs mb-1">{t('call_us', 'اتصل بنا')}</p>
                        <p className="font-black text-lg hover:text-primary transition-colors cursor-pointer" dir="ltr">{content.phone}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-5">
                      <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center text-emerald-400 backdrop-blur-md">
                        <MessageCircle size={28} />
                      </div>
                      <div>
                        <p className="text-slate-400 font-bold text-xs mb-1">{t('whatsapp', 'واتساب')}</p>
                        <p className="font-black text-lg hover:text-emerald-400 transition-colors cursor-pointer" dir="ltr">{content.whatsapp || content.phone}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-5">
                      <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center text-blue-400 backdrop-blur-md">
                        <Mail size={28} />
                      </div>
                      <div>
                        <p className="text-slate-400 font-bold text-xs mb-1">{t('email', 'البريد الإلكتروني')}</p>
                        <p className="font-black text-lg hover:text-blue-400 transition-colors cursor-pointer">{content.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-5">
                      <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center text-amber-400 backdrop-blur-md">
                        <MapPin size={28} />
                      </div>
                      <div>
                        <p className="text-slate-400 font-bold text-xs mb-1">{t('headquarters', 'المقر الرئيسي')}</p>
                        <p className="font-black text-lg">{content.address}</p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-8 border-t border-white/10 flex items-center justify-between">
                    <p className="text-slate-400 font-bold">{t('working_hours', 'ساعات العمل')}</p>
                    <div className="px-4 py-2 bg-white/5 rounded-xl text-primary font-black text-sm">
                      {t('working_hours_val', '8:00 ص - 6:00 م')}
                    </div>
                  </div>
                </div>

                {/* بطاقة إضافية */}
                <div className="p-8 bg-blue-600 rounded-[3rem] text-white text-center space-y-4">
                  <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Star size={32} className="text-yellow-400 fill-yellow-400" />
                  </div>
                  <h4 className="text-xl font-black">{t('ready_to_start', 'جاهز للبدء؟')}</h4>
                  <p className="text-blue-100 font-bold text-sm">{t('ready_to_start_desc', 'انضم لأكثر من 500 عميل يثقون في خدماتنا اللوجستية المتطورة.')}</p>
                  <Button onClick={() => navigate('/register')} className="w-full h-12 bg-white text-blue-600 hover:bg-white/90 font-black rounded-xl">
                    {t('register_now', 'سجل الآن')}
                  </Button>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* 🔍 قسم التتبع المباشر - في أسفل الصفحة */}
      <section id="tracking-section" className="py-32 bg-slate-50 relative overflow-hidden">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto bg-white rounded-[3rem] shadow-2xl shadow-slate-200 border border-slate-100 overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-2">
              <div className="p-12 md:p-16 space-y-8">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-xl font-black text-sm">
                  <Truck size={18} />
                  {t('track_live', 'تتبع مباشر')}
                </div>
                <h3 className="text-3xl md:text-4xl font-black text-slate-900 leading-tight">{t('where_is_shipment', 'اين شحنتك الآن؟')}</h3>
                <p className="text-slate-500 font-bold">{t('tracking_desc', 'أدخل رقم التتبع الخاص بك لمعرفة حالة شحنتك وموعد وصولها المتوقع بدقة.')}</p>
                <form onSubmit={handleSearch} className="space-y-4">
                  <div className="relative group">
                    <Input
                      value={searchID}
                      onChange={(e) => setSearchID(e.target.value)}
                      placeholder={t('tracking_placeholder', "رقم الشحنة (مثال: d95d47c6)")}
                      className={`h-16 px-6 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-lg focus:border-primary transition-all ${i18n.language === 'en' ? 'pl-12' : 'pr-12'}`}
                    />
                    <Search className={`absolute ${i18n.language === 'en' ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors`} size={20} />
                  </div>
                  <Button type="submit" className="w-full h-16 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black text-lg shadow-xl shadow-primary/20 transition-all hover:scale-[1.02]">
                    {t('start_tracking', 'بدء التتبع')}
                  </Button>
                </form>
              </div>
              <div className="hidden md:block relative bg-gradient-to-br from-primary to-blue-800 p-16">
                <div className="absolute inset-0 opacity-10 flex items-center justify-center">
                  <img src="/logo.png" className="w-full h-auto grayscale brightness-200" alt="" />
                </div>
                <div className="relative z-10 h-full flex flex-col justify-center items-center text-center text-white space-y-6">
                  <div className="w-24 h-24 bg-white/10 backdrop-blur-xl rounded-3xl flex items-center justify-center shadow-2xl">
                    <Globe size={48} className="animate-spin-slow" />
                  </div>
                  <h4 className="text-2xl font-black">{t('wide_network', 'شبكة واسعة')}</h4>
                  <p className="text-blue-100 font-bold">{t('wide_network_desc', 'نغطي كافة مناطق المملكة العربية السعودية بأسطول حديث ومجهز.')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>


      <Footer />
    </div>
  );
}