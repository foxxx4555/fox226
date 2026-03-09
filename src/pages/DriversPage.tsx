import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    Truck, ShieldCheck, Zap, Download, CheckCircle2, Phone, Star, ArrowLeft, Menu, X, Home, User, Mail, Globe, MapPin, MessageCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const DriversPage = () => {
    const navigate = useNavigate();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    return (
        <div className="min-h-screen bg-white font-['Cairo'] overflow-x-hidden" dir="rtl">
            {/* 🚀 Navigation Bar */}
            <nav className="fixed top-0 left-0 right-0 z-[100] bg-white/95 backdrop-blur-md border-b border-slate-100 py-3 px-6 md:px-12 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4">
                    <Button
                        onClick={() => navigate('/login')}
                        className="bg-slate-900 hover:bg-slate-800 text-white font-black px-6 rounded-xl h-10 text-sm hidden md:flex"
                    >
                        دخول السائقين
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="md:hidden"
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    >
                        {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                    </Button>
                </div>

                <div className="hidden md:flex items-center gap-8">
                    <button onClick={() => navigate('/info')} className="font-bold text-slate-600 hover:text-primary transition-colors text-sm">معلومات عامة</button>
                    <button onClick={() => navigate('/')} className="font-bold text-slate-600 hover:text-primary transition-colors text-sm">الرئيسية</button>
                    <button className="font-bold text-primary text-sm border-b-2 border-primary pb-1">السائقين</button>
                </div>

                <div className="cursor-pointer" onClick={() => navigate('/')}>
                    <img src="/logo.png" alt="SASGO Logo" className="h-10 md:h-12 w-auto object-contain" />
                </div>
            </nav>

            {/* 📱 Mobile Menu */}
            {isMobileMenuOpen && (
                <div className="fixed inset-0 z-[99] bg-white pt-24 px-8 flex flex-col md:hidden">
                    <button onClick={() => { navigate('/'); setIsMobileMenuOpen(false); }} className="py-4 text-xl font-black text-slate-800 border-b border-slate-50 text-right">الرئيسية</button>
                    <button onClick={() => { navigate('/info'); setIsMobileMenuOpen(false); }} className="py-4 text-xl font-black text-slate-800 border-b border-slate-50 text-right">معلومات عامة</button>
                    <div className="mt-8 flex flex-col gap-4">
                        <Button onClick={() => navigate('/login')} className="h-14 bg-slate-900 text-white font-black text-lg rounded-2xl">دخول السائقين</Button>
                        <Button onClick={() => navigate('/register')} className="h-14 bg-primary text-white font-black text-lg rounded-2xl">تسجيل جديد</Button>
                    </div>
                </div>
            )}

            {/* 🚛 Hero Section */}
            <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 bg-slate-900 overflow-hidden">
                <div className="absolute inset-0 opacity-20">
                    <img
                        src="https://images.unsplash.com/photo-1591768793355-74d7afb360ce?q=80&w=2070&auto=format&fit=crop"
                        className="w-full h-full object-cover"
                        alt="Truck"
                    />
                </div>
                <div className="max-w-7xl mx-auto px-6 relative z-10 text-center text-white">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                    >
                        <span className="inline-block px-4 py-1.5 bg-primary/20 text-primary border border-primary/30 rounded-full text-sm font-black mb-6">احصل على حمولاتك بضغطة زر</span>
                        <h1 className="text-4xl md:text-7xl font-black leading-tight mb-8">
                            كن شريكاً في <br /> <span className="text-primary italic">نجاح SASGO</span>
                        </h1>
                        <p className="text-slate-300 text-lg md:text-xl max-w-2xl mx-auto font-bold mb-12">
                            انضم لأكبر شبكة سائقين في الشرق الأوسط. احصل على أرباح فورية، دعم على مدار الساعة، وتحكم كامل في وقتك.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center gap-4 justify-center">
                            <Button className="h-16 px-12 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black text-xl shadow-2xl shadow-primary/20 gap-3 group">
                                <Download size={24} className="group-hover:animate-bounce" />
                                حمل تطبيق السائقين
                            </Button>
                            <Button variant="outline" onClick={() => navigate('/register')} className="h-16 px-12 rounded-2xl border-white/20 text-white hover:bg-white/10 font-black text-xl backdrop-blur-sm">
                                ابدأ التسجيل الآن
                            </Button>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* ⭐ Benefits Section */}
            <section className="py-24 bg-white">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-16 space-y-4">
                        <h2 className="text-3xl md:text-5xl font-black text-slate-900">لماذا تختار SASGO؟</h2>
                        <div className="w-24 h-2 bg-primary mx-auto rounded-full"></div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {[
                            {
                                icon: <Zap className="text-amber-500" size={40} />,
                                title: "أرباح فورية",
                                desc: "نظام دفع سريع وشفاف يضمن وصول مستحقاتك في الموعد المحدد دون تأخير."
                            },
                            {
                                icon: <ShieldCheck className="text-primary" size={40} />,
                                title: "أمان وموثوقية",
                                desc: "نحن نوفر لك الحماية الكاملة في كل رحلة عبر أنظمة تتبع متطورة ودعم ميداني."
                            },
                            {
                                icon: <Truck className="text-emerald-500" size={40} />,
                                title: "حمولات مستمرة",
                                desc: "بفضل شبكة عملائنا الواسعة، ستجد دائماً الحمولات المناسبة لشاحنتك في كل وقت."
                            }
                        ].map((benefit, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.2 }}
                                className="p-10 bg-slate-50 rounded-[3rem] border border-slate-100 hover:shadow-xl transition-all group"
                            >
                                <div className="p-4 bg-white rounded-2xl w-fit mb-6 shadow-sm group-hover:scale-110 transition-transform">
                                    {benefit.icon}
                                </div>
                                <h3 className="text-2xl font-black text-slate-900 mb-4">{benefit.title}</h3>
                                <p className="text-slate-500 font-bold leading-relaxed">{benefit.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* 🛠️ How it works */}
            <section className="py-24 bg-slate-50 rounded-[4rem] mx-4 md:mx-8">
                <div className="max-w-5xl mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-5xl font-black text-slate-900 mb-6">كيف تبدأ رحلتك؟</h2>
                        <p className="text-slate-500 font-bold">بضع خطوات بسيطة وتصبح جزءاً من عائلة SASGO</p>
                    </div>

                    <div className="space-y-12">
                        {[
                            { step: "01", title: "حمل التطبيق", desc: "قم بتحميل تطبيق SASGO للسائقين من متجر التطبيقات." },
                            { step: "02", title: "سجل بياناتك", desc: "أدخل معلوماتك الشخصية، رخصة القيادة، وبيانات الشاحنة." },
                            { step: "03", title: "انتظر التفعيل", desc: "سيقوم فريقنا بمراجعة طلبك وتفعيله خلال أقل من 24 ساعة." },
                            { step: "04", title: "ابدأ العمل", desc: "استقبل طلبات الحمولات، وافق على الأنسب لك، وابدأ في كسب المال." }
                        ].map((step, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, x: i % 2 === 0 ? 50 : -50 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                className="flex flex-col md:flex-row items-center gap-8 bg-white p-8 rounded-[2.5rem] shadow-sm relative"
                            >
                                <div className="text-6xl font-black text-primary/10 absolute top-4 left-8 select-none">
                                    {step.step}
                                </div>
                                <div className="w-16 h-16 bg-primary rounded-2xl flex flex-shrink-0 items-center justify-center text-white font-black text-2xl z-10">
                                    {i + 1}
                                </div>
                                <div className="text-center md:text-right">
                                    <h4 className="text-2xl font-black text-slate-900 mb-2">{step.title}</h4>
                                    <p className="text-slate-500 font-bold">{step.desc}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* 📞 Call to action */}
            <section className="py-32 bg-primary relative overflow-hidden my-20 rounded-[4rem] mx-4 md:mx-8 shadow-2xl">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-slate-900/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

                <div className="max-w-4xl mx-auto px-6 relative z-10 text-center text-white">
                    <h2 className="text-4xl md:text-6xl font-black mb-8 leading-tight">جاهز لتغيير ملامح <br /> عملك كسائق؟</h2>
                    <p className="text-white/80 text-xl font-bold mb-12">لا تضيع المزيد من الوقت في البحث عن الحمولات يدوياً.</p>
                    <div className="flex flex-col sm:flex-row items-center gap-4 justify-center">
                        <Button className="h-16 px-12 rounded-2xl bg-white text-primary hover:bg-slate-50 font-black text-xl shadow-xl transition-all hover:scale-105">
                            سجل الآن كسائق
                        </Button>
                        <Button variant="ghost" className="h-16 px-8 text-white hover:bg-white/10 font-bold text-lg gap-2">
                            تواصل مع ممثلينا <MessageCircle size={20} />
                        </Button>
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
                        <button onClick={() => navigate('/privacy')} className="text-slate-400 hover:text-primary font-black text-sm transition-colors">سياسة الخصوصية</button>
                        <button onClick={() => navigate('/terms')} className="text-slate-400 hover:text-primary font-black text-sm transition-colors">الشروط والأحكام</button>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default DriversPage;
