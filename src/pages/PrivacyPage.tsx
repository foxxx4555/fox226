import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Lock, Mail, Phone, ChevronRight, CheckCircle2, Download, Menu, X, Instagram, HelpCircle, Home, User, Truck, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const PrivacyPage = () => {
    const navigate = useNavigate();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    return (
        <div className="min-h-screen bg-[#F8FAFC]" dir="rtl">
            {/* 🚀 Header الجديد الخاص بصفحات السياسة والشروط */}
            <nav className="fixed top-4 left-0 right-0 z-[100] mx-4 md:mx-auto max-w-7xl bg-white rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-slate-100 transition-all duration-300 flex items-center justify-between p-2 md:pr-4 md:pl-2" dir="rtl">
                {/* القسم الأيمن */}
                <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
                    <div className="hidden lg:flex items-center gap-1 px-3 py-2 text-slate-700 font-bold cursor-pointer hover:bg-slate-50 rounded-xl transition-colors">
                        <span className="text-xs">AR</span>
                        <ChevronRight size={14} className="rotate-90 text-slate-400" />
                    </div>
                    <div className="flex items-center gap-2">
                        <Button className="bg-[#FF9800] hover:bg-[#F57C00] text-white font-bold h-10 md:h-12 px-4 md:px-6 rounded-[1.5rem] shadow-sm transition-all text-[11px] md:text-[13px] flex items-center gap-2">
                            تطبيق نقليات للسائقين
                            <Download size={14} />
                        </Button>
                        <Button className="hidden sm:flex bg-[#005274] hover:bg-[#003d57] text-white font-bold h-10 md:h-12 px-4 md:px-6 rounded-[1.5rem] shadow-sm transition-all text-[11px] md:text-[13px] items-center gap-2">
                            تطبيق نقليات للعملاء
                            <Download size={14} />
                        </Button>
                    </div>
                    <Button variant="ghost" size="icon" className="lg:hidden rounded-full w-10 h-10 bg-slate-50 border border-slate-200" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
                        {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
                    </Button>
                </div>

                {/* المنتصف */}
                <div className="hidden lg:flex items-center gap-8 text-slate-700 mx-auto">
                    <button onClick={() => navigate('/customers')} className="font-bold hover:text-primary transition-colors text-sm flex items-center gap-2 text-slate-600">العملاء <User size={16} /></button>
                    <button onClick={() => navigate('/drivers')} className="font-bold hover:text-primary transition-colors text-sm flex items-center gap-2 text-slate-600">السائقين <Truck size={16} /></button>
                    <button onClick={() => navigate('/info')} className="font-bold hover:text-primary transition-colors text-sm flex items-center gap-2 text-slate-600">معلومات عامة <Home size={16} /></button>
                </div>

                {/* اليسار */}
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
                                <Button className="w-full h-14 rounded-xl bg-[#005274] text-white font-bold">تطبيق نقليات للعملاء</Button>
                                <Button className="w-full h-14 rounded-xl bg-[#FF9800] text-white font-bold">تطبيق نقليات للسائقين</Button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* الصورة الرئيسية تحت الهيدر */}
            <div className="relative h-[400px] w-full mt-24 px-4 md:px-8 max-w-7xl mx-auto rounded-[3rem] overflow-hidden shadow-2xl">
                <img
                    src="https://images.unsplash.com/photo-1589829085413-56de8ae18c73?ixlib=rb-4.0.3&auto=format&fit=crop&w=1600&q=80"
                    alt="Privacy background"
                    className="absolute inset-0 h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/40 to-transparent"></div>
                <div className="absolute bottom-10 left-0 right-0 text-center z-10">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="inline-flex items-center justify-center p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 mb-4"
                    >
                        <ShieldCheck size={32} className="text-white" />
                    </motion.div>
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-4xl md:text-6xl font-black text-white px-4 drop-shadow-md"
                    >
                        سياسة الخصوصية
                    </motion.h1>
                </div>
            </div>

            {/* محتوى السياسة */}
            <div className="max-w-4xl mx-auto pt-16 px-6 pb-24" dir="rtl">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-[3rem] p-8 md:p-14 shadow-2xl border border-slate-100 space-y-12"
                >
                    <div className="text-center mb-8">
                        <h1 className="text-3xl md:text-5xl font-black text-slate-900 mb-2">سياسة الخصوصية</h1>
                        <p className="text-slate-500 font-bold">كل ما يخص التزامنا بحماية بياناتك الشخصية</p>
                    </div>

                    {/* Professional truck image */}
                    <div className="w-full h-64 md:h-80 rounded-3xl overflow-hidden mb-8 shadow-lg">
                        <img
                            src="https://images.unsplash.com/photo-1586864387789-228af816027c?q=80&w=2071&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
                            alt="Professional truck"
                            className="w-full h-full object-cover"
                        />
                    </div>
                    {/* مقدمة */}
                    <section className="space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-2 bg-blue-600 rounded-full"></div>
                            <h2 className="text-2xl font-black text-slate-800">مقدمة</h2>
                        </div>
                        <p className="text-slate-600 leading-relaxed font-bold text-lg text-justify">
                            تلتزم شركة <span className="text-blue-600 font-black">SAS Transport</span> بالحفاظ على خصوصية مستخدميها وحماية بياناتهم الشخصية. تنطبق سياسة الخصوصية هذه على استخدامك لجميع خدماتنا، ومحتوياتنا، وميزاتنا، وتقنياتنا، ووظائفنا، وجميع المواقع الإلكترونية، والتطبيقات المحمولة، أو أي منصات أو تطبيقات أخرى نقدمها لك (ويشار إليها مجتمعين بـ "الخدمات/المنصة").
                        </p>
                        <p className="text-slate-500 font-medium leading-relaxed bg-slate-50 p-6 rounded-3xl border-r-4 border-slate-200">
                            توضح هذه السياسة أنواع المعلومات التي نقوم بجمعها عنك، والأغراض من جمعها، وكيفية استخدامنا لها، وطريقة مشاركتها، وسبل حماية البيانات الشخصية التي يتم إنشاؤها أو إدخالها أو تقديمها أو نشرها أو إرسالها أو تخزينها أو عرضها عند استخدامك للخدمات.
                        </p>
                    </section>

                    {/* تعريف ونطاق المعلومات */}
                    <section className="space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-2 bg-blue-600 rounded-full"></div>
                            <h2 className="text-2xl font-black text-slate-800">تعريف ونطاق المعلومات الشخصية</h2>
                        </div>
                        <p className="text-slate-600 font-bold leading-relaxed">
                            "المعلومات الشخصية" تعني جميع المعلومات التي يمكن أن ترتبط بشخص محدد أو التعرف عليه، بما في ذلك على سبيل المثال لا الحصر:
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {[
                                "الاسم والعنوان الكامل",
                                "بيانات الاتصال والبريد الإلكتروني",
                                "كلمة المرور المشفرة",
                                "بيانات الحساب المصرفي",
                                "بيانات بطاقة الائتمان أو الخصم",
                                "أي معلومات تقدم طوعاً عند الاستخدام"
                            ].map((item, index) => (
                                <div key={index} className="flex items-center gap-3 p-4 bg-blue-50/50 rounded-2xl border border-blue-100/50">
                                    <CheckCircle2 size={18} className="text-blue-500 flex-shrink-0" />
                                    <span className="font-bold text-slate-700 text-sm">{item}</span>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* معايير الأمان */}
                    <section className="space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-2 bg-blue-600 rounded-full"></div>
                            <h2 className="text-2xl font-black text-slate-800">معايير الأمان وحماية المعلومات</h2>
                        </div>
                        <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-full opacity-5">
                                <img
                                    src="https://images.unsplash.com/photo-1589829085413-56de8ae18c73?ixlib=rb-4.0.3&auto=format&fit=crop&w=1600&q=80"
                                    alt="Privacy background"
                                    className="absolute inset-0 h-full w-full object-cover"
                                />
                                <Lock size={200} className="-ml-20 -mt-20" />
                            </div>
                            <p className="relative z-10 text-slate-300 font-bold leading-loose">
                                تولي الشركة أهمية قصوى لأمن المعلومات وخصوصية المستخدمين. لذلك، يتم تخزين البيانات الشخصية على خوادم آمنة، مع اتخاذ التدابير التقنية والتنظيمية اللازمة للحماية من الوصول غير المصرح به أو الضياع أو التلف.
                            </p>
                            <div className="mt-6 relative z-10 flex items-center gap-4 p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10">
                                <div className="bg-emerald-500 p-2 rounded-xl text-white"><Lock size={20} /></div>
                                <p className="text-xs font-black">نستخدم خدمات تزويد تخزين سحابي حاصلين على شهادات ISO/IEC 27001 لضمان أعلى مستوى من الحماية.</p>
                            </div>
                        </div>
                    </section>

                    {/* Footer الجديد المخصص لصفحات السياسة */}
                    <footer className="bg-slate-900 text-white py-16 px-6 mt-10 rounded-t-[3rem]">
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
                                    <a href="#" className="hover:text-white transition-colors flex items-center gap-2">إنستغرام</a>
                                    <a href="#" className="hover:text-white transition-colors flex items-center gap-2">الدعم</a>
                                </div>
                                <div className="flex flex-col gap-4">
                                    <button className="text-right hover:text-white transition-colors text-[#005274]">تطبيق نقليات العملاء</button>
                                    <button className="text-right hover:text-white transition-colors text-[#FF9800]">تطبيق نقليات للسائقين</button>
                                </div>
                                <div className="flex flex-col gap-4">
                                    <button className="text-right hover:text-white transition-colors">Manage consent</button>
                                </div>
                            </div>
                        </div>
                    </footer>
                </motion.div>
            </div>
        </div>
    );
};

export default PrivacyPage;
