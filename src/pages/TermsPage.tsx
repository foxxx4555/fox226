import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { FileText, Shield, Globe, Scale, AlertCircle, Mail, Clock, Lock } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';

const TermsPage = () => {
    const { t, i18n } = useTranslation();
    const isRtl = i18n.language === 'ar';

    return (
        <div className="min-h-screen bg-[#F8FAFC]" dir={isRtl ? "rtl" : "ltr"}>
            <Navbar />

            {/* Hero Image Section */}
            <div className="relative h-[400px] w-full mt-24 px-4 md:px-8 max-w-7xl mx-auto rounded-[3rem] overflow-hidden shadow-2xl">
                <img
                    src="https://images.unsplash.com/photo-1450101499163-c8848c66ca85?ixlib=rb-4.0.3&auto=format&fit=crop&w=1600&q=80"
                    alt="Terms background"
                    className="absolute inset-0 h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/40 to-transparent"></div>
                <div className="absolute bottom-10 left-0 right-0 text-center z-10">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="inline-flex items-center justify-center p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 mb-4"
                    >
                        <FileText size={40} className="text-white" />
                    </motion.div>
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-4xl md:text-6xl font-black text-white px-4 drop-shadow-md"
                    >
                        {t('terms_hero_title', 'الشروط والأحكام')}
                    </motion.h1>
                    <p className="text-white/80 font-bold mt-2">{t('terms_last_update', 'آخر تحديث: مارس 2026')}</p>
                </div>
            </div>

            {/* Policy Content */}
            <div className="max-w-5xl mx-auto pt-16 px-6 pb-24">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-[3rem] p-8 md:p-14 shadow-2xl border border-slate-100 space-y-12"
                >
                    <div className="text-center mb-8">
                        <h2 className="text-3xl md:text-5xl font-black text-slate-900 mb-4">{t('terms_agreement_title', 'اتفاقية شروط الخدمة')}</h2>
                        <p className="text-slate-500 font-bold text-lg max-w-2xl mx-auto">
                            {t('terms_agreement_desc', 'يرجى قراءة هذه الشروط والأحكام بعناية قبل استخدام منصة SAS. وصولك إلى المنصة يعني موافقتك الكاملة على هذه البنود.')}
                        </p>
                    </div>

                    <div className={`prose prose-slate prose-lg max-w-none space-y-12 prose-headings:font-black prose-headings:text-slate-800 prose-p:text-slate-600 prose-p:leading-relaxed prose-li:font-bold prose-strong:text-blue-600 border-t border-slate-100 pt-12 ${isRtl ? 'text-right' : 'text-left'}`}>

                        {/* Intro */}
                        <section className="bg-blue-50/50 p-8 rounded-[2.5rem] border border-blue-100/50 relative overflow-hidden">
                            <div className={`absolute top-0 ${isRtl ? 'right-0' : 'left-0'} p-4 opacity-10`}>
                                <Shield size={120} className="text-blue-600" />
                            </div>
                            <p className="text-blue-900 font-bold leading-relaxed relative z-10 text-xl">
                                {t('terms_intro_section', 'من خلال استمرارك في استخدام هذا الموقع والتطبيق، فإنك توافق على الالتزام بالشروط والأحكام الخاصة به. إذا وجدت أيًا من هذه الشروط غير مقبولة، فيرجى التوقف عن التصفح. إن استمرارك في استخدام الموقع سيعتبر عقدا قانونيا ملزما بينك وبين شركة SAS.')}
                            </p>
                        </section>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
                            <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100">
                                <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-blue-700">
                                    <Scale size={24} />
                                    {t('terms_binding_title', 'اتفاق ملزم')}
                                </h3>
                                <p className="text-sm leading-relaxed">{t('terms_binding_desc', 'تتضمن شروط وأحكام موقع SAS هذه القواعد والأحكام التي تحكم وصولك إلى الموقع الإلكتروني واستخدامك له، وهي تمثل اتفاقًا ملزمًا بين SAS («نحن») وبينك أو الكيان الذي تمثله («أنت»).')}</p>
                            </div>
                            <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100">
                                <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-blue-700">
                                    <Globe size={24} />
                                    {t('terms_law_title', 'القانون الساري')}
                                </h3>
                                <p className="text-sm leading-relaxed">{t('terms_law_desc', 'تعد هذه الشروط سجلًا إلكترونيًا وفقًا لأحكام قوانين تقنية المعلومات المعمول بها، والأحكام المتعلقة بالسجلات الإلكترونية في القوانين المختلفة كدولة الإمارات وغيرها.')}</p>
                            </div>
                        </div>

                        {/* Eligibility */}
                        <section className="space-y-4">
                            <h3 className="text-2xl font-black mt-10 mb-6 flex items-center gap-3">
                                <span className="h-10 w-2 bg-blue-600 rounded-full inline-block"></span>
                                {t('terms_eligibility_title', 'أهلية التعاقد')}
                            </h3>
                            <p>{t('terms_eligibility_desc', 'أنت تقر وتضمن أنك تتمتع بالأهلية القانونية والقدرة الكاملة على إبرام عقد قانوني أي أنك قد بلغت سن الثامنة عشرة على الأقل، ولديك الأهلية القانونية للتعاقد وفقًا للقوانين والأنظمة المعمول بها.')}</p>
                        </section>

                        {/* Usage */}
                        <section className="space-y-4">
                            <h3 className="text-2xl font-black mt-10 mb-6 flex items-center gap-3">
                                <span className="h-10 w-2 bg-blue-600 rounded-full inline-block"></span>
                                {t('terms_usage_title', 'استخدام الموقع والتطبيق')}
                            </h3>
                            <p>{t('terms_usage_desc', 'يجوز لك الوصول إلى محتوى الموقع والمنتجات والخدمات أو الميزات وفقًا لهذه الشروط والأحكام. وتتعهد بالالتزام بهذه الشروط وكافة القوانين واللوائح والأنظمة المعمول بها والمتعلقة باستخدامك للموقع.')}</p>
                            <p className="bg-amber-50 p-6 rounded-2xl border-r-4 border-amber-400 text-amber-900 font-bold">
                                {t('terms_usage_warning', 'تتعهد وتضمن أن جميع المعلومات التي تقدمها إلى SAS صحيحة ودقيقة وسارية. وفي حال تقديم أي معلومات غير صحيحة، أو انتحال شخصية، فإنك تتحمل كامل المسؤولية عن العواقب المترتبة على ذلك.')}
                            </p>
                            <p>{t('terms_usage_info', 'وفي حال ثبوت عدم صحة المعلومات، يحق لـ SAS منعك فورًا من الوصول إلى الموقع دون الإخلال بأي حقوق أخرى، كما يحق لها اتخاذ أي إجراءات قانونية تراها مناسبة.')}</p>
                        </section>

                        {/* Changes */}
                        <section className="space-y-4">
                            <h3 className="text-2xl font-black mt-10 mb-6 flex items-center gap-3">
                                <span className="h-10 w-2 bg-blue-600 rounded-full inline-block"></span>
                                {t('terms_changes_title', 'التغييرات والتحديثات')}
                            </h3>
                            <p>{t('terms_changes_desc', 'يجوز لنا، من وقت لآخر، تعديل أو إيقاف أي من الموقع أو المنتجات أو الخدمات أو الميزات, أو تغيير أو إزالة أي وظيفة من وظائفها، كليًا أو جزئيًا. وباستمرارك في الاستخدام بعد التعديل، فإنك تقبل الشروط الجديدة.')}</p>
                        </section>

                        {/* Prohibited Use */}
                        <section className="space-y-4">
                            <h3 className="text-2xl font-black mt-10 mb-6 flex items-center gap-3">
                                <span className="h-10 w-2 bg-blue-600 rounded-full inline-block"></span>
                                {t('terms_prohibited_title', 'الاستخدام المشروع والممنوع')}
                            </h3>
                            <p>{t('terms_prohibited_desc', 'كشرط لاستخدامك، تتعهد بعدم استخدامه لأي غرض غير مشروع. كما تتعهد بعدم استخدام المنصة بأي طريقة قد تؤدي إلى إتلاف أو تعطيل أو إثقال كاهل أي خادم تابع لشركة SAS أو الشبكة المتصلة به.')}</p>
                            <p>{t('terms_prohibited_info', 'لا يجوز لك محاولة الوصول غير المصرح به إلى أي جزء من الموقع أو أي حسابات أخرى أو أنظمة حاسوبية متصلة بخوادمنا سواء عن طريق الاختراق أو التنقيب عن كلمات المرور.')}</p>
                        </section>

                        {/* Property Rights */}
                        <section className="space-y-4">
                            <h3 className="text-2xl font-black mt-10 mb-6 flex items-center gap-3">
                                <span className="h-10 w-2 bg-blue-600 rounded-full inline-block"></span>
                                {t('terms_intellectual_title', 'حقوق الملكية والترخيص')}
                            </h3>
                            <p>{t('terms_intellectual_desc', 'نحن نمتلك كافة الحقوق والعناوين والمصالح المتعلقة بالخدمات المقدمة، بما في ذلك جميع التقنيات وحقوق الملكية الفكرية المرتبطة بها. نمنحك ترخيصًا محدودًا وقابلًا للإلغاء وغير حصري لاستخدام الخدمات بما يتوافق مع هذه الشروط.')}</p>
                            <div className="bg-slate-50 p-6 rounded-2xl space-y-3">
                                <p className="font-bold underline">{t('terms_restrictions_title', 'قيود الترخيص:')}</p>
                                <ul className={`list-disc list-inside space-y-2 text-sm italic`}>
                                    <li>{t('terms_restriction_1', 'لا يجوز تعديل أو توزيع أو العبث بأي محتوى موجود على الموقع.')}</li>
                                    <li>{t('terms_restriction_2', 'يُمنع إجراء هندسة عكسية أو تفكيك لبرمجيات الموقع.')}</li>
                                    <li>{t('terms_restriction_3', 'يُمنع إعادة بيع أو منح ترخيص من الباطن للميزات أو الخدمات.')}</li>
                                </ul>
                            </div>
                        </section>

                        {/* Indemnity & Liability */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-y border-slate-100 py-12 text-right">
                            <section className={`space-y-4 ${isRtl ? 'text-right' : 'text-left'}`}>
                                <h3 className="text-xl font-black flex items-center gap-2 text-red-600">
                                    <AlertCircle size={24} />
                                    {t('terms_indemnity_title', 'التعويض')}
                                </h3>
                                <p className="text-sm">{t('terms_indemnity_desc', 'تتعهد بالدفاع عنّا وتعويضنا وإبراء ذمتنا من أي خسائر تنشأ عن استخدامك الخاطئ للموقع أو إخلالك بهذه الشروط والأحكام أو مخالفتك للقوانين المعمول بها.')}</p>
                            </section>
                            <section className={`space-y-4 ${isRtl ? 'text-right' : 'text-left'}`}>
                                <h3 className="text-xl font-black flex items-center gap-2 text-red-600">
                                    <Lock size={24} />
                                    {t('terms_liability_title', 'حدود المسؤولية')}
                                </h3>
                                <p className="text-sm">{t('terms_liability_desc', 'لن نكون نحن ولا أي من الشركات التابعة لنا مسؤولين عن أي أضرار مباشرة أو غير مباشرة أو تبعية ناتجة عن استخدام الخدمات أو عدم القدرة على استخدامها، بما في ذلك فقدان الأرباح أو البيانات.')}</p>
                            </section>
                        </div>

                        {/* Privacy policy & communication */}
                        <section className="space-y-4">
                            <h3 className="text-2xl font-black mt-10 mb-6 flex items-center gap-3">
                                <span className="h-10 w-2 bg-blue-600 rounded-full inline-block"></span>
                                {t('terms_privacy_contact_title', 'سياسة الخصوصية والتواصل')}
                            </h3>
                            <p>{t('terms_privacy_desc', 'قد يطلب منك تقديم معلوماتك الشخصية للاستفادة من خدماتنا. وسنبذل كل الجهود المعقولة لحماية بياناتك وعدم مشاركتها إلا في الحدود اللازمة لتقديم الخدمة المطلوبة عبر شركائنا.')}</p>
                            <p>{t('terms_comm_consent', 'بموجب موافقتك، فإنك تقبل تلقي المراسلات منا عبر هاتفك المسجل أو بريدك الإلكتروني لأغراض التحديثات والخدمات، ولا تعد هذه الرسائل "سبام" أو مزعجة.')}</p>
                            <div className="bg-blue-600 text-white p-8 rounded-3xl mt-8 shadow-xl relative overflow-hidden group">
                                <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform"></div>
                                <h4 className="text-2xl font-black mb-4 flex items-center gap-3">
                                    <Mail />
                                    {t('terms_contact_us_title', 'تواصل معنا')}
                                </h4>
                                <p className="mb-4 opacity-90">{t('terms_contact_us_desc', 'نرحب بملاحظاتكم وآرائكم بشأن سياساتنا أو خدماتنا. يمكنكم مراسلتنا في أي وقت:')}</p>
                                <a href="mailto:pr@sas3pl.com" className="text-2xl font-black underline hover:text-blue-100 transition-colors">pr@sas3pl.com</a>
                            </div>
                        </section>

                        {/* General provisions */}
                        <section className="space-y-4 pt-8">
                            <h3 className="text-2xl font-black mt-10 mb-6 flex items-center gap-3">
                                <span className="h-10 w-2 bg-blue-600 rounded-full inline-block"></span>
                                {t('terms_force_majeure_title', 'أحكام عامة والنزاعات')}
                            </h3>
                            <div className="space-y-6">
                                <div>
                                    <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
                                        <Clock size={18} />
                                        {t('terms_fm_subtitle', 'القوة القاهرة:')}
                                    </h4>
                                    <p className="text-sm">{t('terms_fm_desc', 'لا نتحمل مسؤولية أي تأخير أو إخفاق في التنفيذ ناتج عن أسباب خارجة عن سيطرتنا كالظواهر الطبيعية أو الحروب أو انقطاع الخدمات العامة.')}</p>
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
                                        <Scale size={18} />
                                        {t('terms_disputes_subtitle', 'القانون والنزاعات:')}
                                    </h4>
                                    <p className="text-sm">{t('terms_disputes_desc', 'تخضع هذه الشروط لقوانين دولة الإمارات العربية المتحدة. ويتم الفصل في أي نزاع عن طريق التحكيم وفقاً للقوانين المتبعة، على أن تكون اللغة العربية/الإنجليزية هي المعتمدة.')}</p>
                                </div>
                            </div>
                        </section>
                    </div>
                </motion.div>
            </div>
            <Footer />
        </div>
    );
};

export default TermsPage;
