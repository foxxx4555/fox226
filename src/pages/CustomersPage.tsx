import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Truck, ShieldCheck, Zap, Download, CheckCircle2, Globe, MapPin, Search, ChevronDown, User, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';

const AccordionItem = ({ title, content, isOpen, onClick }: { title: string, content: string, isOpen: boolean, onClick: () => void }) => {
    const { i18n } = useTranslation();
    return (
        <div className="border border-slate-100 rounded-2xl bg-slate-50 overflow-hidden transition-all duration-300">
            <button
                className={`w-full ${i18n.language === 'en' ? 'text-left' : 'text-right'} p-6 flex justify-between items-center focus:outline-none`}
                onClick={onClick}
            >
                <span className="font-black text-lg text-slate-900">{title}</span>
                <div className={`w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm transition-transform duration-300 ${isOpen ? 'rotate-180 bg-[#FFC107] text-white' : ''}`}>
                    <ChevronDown size={20} />
                </div>
            </button>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        <div className={`p-6 pt-0 text-slate-500 font-bold leading-relaxed border-t border-slate-100 ${i18n.language === 'en' ? 'text-left' : 'text-right'}`}>
                            {content}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const AnimatedCounter = ({ end, duration = 2000 }: { end: number, duration?: number }) => {
    const [count, setCount] = useState(0);
    const countRef = useRef(0);
    const elementRef = useRef<HTMLSpanElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    let startTime: number | null = null;
                    const step = (timestamp: number) => {
                        if (!startTime) startTime = timestamp;
                        const progress = Math.min((timestamp - startTime) / duration, 1);
                        const easeOut = progress * (2 - progress);
                        const currentVal = Math.floor(easeOut * end);

                        if (countRef.current !== currentVal) {
                            countRef.current = currentVal;
                            setCount(currentVal);
                        }

                        if (progress < 1) {
                            window.requestAnimationFrame(step);
                        } else {
                            setCount(end);
                        }
                    };
                    window.requestAnimationFrame(step);
                    observer.disconnect();
                }
            },
            { threshold: 0.1 }
        );

        if (elementRef.current) observer.observe(elementRef.current);
        return () => observer.disconnect();
    }, [end, duration]);

    return <span ref={elementRef} dir="ltr">+{count.toLocaleString()}</span>;
};

