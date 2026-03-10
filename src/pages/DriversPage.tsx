import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    Truck, ShieldCheck, Zap, Download, CheckCircle2, Phone, Star, ArrowLeft, Menu, X, Home, User, Mail, Globe, MapPin, MessageCircle, ChevronDown
} from 'lucide-react';
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
                <div className={`w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm transition-transform duration-300 ${isOpen ? 'rotate-180 bg-primary text-white' : ''}`}>
                    <ChevronDown size={20} />
                </div>
            </button>
            <div
                className={`transition-all duration-300 ease-in-out ${isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}
            >
                <div className={`p-6 pt-0 text-slate-500 font-bold leading-relaxed border-t border-slate-100 ${i18n.language === 'en' ? 'text-left' : 'text-right'}`}>
                    {content}
                </div>
            </div>
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

    return <span ref={elementRef} className="text-4xl md:text-5xl font-black text-[#ff7a00]" dir="ltr">+{count.toLocaleString()}</span>;
};

export default function DriversPage() {
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();
    const [activeFaq, setActiveFaq] = useState<number | null>(null);

    return (
        <div className="min-h-screen bg-white overflow-x-hidden" dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
            <Navbar />

            {/* 🚛 Hero Section */}
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
                            {t('drivers_hero_title', 'مع تطبيق SAS للسائقين؛')}
                        </h1>
                        <h2 className="text-3xl md:text-5xl lg:text-6xl font-black leading-tight mb-8 text-slate-900">
                            <span className="text-[#FF7A00]">{t('drivers_hero_subtitle', 'اختر حمولتك بذكاء!')}</span>
                        </h2>
                        <p className={`text-slate-500 text-lg md:text-xl font-bold mb-10 leading-relaxed max-w-xl ${i18n.language === 'en' ? 'text-left' : 'text-right'}`}>
                            {t('drivers_hero_desc', 'مهما كان نوع الشاحنة التي تقودها، الشحنة المناسبة لك موجودة في SAS. كل ما عليك هو تثبيت تطبيق SAS للسائقين واختيار نوع مركبة النقل الخاصة بك، لتظهر لك يوميًا آلاف الشحنات من جميع الدول العربية.')}
                        </p>

                        {/* Download Buttons */}
                        <div className="flex flex-row items-center gap-4">
                            <button className="hover:scale-105 transition-transform cursor-not-allowed opacity-80" disabled title={t('coming_soon', 'قريباً')}>
                                <img src="https://naqliat.com/wp-content/uploads/2026/02/Store-download-button.png" alt={t('app_store_download', 'تحميل من متجر التطبيقات')} className="h-[45px] sm:h-[60px] w-auto" />
                            </button>
                            <button className="hover:scale-105 transition-transform cursor-not-allowed opacity-80" disabled title={t('coming_soon', 'قريباً')}>
                                <img src="https://naqliat.com/wp-content/uploads/2026/02/Store-download-button-1.png" alt={t('google_play_download', 'تحميل من جوجل بلاي')} className="h-[45px] sm:h-[60px] w-auto" />
                            </button>
                        </div>
                    </motion.div>

                    {/* Image Content */}
                    <motion.div
                        className="w-full md:w-1/2 flex justify-center md:justify-end mt-12 md:mt-0"
                        initial={{ opacity: 0, x: i18n.language === 'ar' ? -30 : 30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                    >
                        <img
                            src="https://naqliat.com/wp-content/uploads/2026/01/Rectangle-driver-1024x922.webp"
                            alt="Driver App Preview"
                            className="w-full max-w-[600px] h-auto object-contain rounded-3xl drop-shadow-2xl"
                        />
                    </motion.div>

                </div>
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
                                <AnimatedCounter end={stat.num} />
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
                        <h2 className="text-3xl md:text-5xl font-black text-slate-900">{t('drivers_benefits_title', 'مميزات تطبيق SAS للسائقين')}</h2>
                        <div className="w-24 h-2 bg-primary mx-auto rounded-full"></div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {[
                            {
                                image: "https://naqliat.com/wp-content/uploads/2026/01/driver-1-350x350.webp",
                                title: t('benefit_1_title', 'إعلان حمولة مخصص'),
                                desc: t('benefit_1_desc', 'باختيار الشاحنة الخاصة بك في SAS، سيتم عرض لك إعلانات الشحن المتعلقة بتلك الشاحنة فقط.')
                            },
                            {
                                image: "https://naqliat.com/wp-content/uploads/2026/01/driver-2-350x350.webp",
                                title: t('benefit_2_title', 'تغطية شاملة في دول الخليج'),
                                desc: t('benefit_2_desc', 'يتم تسجيل آلاف الشحنات يوميًا من جميع دول الخليج في SAS')
                            },
                            {
                                image: "https://naqliat.com/wp-content/uploads/2026/01/diver-3-350x350.webp",
                                title: t('benefit_3_title', 'الحصول على التقييمات'),
                                desc: t('benefit_3_desc', 'يمكنك بناء سمعة من خلال الحصول على تقييمات إيجابية، وستتاح لك فرص أكبر لنقل البضائع.')
                            }
                        ].map((benefit, i) => (
                            <motion.div
                                key={`row1-${i}`}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.2 }}
                                className="bg-slate-50 rounded-[3rem] border border-slate-100 hover:shadow-xl transition-all group overflow-hidden flex flex-col"
                            >
                                <div className="h-48 md:h-64 w-full overflow-hidden mb-6 p-4">
                                    <img
                                        src={benefit.image}
                                        alt={benefit.title}
                                        className="w-full h-full object-cover rounded-3xl group-hover:scale-105 transition-transform duration-500"
                                    />
                                </div>
                                <div className={`px-8 pb-10 flex-grow flex flex-col ${i18n.language === 'en' ? 'text-left' : 'text-right'}`}>
                                    <h3 className="text-2xl font-black text-slate-900 mb-4">{benefit.title}</h3>
                                    <p className="text-slate-500 font-bold leading-relaxed">{benefit.desc}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8">
                        {[
                            {
                                image: "https://naqliat.com/wp-content/uploads/2026/01/driver-4-350x350.webp",
                                title: t('benefit_4_title', 'البحث السريع عن الشحنات'),
                                desc: t('benefit_4_desc', 'باستخدام موقعك، يتم عرض أقرب الشحنات إليك في الوقت الفعلي')
                            },
                            {
                                image: "https://naqliat.com/wp-content/uploads/2026/01/driver-5-350x350.webp",
                                title: t('benefit_5_title', 'التفاوض مع العميل'),
                                desc: t('benefit_5_desc', 'تواصل مباشرة مع صاحب الإعلان وتفاوض بسهولة على الأجرة وشروط التحميل والتفريغ، دون أي وسطاء')
                            },
                            {
                                image: "https://naqliat.com/wp-content/uploads/2026/01/driver-6-350x350.webp",
                                title: t('benefit_6_title', 'دعم شامل لجميع أنواع الشاحنات'),
                                desc: t('benefit_6_desc', 'في SAS، دائمًا فرص لشحن البضائع لجميع أنواع الشاحنات')
                            }
                        ].map((benefit, i) => (
                            <motion.div
                                key={`row2-${i}`}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.2 }}
                                className="bg-slate-50 rounded-[3rem] border border-slate-100 hover:shadow-xl transition-all group overflow-hidden flex flex-col"
                            >
                                <div className="h-48 md:h-64 w-full overflow-hidden mb-6 p-4">
                                    <img
                                        src={benefit.image}
                                        alt={benefit.title}
                                        className="w-full h-full object-cover rounded-3xl group-hover:scale-105 transition-transform duration-500"
                                    />
                                </div>
                                <div className={`px-8 pb-10 flex-grow flex flex-col ${i18n.language === 'en' ? 'text-left' : 'text-right'}`}>
                                    <h3 className="text-2xl font-black text-slate-900 mb-4">{benefit.title}</h3>
                                    <p className="text-slate-500 font-bold leading-relaxed">{benefit.desc}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ❓ FAQ Section */}
            <section className="py-24 bg-white">
                <div className="max-w-4xl mx-auto px-6">
                    <div className="text-center mb-16 space-y-4">
                        <h2 className="text-3xl md:text-5xl font-black text-slate-900">{t('faq_title', 'الأسئلة الشائعة')}</h2>
                        <div className="w-24 h-2 bg-primary mx-auto rounded-full"></div>
                    </div>

                    <div className="space-y-4">
                        {[
                            {
                                question: t('drivers_faq_1_q', "هل يجب دفع رسوم للبحث عن إعلانات الشحن؟"),
                                answer: t('drivers_faq_1_a', "لا، البحث وعرض اعلانات الشحن في جميع دول العربية مجاني. يمكن للسائقين البحث بين آلاف الإعلانات في أي وقت من اليوم باستخدام هاتف محمول فقط")
                            },
                            {
                                question: t('drivers_faq_2_q', "هل هذا التطبيق مخصص لنقل البضائع داخل المدينة فقط ؟"),
                                answer: t('drivers_faq_2_a', "لا، بعض إعلانات الشحن تكون من مدينة إلى أخرى. كما أن بعض أصحاب الشحنات بحاجة إلى سائقين للنقل بين الدول، وبالتالي إذا كنت سائق ترانزيت، يمكنك أيضًا استخدام SAS لنقل البضائع بين الدول")
                            },
                            {
                                question: t('drivers_faq_3_q', "كيف يمكنني العثور على الشحنات؟"),
                                answer: t('drivers_faq_3_a', "يوجد طريقتان للبحث بسرعة عن الشحنات. في الطريقة الأولى، يمكنك تشغيل تحديد الموقع (GPS) على هاتفك ليتم البحث تلقائيًا عن الشحنات في محيطك. في الطريقة الثانية، يمكنك إدخال اسم المدينة المبدأ والوجهة لتعرض لك الشحنات المتاحة.")
                            },
                            {
                                question: t('drivers_faq_4_q', "هل يتم الإعلان عن شحنات لسيارتي الخاصة؟"),
                                answer: t('drivers_faq_4_a', "يتم الإعلان عن شحنات لجميع أنواع سيارات النقل، سواء كانت خفيفة أو ثقيلة، مثل البيك أب، الشاحنات، والتريلات في SAS. تنوع الشحنات المتاحة في التطبيق يسمح لك بنقل البضائع وكسب دخل جيد باستخدام أي نوع من المركبات التي تملكها")
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
            <section className="py-24 bg-slate-50 rounded-[4rem] mx-4 md:mx-8">
                <div className="max-w-5xl mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-5xl font-black text-slate-900 mb-6">{t('drivers_how_it_works_title', 'كيف تبدأ رحلتك؟')}</h2>
                        <p className="text-slate-500 font-bold">{t('drivers_how_it_works_subtitle', 'بضع خطوات بسيطة وتصبح جزءاً من عائلة SAS')}</p>
                    </div>

                    <div className="space-y-12">
                        {[
                            { step: "01", title: t('drivers_step_1_title', 'حمل التطبيق'), desc: t('drivers_step_1_desc', 'قم بتحميل تطبيق SAS للسائقين من متجر التطبيقات.') },
                            { step: "02", title: t('drivers_step_2_title', 'سجل بياناتك'), desc: t('drivers_step_2_desc', 'أدخل معلوماتك الشخصية، رخصة القيادة، وبيانات الشاحنة.') },
                            { step: "03", title: t('drivers_step_3_title', 'انتظر التفعيل'), desc: t('drivers_step_3_desc', 'سيقوم فريقنا بمراجعة طلبك وتفعيله خلال أقل من 24 ساعة.') },
                            { step: "04", title: t('drivers_step_4_title', 'ابدأ العمل'), desc: t('drivers_step_4_desc', 'استقبل طلبات الحمولات، وافق على الأنسب لك، وابدأ في كسب المال.') }
                        ].map((step, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, x: i % 2 === 0 ? (i18n.language === 'ar' ? 50 : -50) : (i18n.language === 'ar' ? -50 : 50) }}
                                whileInView={{ opacity: 1, x: 0 }}
                                className={`flex flex-col md:flex-row items-center gap-8 bg-white p-8 rounded-[2.5rem] shadow-sm relative`}
                            >
                                <div className={`text-6xl font-black text-primary/10 absolute top-4 ${i18n.language === 'en' ? 'right-8' : 'left-8'} select-none`}>
                                    {step.step}
                                </div>
                                <div className="w-16 h-16 bg-primary rounded-2xl flex flex-shrink-0 items-center justify-center text-white font-black text-2xl z-10">
                                    {i + 1}
                                </div>
                                <div className={`text-center ${i18n.language === 'en' ? 'md:text-left' : 'md:text-right'}`}>
                                    <h4 className="text-2xl font-black text-slate-900 mb-2">{step.title}</h4>
                                    <p className="text-slate-500 font-bold">{step.desc}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* 📞 Call to action */}
            <section className="py-24 bg-[#0A5CF5] relative overflow-hidden my-20 mx-4 md:mx-8 rounded-[3rem]">
                <div className="max-w-4xl mx-auto px-6 relative z-10 text-center text-white flex flex-col items-center">
                    <h2 className="text-4xl md:text-5xl lg:text-6xl font-black mb-6 leading-tight">
                        {t('cta_drivers_title', 'جاهز لتغيير ملامح عملك كسائق؟')}
                    </h2>
                    <p className="text-white/90 text-xl font-bold mb-12">
                        {t('cta_drivers_desc', 'لا تضيع المزيد من الوقت في البحث عن الحمولات يدوياً.')}
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-6 w-full max-w-2xl">
                        <button className="flex items-center justify-center gap-3 bg-white text-[#0A5CF5] rounded-full px-8 py-4 font-bold text-xl hover:bg-slate-50 transition-colors w-full sm:w-auto">
                            {t('register_as_driver', 'سجل الآن كسائق')}
                        </button>
                        <button className="flex items-center justify-center gap-3 text-white font-bold text-xl hover:text-white/80 transition-colors w-full sm:w-auto px-8 py-4">
                            <span className="bg-white/10 p-2 rounded-full">
                                <MessageCircle size={24} />
                            </span>
                            {t('contact_representatives', 'تواصل مع ممثلينا')}
                        </button>
                    </div>
                </div>
            </section>

            <Footer />
        </div>
    );
}
