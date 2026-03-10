import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
    ShieldCheck,
    Lock,
    CheckCircle2,
    Info,
    User,
    Clock,
    Shield,
    RefreshCw,
    Mail,
    ChevronLeft
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';

const SectionTitle = ({ icon: Icon, title }: { icon: any, title: string }) => (
    <div className="flex items-center gap-4 mb-6">
        <div className="h-12 w-12 bg-blue-100/50 rounded-2xl flex items-center justify-center text-blue-600">
            <Icon size={24} />
        </div>
        <h2 className="text-2xl font-black text-slate-800">{title}</h2>
    </div>
);

const PrivacyPage = () => {
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();
    const isRtl = i18n.language === 'ar';

    return (
        <div className="min-h-screen bg-[#F8FAFC]" dir={isRtl ? "rtl" : "ltr"}>
            <Navbar />

            {/* Hero Section */}
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
                        {t('privacy_hero_title', 'سياسة الخصوصية')}
                    </motion.h1>
                </div>
            </div>

            {/* Content Container */}
            <div className="max-w-4xl mx-auto pt-16 px-6 pb-24">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-[3rem] p-8 md:p-14 shadow-2xl border border-slate-100 space-y-16"
                >
                    <div className="text-center mb-12">
                        <div className="w-20 h-2 bg-blue-600 rounded-full mx-auto mb-6"></div>
                        <h1 className="text-3xl md:text-5xl font-black text-slate-900 mb-4">{t('privacy_hero_title', 'سياسة الخصوصية')}</h1>
                        <p className="text-slate-500 font-bold text-lg">{t('privacy_subtitle', 'كل ما يخص التزامنا بحماية بياناتك الشخصية')}</p>
                    </div>

                    {/* Intro */}
                    <section className="relative group">
                        <SectionTitle icon={Info} title={t('privacy_intro_title', 'مقدمة')} />
                        <div className="space-y-4">
                            <p className={`text-slate-600 leading-relaxed font-bold text-lg ${isRtl ? 'text-justify' : 'text-left'}`}>
                                {t('privacy_intro_desc', 'تلتزم شركة SAS بالحفاظ على خصوصية مستخدميها وحماية بياناتهم الشخصية. تنطبق سياسة الخصوصية هذه على استخدامك لجميع خدماتنا، ومحتوياتنا، وميزاتنا، وتقنياتنا، ووظائفنا، وجميع المواقع الإلكترونية، والتطبيقات المحمولة، والمواقع المحمولة، أو أي منصات أو تطبيقات أخرى نقدمها لك (ويُشار إليها مجتمعين بـ “الخدمات/المنصة”).')}
                            </p>
                            <p className={`text-slate-500 font-medium leading-relaxed bg-slate-50 p-6 rounded-3xl border-slate-200 ${isRtl ? 'border-r-4' : 'border-l-4'}`}>
                                {t('privacy_intro_info', 'توضح هذه السياسة أنواع المعلومات التي نقوم بجمعها عنك، والأغراض من جمعها، وكيفية استخدامنا لها، وطريقة مشاركتها، وسبل حماية المعلومات الشخصية التي يتم إنشاؤها أو إدخالها أو تقديمها أو نشرها أو إرسالها أو تخزينها أو عرضها عند استخدامك للخدمات.')}
                            </p>
                        </div>
                    </section>

                    {/* Definition */}
                    <section>
                        <SectionTitle icon={User} title={t('privacy_definition_title', 'تعريف ونطاق المعلومات الشخصية')} />
                        <p className="text-slate-600 font-bold leading-relaxed mb-8">
                            {t('privacy_definition_desc', '“المعلومات الشخصية” تعني جميع المعلومات التي يمكن ربطها بشخص محدد أو التعرف عليه، بما في ذلك على سبيل المثال لا الحصر:')}
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {[
                                t('privacy_data_item_1', "الاسم والعنوان"),
                                t('privacy_data_item_2', "بيانات الاتصال والبريد الإلكتروني"),
                                t('privacy_data_item_3', "كلمة المرور المشفرة"),
                                t('privacy_data_item_4', "بيانات الحساب المصرفي"),
                                t('privacy_data_item_5', "بيانات بطاقة الائتمان أو الخصم"),
                                t('privacy_data_item_6', "أي وسيلة دفع أخرى"),
                                t('privacy_data_item_7', "المعلومات المقدمة طوعاً عند الاستخدام")
                            ].map((item, index) => (
                                <div key={index} className="flex items-center gap-3 p-4 bg-blue-50/50 rounded-2xl border border-blue-100/50 hover:bg-white hover:shadow-md transition-all">
                                    <CheckCircle2 size={18} className="text-blue-500 flex-shrink-0" />
                                    <span className="font-bold text-slate-700 text-sm">{item}</span>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Usage & Retention */}
                    <section>
                        <SectionTitle icon={Clock} title={t('privacy_usage_title', 'استخدام والإفصاح عن المعلومات ومدة الاحتفاظ بها')} />
                        <div className="space-y-6">
                            <p className="text-slate-600 font-bold leading-relaxed">
                                {t('privacy_usage_desc', 'تُستخدم المعلومات الشخصية حصريًا للأغراض التي تم جمعها من أجلها، أو للأغراض التي حصلنا على موافقة صريحة منك بشأنها.')}
                            </p>
                            <div className="bg-slate-50 p-6 rounded-3xl space-y-4">
                                <div className="flex gap-4">
                                    <Shield size={20} className="text-blue-600 flex-shrink-0 mt-1" />
                                    <p className="text-sm font-bold text-slate-600">{t('privacy_retention_info_1', 'يتم الاحتفاظ بالمعلومات الشخصية فقط للفترة اللازمة لتحقيق الغرض الذي جُمعت من أجله.')}</p>
                                </div>
                                <div className="flex gap-4">
                                    <Shield size={20} className="text-blue-600 flex-shrink-0 mt-1" />
                                    <p className="text-sm font-bold text-slate-600">{t('privacy_retention_info_2', 'لن يتم بيعها أو تأجيرها أو تداولها، باستثناء ما تم الإفصاح عنه ضمن هذه السياسة.')}</p>
                                </div>
                                <div className="flex gap-4">
                                    <Shield size={20} className="text-blue-600 flex-shrink-0 mt-1" />
                                    <p className="text-sm font-bold text-slate-600">{t('privacy_retention_info_3', 'قد يتم مشاركة المعلومات مع شركاء خدمات موثوقين عند الحاجة لتقديم الخدمة، أو وفقًا لما يقتضيه القانون.')}</p>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* User Rights */}
                    <section>
                        <SectionTitle icon={ShieldCheck} title={t('privacy_rights_title', 'حقوق المستخدم في الوصول إلى البيانات وتعديلها')} />
                        <p className="text-slate-600 font-bold leading-relaxed mb-6">{t('privacy_rights_desc', 'للمستخدم الحق في التحكم ببياناته الشخصية من خلال:')}</p>
                        <div className="space-y-4">
                            {[
                                t('privacy_right_1', "مراجعة بياناته الشخصية المخزنة لدينا."),
                                t('privacy_right_2', "تصحيح أو تحديث بياناته الشخصية."),
                                t('privacy_right_3', "طلب حظر البيانات أو الاعتراض على معالجتها لأسباب مشروعة."),
                                t('privacy_right_4', "سحب الموافقة على جمع أو استخدام أو الاحتفاظ بالمعلومات.")
                            ].map((item, index) => (
                                <div key={index} className="flex gap-4 p-5 bg-white border border-slate-100 rounded-2xl shadow-sm hover:border-blue-200 transition-colors">
                                    <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs flex-shrink-0">
                                        {index + 1}
                                    </div>
                                    <p className="font-bold text-slate-700">{item}</p>
                                </div>
                            ))}
                        </div>
                        <div className="mt-8 p-6 bg-blue-50/50 rounded-3xl border border-blue-100 text-center">
                            <p className="text-slate-500 font-bold">{t('privacy_rights_footer', 'للاستفسارات أو ممارسة هذه الحقوق، يمكن التواصل مع فريق الدعم عبر وسائل الاتصال الرسمية.')}</p>
                        </div>
                    </section>

                    {/* Security */}
                    <section>
                        <SectionTitle icon={Lock} title={t('privacy_security_title', 'معايير الأمان وحماية المعلومات')} />
                        <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden mb-8">
                            <div className={`absolute top-0 ${isRtl ? 'left-0' : 'right-0'} w-full h-full opacity-5`}>
                                <Lock size={200} className={`${isRtl ? '-ml-20' : '-mr-20'} -mt-20`} />
                            </div>
                            <p className={`relative z-10 text-slate-300 font-bold leading-loose ${isRtl ? 'text-justify' : 'text-left'}`}>
                                {t('privacy_security_desc', 'تولي الشركة أهمية قصوى لأمن المعلومات وخصوصية المستخدمين. لذلك، يتم تخزين البيانات الشخصية على خوادم آمنة، مع اتخاذ التدابير التقنية والتنظيمية اللازمة للحماية من الوصول غير المصرح به، أو الضياع، أو التلف، أو أي استخدام غير قانوني.')}
                            </p>
                            <div className="mt-8 relative z-10 flex items-center gap-4 p-5 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10">
                                <div className="bg-[#FFC107] p-2 rounded-xl text-slate-900"><Shield size={24} /></div>
                                <p className="text-sm font-black">{t('privacy_security_cloud', 'نستخدم خدمات مزودي تخزين سحابي حاصلين على شهادات ISO/IEC 27001:2013 لضمان أعلى مستوى من الحماية.')}</p>
                            </div>
                        </div>
                        <p className="text-slate-500 text-sm font-bold text-center italic">
                            {t('privacy_security_risk', 'يُرجى ملاحظة أن نقل البيانات عبر الإنترنت ينطوي على مخاطر، وقد يتم الوصول غير المصرح به في حالات محدودة.')}
                        </p>
                    </section>

                    {/* Updates */}
                    <section>
                        <SectionTitle icon={RefreshCw} title={t('privacy_updates_title', 'التعديلات والتحديثات على سياسة الخصوصية')} />
                        <div className="space-y-4">
                            <p className="text-slate-600 font-bold leading-relaxed">
                                {t('privacy_update_1', 'تحتفظ الشركة بالحق في تعديل أو تحديث هذه السياسة من وقت لآخر بما يتوافق مع القوانين المعمول بها أو لمصلحة تحسين الخدمة.')}
                            </p>
                            <p className="text-slate-600 font-bold leading-relaxed">
                                {t('privacy_update_2', 'سيتم نشر النسخة المحدثة على منصات الشركة الرسمية. ويُعتبر استمرارك في استخدام الخدمات بعد نشر التحديث بمثابة موافقة ضمنية على التغييرات.')}
                            </p>
                            <p className="text-slate-600 font-bold leading-relaxed">
                                {t('privacy_update_3', 'إذا لم توافق على التغييرات أو طريقة معالجة بياناتك، يمكنك إغلاق حسابك والتوقف عن استخدام الخدمات في أي وقت عبر التواصل مع فريق الدعم.')}
                            </p>
                        </div>
                    </section>

                    {/* Consent */}
                    <section className="bg-blue-600 rounded-[3rem] p-10 text-white text-center">
                        <div className="h-16 w-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6 backdrop-blur-md">
                            <CheckCircle2 size={32} />
                        </div>
                        <h3 className="text-3xl font-black mb-6">{t('privacy_consent_title', 'الموافقة')}</h3>
                        <p className="text-blue-50 font-bold leading-relaxed mb-8 max-w-2xl mx-auto">
                            {t('privacy_consent_desc', 'بالنقر على زر القبول أو باستخدام الخدمات، تمنح الشركة موافقتك الصريحة على جمع واستخدام المعلومات الشخصية وفقًا لما هو منصوص عليه في هذه السياسة. وتُعتبر هذه الموافقة عقدًا قانونيًا ملزما بينك وبين الشركة وفقًا للقوانين المعمول بها.')}
                        </p>
                        <div className="inline-flex items-center gap-3 px-6 py-3 bg-white/10 rounded-2xl border border-white/20 backdrop-blur-md">
                            <Mail size={18} />
                            <span className="font-black">pr@sas3pl.com</span>
                        </div>
                    </section>

                    <div className="flex justify-center pt-8">
                        <button
                            onClick={() => navigate('/')}
                            className="flex items-center gap-2 text-slate-400 font-black hover:text-blue-600 transition-colors"
                        >
                            <ChevronLeft size={20} className={`${isRtl ? 'rotate-180' : ''}`} />
                            {t('privacy_back_home', 'العودة للرئيسية')}
                        </button>
                    </div>
                </motion.div>
            </div>
            <Footer />
        </div>
    );
};

export default PrivacyPage;
