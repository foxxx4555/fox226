import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    ChevronRight, Download, Menu, X, Instagram, HelpCircle, Home, User, Truck, CheckCircle2, ShieldCheck, Mail, Phone, FileText, Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const CountUp = ({ end, duration = 2, suffix = "" }: { end: number, duration?: number, suffix?: string }) => {
    const [count, setCount] = useState(0);
    const [ref, setRef] = useState<HTMLElement | null>(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (!ref) return;
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    observer.disconnect();
                }
            },
            { threshold: 0.1 }
        );
        observer.observe(ref);
        return () => observer.disconnect();
    }, [ref]);

    useEffect(() => {
        if (!isVisible) return;
        let start = 0;
        const increment = end / (duration * 60);
        const timer = setInterval(() => {
            start += increment;
            if (start >= end) {
                setCount(end);
                clearInterval(timer);
            } else {
                setCount(Math.floor(start));
            }
        }, 1000 / 60);
        return () => clearInterval(timer);
    }, [isVisible, end, duration]);

    return <span ref={setRef}>{isVisible ? count.toLocaleString() : "0"}{suffix}</span>;
};

const TestimonialCard = ({ name, text }: { name: string, text: string }) => (
    <div className="flex-shrink-0 w-[400px] bg-white p-8 rounded-[2rem] border border-slate-100 relative group hover:bg-[#005274] transition-all duration-500 mx-4 shadow-sm hover:shadow-xl">
        <div className="flex gap-1 mb-4">
            {[1, 2, 3, 4, 5].map(star => (
                <img key={star} src="https://naqliat.com/wp-content/uploads/2026/01/star-red.svg" className="w-4 h-4" alt="star" />
            ))}
        </div>
        <p className="text-slate-600 font-bold leading-relaxed mb-6 group-hover:text-white transition-colors">"{text}"</p>
        <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#FF9800] rounded-full flex items-center justify-center text-white font-black">{name[0]}</div>
            <h4 className="font-black text-slate-900 group-hover:text-white transition-colors">{name}</h4>
        </div>
    </div>
);

const TestimonialMarquee = ({ testimonials, reverse = false }: { testimonials: { name: string, text: string }[], reverse?: boolean }) => {
    return (
        <div className="flex overflow-hidden py-4 select-none">
            <motion.div
                initial={{ x: reverse ? "-50%" : "0%" }}
                animate={{ x: reverse ? "0%" : "-50%" }}
                transition={{
                    duration: 30,
                    repeat: Infinity,
                    repeatType: "reverse",
                    ease: "easeInOut"
                }}
                className="flex flex-nowrap"
            >
                {[...testimonials, ...testimonials].map((t, i) => (
                    <TestimonialCard key={i} {...t} />
                ))}
            </motion.div>
        </div>
    );
};