export default function CustomersPage() {
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();
    const [activeFaq, setActiveFaq] = useState<number | null>(null);

    return (
        <div className="min-h-screen bg-white overflow-x-hidden" dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
            <Navbar />

            {/* 📦 Hero Section */}
            <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 bg-slate-50 overflow-hidden">
                <div className="max-w-7xl mx-auto px-6 relative z-10 flex flex-col md:flex-row items-center gap-12">

                    {/* Text Content */}
                    <motion.div
                        className={`w-full md:w-1/2 flex flex-col items-start ${i18n.language === 'en' ? 'text-left' : 'text-right'}`}
                        initial={{ opacity: 0, x: i18n.language === 'ar' ? 30 : -30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8 }}
                    >
                        <h1 className="text-4xl md:text-6xl lg:text-7xl font-black leading-tight mb-4 text-slate-900">
                            {t('customers_hero_title', 'مع تطبيق SAS للعملاء؛')}
                        </h1>
                        <h2 className="text-3xl md:text-5xl lg:text-6xl font-black leading-tight mb-8 text-slate-900">
                            {t('customers_hero_subtitle', 'ارسل شحنتك بطريقة ذكية!')}
                        </h2>
                        <p className={`text-slate-500 text-lg md:text-xl font-bold mb-10 leading-relaxed max-w-xl ${i18n.language === 'en' ? 'text-left' : 'text-right'}`}>
                            {t('customers_hero_desc', 'مهما كان نوع الشحنة التي ترغب في نقلها، وسيلة النقل المناسبة لحمل بضاعتك متوفرة في SAS. كل ما عليك هو تثبيت تطبيق SAS وتسجيل تفاصيل شحنتك، ليصل عرض نقل بضاعتك إلى آلاف السائقين النشطين في جميع الدول العربية.')}
                        </p>

                        {/* Action Buttons */}
                        <div className="flex flex-wrap gap-4 items-center">
                            <a href="https://app.sas3pl.com/shipper" target="_blank" rel="noopener noreferrer">
                                <img
                                    src="https://naqliat.com/wp-content/uploads/2026/02/Store-download-button-1.png"
                                    alt={t('app_store_label', 'متجر التطبيقات')}
                                    className="h-14 w-auto hover:opacity-90 transition-opacity"
                                />
                            </a>
                            <a href="https://shipper.sas3pl.com/login" target="_blank" rel="noopener noreferrer">
                                <img
                                    src="https://naqliat.com/wp-content/uploads/2026/02/PWA-button.png"
                                    alt={t('browser_version', 'نسخة المتصفح')}
                                    className="h-14 w-auto hover:opacity-90 transition-opacity"
                                />
                            </a>
                        </div>
                    </motion.div>

                    {/* Hero Image */}
                    <motion.div
                        className="w-full md:w-1/2"
                        initial={{ opacity: 0, scale: 0.9, x: i18n.language === 'ar' ? -30 : 30 }}
                        animate={{ opacity: 1, scale: 1, x: 0 }}
                        transition={{ duration: 0.8 }}
                    >
                        <div className="relative">
                            <div className="absolute -inset-4 bg-[#FFC107]/20 rounded-[3rem] blur-2xl -z-10 animate-pulse"></div>
                            <img
                                src="https://naqliat.com/wp-content/uploads/2026/01/Rectangle-19-1024x922.webp"
                                alt="SAS Labels Preview"
                                className="w-full h-auto rounded-[3rem] shadow-2xl border-4 border-white object-cover"
                            />
                        </div>
                    </motion.div>
                </div>

                {/* Background Decoration */}
                <div className="absolute top-0 right-0 w-1/3 h-1/3 bg-[#FFC107]/5 rounded-full blur-3xl -mr-20 -mt-20"></div>
                <div className="absolute bottom-0 left-0 w-1/4 h-1/4 bg-[#005274]/5 rounded-full blur-3xl -ml-20 -mb-20"></div>
            </section>

            {/* 📊 Stats Section */}
            <section className="py-16 bg-white border-b border-slate-100 relative z-20">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 text-center">
                        {[
                            { num: 11, label: t('active_countries', "الدول النشطة") },
                            { num: 10000, label: t('daily_loads', "الإعلانات اليومية للحمولات") },
                            { num: 100000, label: t('active_drivers', "عدد السائقين النشطين") },
                            { num: 3000, label: t('active_companies', "شركات النقل النشطة") }
                        ].map((stat, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, scale: 0.9 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.1 }}
                                className="flex flex-col items-center justify-center space-y-3 p-4 rounded-3xl hover:bg-slate-50 transition-colors"
                            >
                                <div className="text-4xl md:text-5xl font-black text-[#FFC107]">
                                    <AnimatedCounter end={stat.num} />
                                </div>
                                <span className="text-slate-700 font-bold text-base md:text-lg">{stat.label}</span>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ⭐ Benefits Section */}
            <section className="py-24 bg-white">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-16 space-y-4">
                        <h2 className="text-3xl md:text-5xl font-black text-slate-900">{t('customers_benefits_title', 'لماذا تختار SAS؟')}</h2>
                        <div className="w-24 h-2 bg-[#FFC107] mx-auto rounded-full"></div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {[
                            {
                                image: "https://naqliat.com/wp-content/uploads/2026/01/shipper-1-350x350.webp",
                                title: t('c_benefit_1_title', "تغطية كاملة لكافة أنحاء المنطقة"),
                                desc: t('c_benefit_1_desc', "إعلانات الحمولات من جميع دول الخليج؛ يغطي شبكتنا جميع المسارات التجارية في السعودية والإمارات وقطر وعمان.")
                            },
                            {
                                image: "https://naqliat.com/wp-content/uploads/2026/01/shipper-2-350x350.webp",
                                title: t('c_benefit_2_title', "توفير سائق بسرعة"),
                                desc: t('c_benefit_2_desc', "الوصول المباشر إلى آلاف السائقين النشطين؛ مع التخلص من التأخيرات التقليدية، يتم تحميل وشحن بضائعك في أسرع وقت ممكن.")
                            },
                            {
                                image: "https://naqliat.com/wp-content/uploads/2026/01/shipper-3-350x350.webp",
                                title: t('c_benefit_3_title', "أسطول متنوع بالكامل"),
                                desc: t('c_benefit_3_desc', "من السطحات والبرادات إلى التريلات الثقيلة؛ لكل نوع من حمولاتك، نوفر الشاحنة المناسبة بأسرع وقت ممكن.")
                            },
                            {
                                image: "https://naqliat.com/wp-content/uploads/2026/01/shipper-4-350x350.webp",
                                title: t('c_benefit_4_title', "شحن ذكي واقتصادي"),
                                desc: t('c_benefit_4_desc', "خفض ملحوظ في التكاليف ووقت الانتظار؛ من خلال إزالة الوسطاء، انقل بضائعك بأمان أكبر وكلفة أقل.")
                            }
                        ].map((benefit, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.2 }}
                                className="bg-slate-50 rounded-[3rem] border border-slate-100 hover:shadow-xl transition-all group overflow-hidden flex flex-col md:flex-row items-center p-6"
                            >
                                <div className={`h-48 w-48 flex-shrink-0 overflow-hidden mb-6 md:mb-0 ${i18n.language === 'en' ? 'md:mr-8' : 'md:ml-8'}`}>
                                    <img
                                        src={benefit.image}
                                        alt={benefit.title}
                                        className="w-full h-full object-cover rounded-3xl group-hover:scale-105 transition-transform duration-500"
                                    />
                                </div>
                                <div className={`${i18n.language === 'en' ? 'text-left' : 'text-right'}`}>
                                    <h3 className="text-2xl font-black text-slate-900 mb-4">{benefit.title}</h3>
                                    <p className="text-slate-500 font-bold leading-relaxed">{benefit.desc}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ❓ FAQ Section */}
            <section className="py-24 bg-slate-50 rounded-[4rem] mx-4 md:mx-8">
                <div className="max-w-4xl mx-auto px-6">
                    <div className="text-center mb-16 space-y-4">
                        <h2 className="text-3xl md:text-5xl font-black text-slate-900">{t('faq_title', 'الأسئلة الشائعة')}</h2>
                        <div className="w-24 h-2 bg-[#FFC107] mx-auto rounded-full"></div>
                    </div>

                    <div className="space-y-4">
                        {[
                            {
                                question: t('customers_faq_1_q', "هل يجب دفع رسوم للإعلان عن شحنة؟"),
                                answer: t('customers_faq_1_a', "لا، الإعلان عن الشحنات مجاني تماماً. يمكنك إضافة تفاصيل شحنتك والبدء في استقبال العروض من السائقين دون أي تكلفة.")
                            },
                            {
                                question: t('customers_faq_2_q', "كيف أضمن وصول شحنتي بأمان؟"),
                                answer: t('customers_faq_2_a', "نقوم بتوثيق بيانات جميع السائقين في المنصة، كما يمكنك تتبع مسار شحنتك لحظة بلحظة من خلال التطبيق.")
                            },
                            {
                                question: t('customers_faq_3_q', "هل تتوفر شاحنات لجميع أنواع البضائع؟"),
                                answer: t('customers_faq_3_a', "نعم، أسطولنا يضم كافة أنواع الشاحنات: السطحات، البرادات، القلابات، والناقلات الثقيلة، بما يناسب احتياجات مشروعك.")
                            }
                        ].map((faq, i) => (
                            <AccordionItem
                                key={i}
                                title={faq.question}
                                content={faq.answer}
                                isOpen={activeFaq === i}
                                onClick={() => setActiveFaq(activeFaq === i ? null : i)}
                            />
                        ))}
                    </div>
                </div>
            </section>

            {/* 🛠️ How it works */}
            <section className="py-24 bg-white">
                <div className="max-w-5xl mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-5xl font-black text-slate-900 mb-6">{t('customers_how_it_works_title', 'كيف تبدأ الشحن؟')}</h2>
                        <p className="text-slate-500 font-bold">{t('customers_how_it_works_subtitle', 'خطوات بسيطة لنقل بضاعتك بأمان وسرعة')}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                        {[
                            { step: "01", title: t('customers_step_1_title', "سجل بياناتك"), desc: t('customers_step_1_desc', "أنشئ حسابك كعميل على تطبيق SAS أو من خلال الموقع.") },
                            { step: "02", title: t('customers_step_2_title', "أضف شحنتك"), desc: t('customers_step_2_desc', "ادخل تفاصيل الشحنة، نوع البضاعة، ومسار النقل المطلوب.") },
                            { step: "03", title: t('customers_step_3_title', "اختر السائق"), desc: t('customers_step_3_desc', "استلم عروض الأسعار من السائقين، قارن بين التقييمات، واعتمد الأنسب.") }
                        ].map((step, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                className="flex flex-col items-center text-center p-8 bg-slate-50 rounded-[3rem] border border-slate-100 hover:shadow-xl transition-all"
                            >
                                <div className="text-5xl font-black text-[#FFC107]/20 mb-4">{step.step}</div>
                                <h4 className="text-2xl font-black text-slate-900 mb-4">{step.title}</h4>
                                <p className="text-slate-500 font-bold leading-relaxed">{step.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* 🌐 CTA Section */}
            <section className="py-24 bg-slate-900 text-white rounded-[4rem] mx-6 mb-24 overflow-hidden relative">
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-400 via-transparent to-transparent"></div>
                </div>

                <div className="max-w-7xl mx-auto px-6 relative z-10 text-center flex flex-col items-center">
                    <h2 className="text-4xl md:text-6xl font-black mb-8 leading-tight">
                        {t('cta_customers_title', 'شحنتك تصل لأي مكان بكل سهولة!')}
                    </h2>
                    <p className="text-slate-400 text-xl font-bold leading-relaxed mb-10 max-w-2xl mx-auto">
                        {t('cta_customers_desc', 'نحن نغطي جميع الدول العربية، مما يوفر لك أكبر شبكة لوجستية لضمان وصول شحنتك إلى وجهتها في الوقت المحدد وبأفضل الأسعار.')}
                    </p>
                    <div className="flex flex-col sm:flex-row gap-6 justify-center w-full max-w-md">
                        <Button className="h-16 px-10 rounded-2xl bg-[#FFC107] hover:bg-[#ffb300] text-slate-900 font-black text-xl shadow-lg hover:shadow-[#FFC107]/40 transition-all w-full sm:w-auto">
                            {t('start_shipping_now', 'ابدأ الشحن الآن')}
                        </Button>
                        <Button variant="outline" className="h-16 px-10 rounded-2xl border-white/20 hover:bg-white/10 text-white font-black text-xl transition-all w-full sm:w-auto" onClick={() => navigate('/contact')}>
                            {t('contact_us', 'تواصل معنا')}
                        </Button>
                    </div>
                </div>
            </section>

            <Footer />
        </div>
    );
}