const FAQItem = ({ question, answer }: { question: string, answer: React.ReactNode }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="border-b border-white/10 overflow-hidden">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full py-6 flex items-center justify-between text-right group"
            >
                <motion.div
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.3 }}
                    className="text-slate-400 group-hover:text-[#FF9800]"
                >
                    <ChevronRight size={24} className="rotate-90" />
                </motion.div>
                <span className="text-lg md:text-xl font-black text-white group-hover:text-[#FF9800] transition-colors">{question}</span>
            </button>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="pb-6"
                    >
                        <div className="text-slate-400 font-bold leading-relaxed">{answer}</div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const GeneralInfoPage = () => {
    const navigate = useNavigate();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    return (
        <div className="min-h-screen bg-[#F8FAFC]">
            {/* 🚀 Header الاحترافي المثبت */}
            <nav className="fixed top-4 left-0 right-0 z-[100] mx-4 md:mx-auto max-w-7xl bg-white rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-slate-100 transition-all duration-300 flex items-center justify-between p-2 md:pr-4 md:pl-2" dir="rtl">
                {/* القسم الأيمن (اللغة والتحميل) */}
                <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
                    <div className="hidden lg:flex items-center gap-1 px-3 py-2 text-slate-700 font-bold cursor-pointer hover:bg-slate-50 rounded-xl transition-colors">
                        <span className="text-xs">AR</span>
                        <ChevronRight size={14} className="rotate-90 text-slate-400" />
                    </div>
                    <div className="flex items-center gap-2">
                        <Button onClick={() => navigate('/drivers')} className="bg-[#FF9800] hover:bg-[#F57C00] text-white font-bold h-10 md:h-12 px-4 md:px-6 rounded-[1.5rem] shadow-sm transition-all text-[11px] md:text-[13px] flex items-center gap-2">
                            تطبيق SAS للسائقين
                            <Download size={14} />
                        </Button>
                        <Button className="hidden sm:flex bg-[#005274] hover:bg-[#003d57] text-white font-bold h-10 md:h-12 px-4 md:px-6 rounded-[1.5rem] shadow-sm transition-all text-[11px] md:text-[13px] items-center gap-2">
                            تطبيق SAS للعملاء
                            <Download size={14} />
                        </Button>
                    </div>
                    <Button variant="ghost" size="icon" className="lg:hidden rounded-full w-10 h-10 bg-slate-50 border border-slate-200" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
                        {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
                    </Button>
                </div>

                {/* المنتصف (الروابط) */}
                <div className="hidden lg:flex items-center gap-8 text-slate-700 mx-auto">
                    <button onClick={() => navigate('/customers')} className="font-bold hover:text-primary transition-colors text-sm flex items-center gap-2 text-slate-600">العملاء <User size={16} /></button>
                    <button onClick={() => navigate('/drivers')} className="font-bold hover:text-primary transition-colors text-sm flex items-center gap-2 text-slate-600">السائقين <Truck size={16} /></button>
                    <button onClick={() => navigate('/info')} className="font-bold text-primary hover:text-primary transition-colors text-sm flex items-center gap-2">معلومات عامة <Home size={16} /></button>
                </div>

                {/* اليسار (اللوجو) */}
                <div className="flex-shrink-0 cursor-pointer pl-4" onClick={() => navigate('/')}>
                    <img src="/logo.png" alt="SAS Transport Logo" className="h-10 md:h-12 w-auto object-contain drop-shadow-sm" />
                </div>
            </nav>

            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed inset-0 z-[90] bg-white pt-32 pb-10 px-8 flex flex-col lg:hidden overflow-y-auto"
                    >
                        <div className="space-y-4 text-right" dir="rtl">
                            <button onClick={() => { navigate('/info'); setIsMobileMenuOpen(false); }} className="w-full text-xl font-black text-slate-800 py-4 border-b border-slate-50 flex items-center justify-end gap-3"><Home size={20} /> معلومات عامة</button>
                            <button onClick={() => { navigate('/drivers'); setIsMobileMenuOpen(false); }} className="w-full text-xl font-black text-slate-800 py-4 border-b border-slate-50 flex items-center justify-end gap-3"><Truck size={20} /> السائقين</button>
                            <button onClick={() => { navigate('/customers'); setIsMobileMenuOpen(false); }} className="w-full text-xl font-black text-slate-800 py-4 border-b border-slate-50 flex items-center justify-end gap-3"><User size={20} /> العملاء</button>

                            <div className="pt-8 flex flex-col gap-4">
                                <Button className="w-full h-14 rounded-xl bg-[#005274] text-white font-bold">تطبيق SAS للعملاء</Button>
                                <Button onClick={() => { navigate('/drivers'); setIsMobileMenuOpen(false); }} className="w-full h-14 rounded-xl bg-[#FF9800] text-white font-bold">تطبيق SAS للسائقين</Button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 🚛 Hero Section - البانر الرئيسي المطلوب */}
            <section className="relative h-[650px] md:h-[750px] w-full pt-28 px-4 md:px-8 max-w-7xl mx-auto overflow-hidden">
                <div className="relative h-full w-full rounded-[3rem] overflow-hidden shadow-2xl border-4 border-white transform hover:scale-[1.01] transition-transform duration-700">
                    <img
                        src="https://images.unsplash.com/photo-1542296332-2e4473faf563?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
                        alt="Truck on highway"
                        className="absolute inset-0 h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-slate-900/80 via-slate-900/40 to-transparent"></div>

                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 md:p-12 z-20">
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8 }}
                            className="space-y-6"
                        >
                            <h1 className="text-4xl md:text-7xl lg:text-8xl font-black text-white drop-shadow-lg leading-tight md:leading-snug">
                                شريككم الموثوق للنقل<br />في الشرق الأوسط
                            </h1>
                            <p className="text-white/80 text-lg md:text-2xl font-bold max-w-2xl mx-auto drop-shadow-md">
                                حلول لوجستية متكاملة تربط الأسواق وتدعم نمو أعمالكم
                            </p>

                            <div className="flex flex-col sm:flex-row items-center gap-4 mt-12 justify-center">
                                <Button onClick={() => navigate('/drivers')} className="bg-[#FF9800] hover:bg-[#F57C00] text-white font-black h-14 md:h-16 px-8 md:px-12 rounded-full shadow-2xl transition-all hover:scale-105 hover:translate-y-[-4px] text-base md:text-xl flex items-center gap-3 w-full sm:w-auto overflow-hidden group">
                                    <Download size={22} className="group-hover:animate-bounce" />
                                    تطبيق SAS للسائقين
                                </Button>
                                <Button className="bg-[#005274] hover:bg-[#003d57] text-white font-black h-14 md:h-16 px-8 md:px-12 rounded-full shadow-2xl transition-all hover:scale-105 hover:translate-y-[-4px] text-base md:text-xl flex items-center gap-3 w-full sm:w-auto overflow-hidden group">
                                    <Download size={22} className="group-hover:animate-bounce" />
                                    تطبيق SAS للعملاء
                                </Button>
                            </div>
                        </motion.div>
                    </div>

                    {/* شعار عائم خفيف */}
                    <div className="absolute top-10 right-10 opacity-20 hidden md:block">
                        <img src="/logo.png" className="h-20 w-auto brightness-0 invert" alt="" />
                    </div>
                </div>
            </section>

            {/* 📊 Statistics Section - الأرقام والإحصائيات تحت الصورة مباشرة */}
            <section className="relative z-20 -mt-10 md:-mt-20 px-6">
                <div className="max-w-7xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 40 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 bg-white/80 backdrop-blur-2xl p-8 md:p-12 rounded-[3rem] shadow-2xl border border-white/50" dir="rtl"
                    >
                        {[
                            { label: "الدول النشطة", value: 11, suffix: "+" },
                            { label: "الإعلانات اليومية للحمولات", value: 10000, suffix: "+" },
                            { label: "عدد السائقين النشطين", value: 100000, suffix: "+" },
                            { label: "شركات النقل النشطة", value: 3000, suffix: "+" }
                        ].map((stat, idx) => (
                            <div key={idx} className="text-center space-y-1 group">
                                <div className="text-3xl md:text-5xl font-black text-[#FF9800] drop-shadow-sm tracking-tighter flex items-center justify-center gap-1">
                                    <CountUp end={stat.value} suffix={stat.suffix} />
                                </div>
                                <div className="text-slate-500 font-bold text-[10px] md:text-sm uppercase tracking-wide leading-tight px-2">
                                    {stat.label}
                                </div>
                                <div className="w-8 h-1 bg-slate-100 mx-auto rounded-full group-hover:w-12 group-hover:bg-[#FF9800] transition-all duration-500"></div>
                            </div>
                        ))}
                    </motion.div>
                </div>
            </section>

            {/* 📱 App Showcase Section - عرض التطبيق بشكل فخم */}
            <section className="py-24 bg-white relative overflow-hidden">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                        {/* النص والمحتوى (يمين في RTL) */}
                        <motion.div
                            initial={{ opacity: 0, x: 50 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.8 }}
                            className="order-2 lg:order-1 text-right space-y-8" dir="rtl"
                        >
                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#FF9800]/10 text-[#FF9800] rounded-full font-black text-sm border border-[#FF9800]/20">
                                <Zap size={18} />
                                التكنولوجيا في خدمتك
                            </div>
                            <h2 className="text-3xl md:text-5xl font-black text-slate-900 leading-tight">
                                مع تطبيق <span className="text-[#005274]">ساس ترانسبورت</span>:<br />
                                <span className="text-[#FF9800]">اختر حمولتك بذكاء!</span>
                            </h2>
                            <p className="text-lg text-slate-600 font-bold leading-relaxed">
                                مهما كان نوع الشاحنة التي تقودها، الشحنة المناسبة لك موجودة في ساس ترانسبورت. كل ما عليك هو تثبيت التطبيق واختيار نوع مركبة النقل الخاصة بك، لتظهر لك يومياً آلاف الشحنات من جميع أنحاء المملكة.
                            </p>

                            <div className="space-y-4 pt-4">
                                {[
                                    { icon: <CheckCircle2 className="text-[#FF9800]" />, text: "تتبع لحظي دقيق لكافة الشحنات" },
                                    { icon: <CheckCircle2 className="text-[#FF9800]" />, text: "سهولة في اختيار وتأكيد الحمولات" },
                                    { icon: <CheckCircle2 className="text-[#FF9800]" />, text: "دعم فني متواصل على مدار الساعة" }
                                ].map((item, i) => (
                                    <div key={i} className="flex items-center gap-3 justify-start flex-row-reverse">
                                        <span className="text-slate-700 font-black">{item.text}</span>
                                        {item.icon}
                                    </div>
                                ))}
                            </div>

                            <div className="pt-8">
                                <Button className="bg-[#FF9800] hover:bg-[#F57C00] text-white font-black h-16 px-12 rounded-2xl shadow-xl shadow-[#FF9800]/20 transition-all hover:scale-105 flex items-center gap-3 text-lg">
                                    <Download size={22} />
                                    تحميل التطبيق الآن
                                </Button>
                            </div>
                        </motion.div>

                        {/* 📱 Mobile Mockup Section (Center/Left) */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 1, type: 'spring' }}
                            className="order-1 lg:order-2 relative flex justify-center gap-4 py-12"
                        >
                            {/* Driver App Mockup */}
                            <div className="relative z-20 w-[240px] md:w-[280px] aspect-[9/19] bg-slate-950 rounded-[2.5rem] border-[6px] border-slate-800 shadow-2xl overflow-hidden group hover:scale-105 transition-transform duration-500">
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-5 bg-slate-800 rounded-b-xl z-30" />
                                <div className="absolute inset-0 bg-slate-50 flex flex-col pt-6">
                                    <div className="px-4 py-3 flex items-center justify-between bg-white border-b border-slate-100">
                                        <img src="/logo.png" className="h-8 w-auto object-contain" alt="SASGO Logo" />
                                        <Menu size={16} className="text-slate-400" />
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-3 space-y-4">
                                        <div className="bg-[#005274] p-5 rounded-3xl text-white shadow-xl relative overflow-hidden group/card">
                                            <div className="absolute top-0 right-0 p-2 opacity-20">
                                                <Truck size={40} />
                                            </div>
                                            <div className="flex justify-between items-center mb-4">
                                                <span className="text-[9px] bg-white/20 px-2 py-0.5 rounded-full font-bold">ACTIVE JOB</span>
                                                <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                                            </div>
                                            <p className="text-[10px] font-bold opacity-70 mb-1">Shipment #2941</p>
                                            <p className="text-[14px] font-black tracking-tight">Riyadh → Dammam</p>
                                        </div>
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center px-1">
                                                <p className="text-[11px] font-black text-slate-800">AVAILABLE LOADS</p>
                                                <div className="w-1.5 h-1.5 rounded-full bg-[#FF9800]" />
                                            </div>
                                            {[1, 2].map(i => (
                                                <div key={i} className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 hover:border-[#FF9800]/30 transition-colors">
                                                    <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center text-orange-500">
                                                        <Zap size={18} />
                                                    </div>
                                                    <div className="flex-1 space-y-1.5">
                                                        <div className="h-2.5 w-24 bg-slate-200 rounded-full" />
                                                        <div className="h-2 w-16 bg-slate-100 rounded-full" />
                                                    </div>
                                                    <ChevronRight size={14} className="text-slate-300 rotate-180" />
                                                </div>
                                            ))}
                                            {/* Logo Item (3rd Slot) */}
                                            <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                                                <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center">
                                                    <img src="/logo.png" className="w-8 h-8 object-contain opacity-50 grayscale" alt="" />
                                                </div>
                                                <div className="flex-1 space-y-1.5">
                                                    <div className="h-2.5 w-20 bg-slate-100 rounded-full" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="h-14 bg-white border-t border-slate-100 flex items-center justify-around px-2 pb-2">
                                    <div className="p-2 rounded-xl bg-slate-50 text-[#005274]"><Home size={20} /></div>
                                    <div className="p-2 rounded-xl text-slate-300"><Truck size={20} /></div>
                                    <div className="p-2 rounded-xl text-slate-300"><User size={20} /></div>
                                </div>
                            </div>

                            {/* Decorative Elements */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[140%] h-[100%] bg-gradient-to-tr from-[#005274]/10 to-orange-500/10 rounded-full blur-[120px] -z-10" />
                        </motion.div>
                    </div>
                </div>
            </section>



            {/* 🏢 Shippers Showcase Section - مخصص للعملاء/الشاحنين */}
            <section className="py-24 relative overflow-hidden bg-slate-50">
                <div className="max-w-7xl mx-auto px-6 relative z-10">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center bg-white rounded-[4rem] p-8 md:p-12 border-4 border-[#005274]/10 shadow-2xl">
                        {/* صورة العميل (يمين في RTL) */}
                        <motion.div
                            initial={{ opacity: 0, x: 50 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.8 }}
                            className="relative order-2 lg:order-1"
                        >
                            <div className="relative z-10 rounded-[3.5rem] overflow-hidden shadow-2xl border-4 border-white bg-white aspect-square max-w-md mx-auto">
                                <img
                                    src="https://naqliat.com/wp-content/uploads/2026/01/shipper-pic-1024x993.webp"
                                    className="w-full h-full object-cover"
                                    alt="Shipper"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#005274]/20 to-transparent opacity-60"></div>
                            </div>
                        </motion.div>

                        {/* النص والمحتوى (يسار في RTL) */}
                        <motion.div
                            initial={{ opacity: 0, x: -50 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.8 }}
                            className="text-right space-y-8 order-1 lg:order-2" dir="rtl"
                        >
                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#005274]/10 text-[#005274] rounded-full font-black text-sm border border-[#005274]/20">
                                <User size={18} />
                                إرسال شحناتك بذكاء
                            </div>
                            <h2 className="text-3xl md:text-5xl font-black text-slate-900 leading-tight">
                                مع تطبيق SAS <span className="text-[#005274]">للعملاء؛</span><br />
                                ارسل شحنتك بطريقة <span className="text-[#FF9800]">ذكية!</span>
                            </h2>
                            <p className="text-lg text-slate-600 font-bold leading-relaxed">
                                مهما كان نوع الشحنة التي ترغب في نقلها، وسيلة النقل المناسبة لحمل بضاعتك متوفرة في SAS. كل ما عليك هو تثبيت تطبيق SAS وتسجيل تفاصيل شحنتك، ليصل عرض نقل بضاعتك إلى آلاف السائقين النشطين في جميع الدول العربية.
                            </p>

                            <div className="pt-8 flex gap-4 justify-start">
                                <Button className="bg-[#005274] hover:bg-[#003d57] text-white font-black h-16 px-12 rounded-2xl shadow-xl shadow-[#005274]/20 transition-all hover:scale-105 flex items-center gap-3 text-lg">
                                    <Download size={22} />
                                    تطبيق SAS للعملاء
                                </Button>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* 🌟 Triple Feature Grid - مميزاتنا المصورة */}
            <section className="py-24 bg-white relative overflow-hidden">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                        {[
                            {
                                img: "https://naqliat.com/wp-content/uploads/2026/01/image1-350x350.webp",
                                title: "إدارة سريعة وذكية لنقل البضائع:",
                                desc: "يقدم SAS تطبيقين مبتكرين للسائقين وللعملاء، لتمكّنهم من إدارة شحناتهم بسرعة وذكاء وسهولة تامة، مع تجربة سلسة تجعل النقل أكثر أمانًا وراحة"
                            },
                            {
                                img: "https://naqliat.com/wp-content/uploads/2026/01/image2-350x350.webp",
                                title: "نشاط واسع في جميع الدول العربية:",
                                desc: "توفر SAS إمكانية نقل البضائع عبر مسارات متعددة مع تغطية شاملة في الدول العربية. هذا الامر يجعل عمليات النقل أكثر سرعة وموثوقية للمستخدمين."
                            },
                            {
                                img: "https://naqliat.com/wp-content/uploads/2026/01/image3-350x350.webp",
                                title: "تنوع كاملة في اسطول النقل:",
                                desc: "يوفر SAS أسطولًا متنوعًا من شاحنات نقل البضائع، يتيح نقل جميع أنواع الشحنات بمختلف الأحجام والظروف، مع إمكانية مطابقة كل شحنة مع السيارة الأنسب بسرعة وفعالية."
                            }
                        ].map((feature, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.2 }}
                                className="text-right space-y-6 group" dir="rtl"
                            >
                                <div className="overflow-hidden rounded-[2.5rem] shadow-xl border-4 border-slate-50 aspect-square">
                                    <img src={feature.img} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={feature.title} />
                                </div>
                                <h3 className="text-2xl font-black text-slate-900 group-hover:text-[#005274] transition-colors">{feature.title}</h3>
                                <p className="text-slate-500 font-bold leading-relaxed">{feature.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* 🌍 Coverage Section - نطاق التغطية */}
            <section className="py-24 bg-slate-50 relative overflow-hidden">
                <div className="max-w-7xl mx-auto px-6 relative z-10">
                    <div className="flex flex-col lg:flex-row items-center gap-16">
                        <motion.div
                            initial={{ opacity: 0, x: 50 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            className="flex-1 text-right space-y-6" dir="rtl"
                        >
                            <h2 className="text-3xl md:text-5xl font-black text-slate-900 leading-tight">نطاق تغطية خدمات النقل</h2>
                            <p className="text-lg text-slate-600 font-bold leading-relaxed">
                                تغطي خدمات SAS في المملكة العربية السعودية، العراق، الإمارات، الأردن، البحرين، الكويت، مصر و قطر، ويتم نقل البضائع بسرعة وموثوقية.
                            </p>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6">
                                {["السعودية", "العراق", "الإمارات", "الأردن", "البحرين", "الكويت", "مصر", "قطر"].map((country, i) => (
                                    <div key={i} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 text-center font-black text-[#005274] hover:shadow-md transition-shadow">
                                        {country}
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            className="flex-1"
                        >
                            <img src="https://naqliat.com/wp-content/uploads/2026/01/Rectangle-76-1024x922.webp" className="rounded-[3rem] shadow-2xl border-8 border-white" alt="Coverage Map" />
                        </motion.div>
                    </div>
                </div>
            </section>
            {/* ⭐ Testimonials Marquee Section - آراء العملاء بتصميم متحرك */}
            <section className="py-24 bg-white overflow-hidden" dir="rtl">
                <div className="max-w-7xl mx-auto px-6 mb-16 text-center space-y-4">
                    <h2 className="text-3xl md:text-5xl font-black text-slate-900">ماذا يقول عملاؤنا؟</h2>
                    <div className="w-24 h-2 bg-[#FF9800] mx-auto rounded-full"></div>
                </div>

                <div className="relative space-y-8">
                    {/* Row 1: Drivers - صف السائقين */}
                    <TestimonialMarquee
                        testimonials={[
                            { name: "محمد", text: "لقد كنت أعمل كسائق شاحنة منذ عشر سنوات، ولكن منذ أن تعرفت على تطبيق SAS، أصبحت تكاليفي أقل وأصبحت قادرًا على إدارة ساعات عملي بالطريقة التي أريده." },
                            { name: "خالد", text: "لقد أزال SAS جميع الصعوبات التي كنت أواجهها في العثور على شحنات مناسبة. كلما أردت تحميل شحنة، أفتح هذا التطبيق وأتفق مع صاحب الشحنة في وقت قصير." },
                            { name: "صالح", text: "عمل سائق الشاحنة مليء بالصعوبات. نضطر لقضاء أيام وليالي طويلة على الطرق، لكن مع الطريقة الجديدة التي تقدمها SAS، نحن الآن نقضي وقتًا أقل على الطريق ويمكننا قضاء وقت أكثر مع عائلاتنا." },
                            { name: "احمد", text: "لقد عملت في صناعة النقل لمدة ثلاثين عامًا، كنت سائقًا، وكان لدي شركة نقل، وأيضًا كنت منتجًا للبضائع، لكنني لم أرَ أبدًا حلاً يناسب كل من السائق وصاحب الشحنة. SAS استطاع أن يفعل ذلك." }
                        ]}
                    />

                    {/* Row 2: Shippers - صف العملاء */}
                    <TestimonialMarquee
                        reverse
                        testimonials={[
                            { name: "عبدالله", text: "نشحن إلى عدة دول عربية وكان تنسيق المسارات دائمًا تحديًا. SAS بسطت العملية وأصبحت اليوم أدير الشحن بكل سهولة." },
                            { name: "عبدالرحمن", text: "تطبيق SAS متوفر باللغات العربية والأردو والإنجليزية، مما يسهل استخدامه على جميع أعضاء الفريق حتى من لا يجيدون العربية." },
                            { name: "سلمان", text: "إمكانية نشر الإعلانات دون تكلفة وإدارة شحناتي مجانًا أمر رائع بالنسبة لي، ولم أعد بحاجة إلى الوسطاء أو التكاليف الإضافية." },
                            { name: "ماجد", text: "بضائعي متنوعة، وكان العثور على الشاحنة المناسبة دائمًا تحديًا. مع SAS، أجد السائق المناسب لكل نوع شحنة في أقل وقت ممكن." },
                            { name: "فهد", text: "قبل SAS، كان تنسيق المسارات بين المدن والدول تحديًا كبيرًا. اليوم، أصبح بإمكاني إرسال شحناتي بسهولة في السعودية ودول الشرق الأوسط." },
                            { name: "عایشه", text: "مع SAS، أجد سائقا لشحناتي دائمًا. فعدد السائقين النشطين كبير جدًا، ولم أعد أقلق بشأن العثور على الشاحنة المناسبة." }
                        ]}
                    />
                </div>
            </section>

            {/* ❓ FAQ Section - الأسئلة الشائعة */}
            <section className="py-24 bg-slate-900 relative rounded-[4rem] mx-4 md:mx-8 my-10 overflow-hidden">
                <div className="max-w-4xl mx-auto px-6 relative z-10 text-right" dir="rtl">
                    <h2 className="text-3xl md:text-5xl font-black text-white text-center mb-16">الأسئلة الشائعة</h2>

                    <div className="space-y-4">
                        {[
                            { q: "أين يقع مقر الشركة؟", a: "يقع مكتب SAS في دبي، لكن نطاق عملنا يشمل جميع الدول العربية." },
                            { q: "هل تمتلكون أسطول شاحنات خاص بكم؟", a: "لا. نحن وسيط بين العميل وشركات التوصيل الموثوقة. نوفر لك أفضل خيارات التوصيل بناءً على احتياجاتك من خلال منصتنا الرقمية." },
                            {
                                q: "من أين انزل تطبيق SAS؟",
                                a: (
                                    <div className="space-y-4">
                                        <div>
                                            <p className="mb-2">إذا كنت سائقًا، استخدم الروابط التالية (غير مفعلة حالياً):</p>
                                            <div className="flex gap-4 opacity-50">
                                                <span className="text-slate-400">Android app</span>
                                                <span className="text-slate-400">IOS app</span>
                                            </div>
                                        </div>
                                        <div>
                                            <p className="mb-2">إذا كنت عميلاً، استخدم الرابط التالي (غير مفعل حالياً):</p>
                                            <span className="text-slate-400">Android app</span>
                                        </div>
                                    </div>
                                )
                            },
                            {
                                q: "كيف استخدم التطبيق؟",
                                a: (
                                    <div className="space-y-4">
                                        <div>
                                            <p className="mb-2">لمشاهدة الفيديو التعليمي الخاص بالسائقين:</p>
                                            <span className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 text-slate-500 rounded-lg cursor-not-allowed">
                                                مشاهدة فيديو السائقين (قريباً)
                                            </span>
                                        </div>
                                        <div>
                                            <p className="mb-2">لمشاهدة الفيديو التعليمي الخاص بالعملاء:</p>
                                            <span className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 text-slate-500 rounded-lg cursor-not-allowed">
                                                مشاهدة فيديو العملاء (قريباً)
                                            </span>
                                        </div>
                                    </div>
                                )
                            },
                            { q: "هل استخدام تطبيق SAS يتطلب دفع رسوم؟", a: "لا، استخدام تطبيق SAS مجاني للسائقين و للعملاء." },
                            {
                                q: "كيف يمكنني التواصل مع الدعم؟",
                                a: (
                                    <p>
                                        يمكنك التواصل مع الدعم عبر واتساب على الرقم:
                                        <span className="text-slate-400 mr-2">0971502390201</span>
                                    </p>
                                )
                            }
                        ].map((faq, i) => (
                            <FAQItem key={i} question={faq.q} answer={faq.a} />
                        ))}
                    </div>
                </div>
            </section>



            {/* 🏢 Footer الاحترافي */}
            <footer className="bg-slate-900 text-white py-16 px-6 mt-10 rounded-t-[4rem]">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-12" dir="rtl">
                    <div className="flex flex-col gap-2">
                        <img src="/logo.png" alt="Logo" className="h-12 w-auto brightness-0 invert opacity-100 object-contain drop-shadow-md cursor-pointer" onClick={() => navigate('/')} />
                        <p className="text-slate-400 text-xs font-bold text-right pt-2">شريكك الموثوق في كل طريق</p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-16 w-full text-sm font-bold text-slate-300">
                        <div className="flex flex-col gap-4">
                            <button onClick={() => navigate('/drivers')} className="text-right hover:text-white transition-colors flex items-center gap-2 flex-row-reverse"><Truck size={14} /> صفحة السائقين</button>
                            <button onClick={() => navigate('/customers')} className="text-right hover:text-white transition-colors flex items-center gap-2 flex-row-reverse"><User size={14} /> صفحة العملاء</button>
                            <button onClick={() => navigate('/terms')} className="text-right hover:text-white transition-colors flex items-center gap-2 flex-row-reverse"><FileText size={14} /> الشروط والأحكام</button>
                            <button onClick={() => navigate('/privacy')} className="text-right hover:text-white transition-colors flex items-center gap-2 flex-row-reverse"><CheckCircle2 size={14} /> سياسة الخصوصية</button>
                        </div>
                        <div className="flex flex-col gap-4">
                            <a href="#" className="hover:text-white transition-colors flex items-center gap-2"><Instagram size={16} /> إنستغرام</a>
                            <a href="#" className="hover:text-white transition-colors flex items-center gap-2"><HelpCircle size={16} /> الدعم</a>
                        </div>
                        <div className="flex flex-col gap-4">
                            <button className="text-right hover:text-white transition-colors text-[#005274]">تطبيق SAS للعملاء</button>
                            <button className="text-right hover:text-white transition-colors text-[#FF9800]">تطبيق SAS للسائقين</button>
                        </div>
                        <div className="flex flex-col gap-4">
                            <button className="text-right hover:text-white transition-colors">Manage consent</button>
                        </div>
                    </div>
                </div>
                <div className="max-w-7xl mx-auto mt-12 pt-8 border-t border-white/5 text-center text-slate-500 text-xs font-bold">
                    <p>© {new Date().getFullYear()} SAS Transport. جميع الحقوق محفوظة.</p>
                </div>
            </footer>
        </div>
    );
};

export default GeneralInfoPage;
