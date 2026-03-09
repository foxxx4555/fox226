import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, ChevronRight, Download, Menu, X, Instagram, HelpCircle, Home, User, Truck, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const TermsPage = () => {
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
                    src="https://images.unsplash.com/photo-1519003722824-194d4455a60c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1600&q=80"
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
                        <FileText size={32} className="text-white" />
                    </motion.div>
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-4xl md:text-6xl font-black text-white px-4 drop-shadow-md"
                    >
                        الشروط والأحكام
                    </motion.h1>
                </div>
            </div>

            {/* محتوى السياسة */}
            <div className="max-w-4xl mx-auto pt-16 px-6 pb-24">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-[3rem] p-8 md:p-14 shadow-2xl border border-slate-100 space-y-12"
                >
                    <div className="text-center mb-8">
                        <h1 className="text-3xl md:text-5xl font-black text-slate-900 mb-2">الشروط والأحكام</h1>
                        <p className="text-slate-500 font-bold">القواعد والأحكام التي تحكم استخدامك للمنصة</p>
                    </div>

                    {/* Professional truck image */}
                    <div className="w-full h-64 md:h-80 rounded-3xl overflow-hidden mb-8 shadow-lg">
                        <img
                            src="https://images.unsplash.com/photo-1568605117036-add402c1755e?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
                            alt="Professional truck"
                            className="w-full h-full object-cover"
                        />
                    </div>

                    <div className="prose prose-slate prose-lg max-w-none space-y-8 prose-headings:font-black prose-headings:text-slate-800 prose-p:text-slate-600 prose-p:leading-relaxed prose-li:font-bold prose-strong:text-blue-600 border-t border-slate-200 pt-8" dir="rtl">

                        <p className="text-slate-500 font-medium leading-relaxed bg-slate-50 p-6 rounded-3xl border-r-4 border-slate-200">
                            من خلال استمرارك في استخدام هذا الموقع والتطبيق، فإنك توافق على الالتزام بالشروط والأحكام الخاصة به. إذا وجدت أيًا من هذه الشروط غير مقبولة، فيرجى التوقف عن التصفح. إن استمرارك في استخدام الموقع سيعتبر عقدا قانونيا ملزما بينك وبين شركة نقليات
                        </p>

                        <section className="space-y-4">
                            <h2 className="text-2xl font-black mt-10 mb-6 flex items-center gap-3"><span className="h-8 w-2 bg-blue-600 rounded-full inline-block"></span>الشروط والأحكام</h2>
                            <p>تتضمن شروط وأحكام موقع نقليات هذه القواعد والأحكام التي تحكم وصولك إلى الموقع الإلكتروني واستخدامك له (كما هو معرّف أدناه)، وهي تمثل اتفاقًا ملزمًا بين نقليات («نقليات» أو «نحن» أو «لنا») وبينك أو الكيان الذي تمثله («أنت»). يسري هذا الاتفاق من تاريخ دخولك إلى الموقع الإلكتروني.</p>
                            <p>وتعد هذه الشروط والأحكام سجلًا إلكترونيًا وفقًا لأحكام قانون تقنية المعلومات لسنة 2000 («قانون تقنية المعلومات») والقواعد الصادرة بموجبه، وكذلك الأحكام المتعلقة بالسجلات الإلكترونية في القوانين المختلفة كما يتم تعديلها من وقت لآخر.</p>
                            <p>أنت تقر وتضمن أنك تتمتع بالأهلية القانونية والقدرة الكاملة على إبرام عقد قانوني أي أنك قد بلغت سن الثامنة عشرة على الأقل، ولديك الأهلية القانونية للتعاقد وفقًا لقانون العقود.</p>
                        </section>

                        <section className="space-y-4">
                            <h2 className="text-2xl font-black mt-10 mb-6 flex items-center gap-3"><span className="h-8 w-2 bg-blue-600 rounded-full inline-block"></span>استخدام الموقع والتطبيق</h2>
                            <h3 className="text-xl font-bold mt-6 mb-4">أحكام عامة</h3>
                            <p>يجوز لك الوصول إلى محتوى الموقع والمنتجات والخدمات أو الميزات وفقًا لهذه الشروط والأحكام. وتتعهد بالالتزام بهذه الشروط وكافة القوانين واللوائح والأنظمة المعمول بها والمتعلقة باستخدامك للموقع.</p>
                            <p>تتعهد وتضمن أن جميع المعلومات التي تقدمها إلى نقليات صحيحة ودقيقة وسارية. وفي حال تقديم أي معلومات غير صحيحة، أو انتحال شخصية، أو تزويد بيانات خاطئة، فإنك تتحمل كامل المسؤولية عن العواقب المترتبة على ذلك، وتلتزم بتعويض نقليات عن أي خسائر أو أضرار أو تبعات قد تلحق بها نتيجة هذا الإخلال.</p>
                            <p>وفي حال ثبوت عدم صحة المعلومات، يحق لـ نقليات منعك فورًا من الوصول إلى الموقع دون الإخلال بأي حقوق أخرى مقررة بموجب هذه الشروط، كما يحق لها اتخاذ أي إجراءات قانونية تراها مناسبة.</p>

                            <h3 className="text-xl font-bold mt-6 mb-4">التغييرات</h3>
                            <p>يجوز لنا، من وقت لآخر، تعديل أو إيقاف أي من الموقع أو المنتجات أو الخدمات أو الميزات، أو تغيير أو إزالة أي وظيفة من وظائفها، كليًا أو جزئيًا.</p>

                            <h3 className="text-xl font-bold mt-6 mb-4">الاستخدام المشروع والممنوع للموقع والتطبيق</h3>
                            <p>كشرط لاستخدامك للموقع، تتعهد بعدم استخدامه لأي غرض غير مشروع أو محظور بموجب شروط الاستخدام. كما تتعهد بعدم استخدام الموقع بأي طريقة قد تؤدي إلى إتلاف أو تعطيل أو إثقال كاهل أو إضعاف أي خادم تابع لنقليات أو أي شبكة متصلة به، أو التدخل في استخدام أي طرف آخر للموقع أو الخدمات المرتبطة به.</p>
                            <p>لا يجوز لك محاولة الوصول غير المصرح به إلى أي جزء من الموقع أو أي حسابات أخرى أو أنظمة أو شبكات حاسوبية متصلة بأي خادم تابع لنقليات سواء عن طريق الاختراق أو التنقيب عن كلمات المرور أو بأي وسيلة أخرى. كما لا يجوز لك الحصول أو محاولة الحصول على أي مواد أو معلومات بوسائل غير تلك المتاحة عمدًا من خلال الموقع.</p>
                        </section>

                        <section className="space-y-4">
                            <h2 className="text-2xl font-black mt-10 mb-6 flex items-center gap-3"><span className="h-8 w-2 bg-blue-600 rounded-full inline-block"></span>حقوق الملكية</h2>
                            <p>نحن نمتلك كافة الحقوق والعناوين والمصالح المتعلقة بالخدمات المقدمة، بما في ذلك جميع التقنيات وحقوق الملكية الفكرية المرتبطة بها. ووفقًا لهذه الشروط، نمنحك ترخيصًا محدودًا، وقابلًا للإلغاء، وغير حصري، وغير قابل للترخيص من الباطن أو النقل، وذلك لغرض الوصول إلى الخدمات واستخدامها فقط بما يتوافق مع هذه الشروط.</p>
                            <p>ولا تكتسب بموجب هذه الشروط أي حقوق ملكية أو حقوق فكرية تتعلق بالخدمات أو المحتوى.</p>

                            <h3 className="text-xl font-bold mt-6 mb-4">الحقوق المملوكة</h3>
                            <p>نحن نمتلك كامل الحقوق والعناوين والمصالح المتعلقة بعروض الخدمات، بما في ذلك جميع التقنيات المرتبطة بها وحقوق الملكية الفكرية ذات الصلة. ووفقًا لأحكام وشروط هذه الشروط والأحكام، نمنحك ترخيصًا محدودًا، وقابلاً للإلغاء، وغير حصري، وغير قابل للترخيص من الباطن، وغير قابل للنقل، وذلك للأغراض التالية:</p>
                            <ul className="list-disc pr-6 space-y-2">
                                <li>(أ) الوصول إلى الخدمات واستخدامها حصريًا وفقًا لهذه الشروط والأحكام.</li>
                            </ul>
                            <p>ولا تكتسب بموجب هذه الشروط والأحكام أي حقوق في عروض الخدمات أو أي حقوق ملكية فكرية متعلقة بها، سواء من جانبنا أو من جانب الشركات التابعة لنا.</p>

                            <h3 className="text-xl font-bold mt-6 mb-4">قيود الترخيص</h3>
                            <p>يتعين عليك استخدام الموقع الإلكتروني بالطريقة المنصوص عليها في هذه الشروط والأحكام فقط. ولا يجوز لك استخدام الموقع لأي غرض آخر غير ما هو مصرح به صراحةً بموجب هذه الشروط والأحكام. كما تتعهد بعدم القيام بما يلي:</p>
                            <ul className="list-disc pr-6 space-y-2">
                                <li>(أ) تعديل أو توزيع أو تغيير أو العبث أو إصلاح أو إنشاء أعمال مشتقة من أي محتوى موجود على الموقع أو من المنتجات أو الخدمات أو الميزات.</li>
                                <li>(ب) إجراء هندسة عكسية أو تفكيك أو فك تجميع أو ترجمة الموقع أو المنتجات أو الخدمات أو الميزات، أو تطبيق أي عملية أو إجراء آخر لاستخلاص الشيفرة المصدرية لأي برنامج مضمن فيها.</li>
                                <li>(ج) إعادة بيع أو منح ترخيص من الباطن للموقع أو المنتجات أو الخدمات أو الميزات.</li>
                            </ul>
                            <p>كما لا يجوز لك تحريف أو تضخيم طبيعة العلاقة بيننا وبينك، بما في ذلك الإيحاء أو التصريح بأننا ندعمك أو نرعاك أو نؤيدك أو نساهم في أنشطتك أو أعمالك التجارية.</p>

                            <h3 className="text-xl font-bold mt-6 mb-4">الاقتراحات</h3>
                            <p>في حال قيامك بتقديم أي اقتراحات لنا أو للشركات التابعة لنا، يحق لنا ولشركاتنا التابعة استخدام هذه الاقتراحات دون أي قيود. وبموجب هذا، فإنك تتنازل بشكل نهائي وغير قابل للإلغاء عن جميع الحقوق والعناوين والمصالح المتعلقة بهذه الاقتراحات لصالحنا، وتوافق على تقديم أي مساعدة نطلبها لتوثيق حقوقنا فيها أو استكمالها أو الحفاظ عليها.</p>
                        </section>

                        <section className="space-y-4">
                            <h2 className="text-2xl font-black mt-10 mb-6 flex items-center gap-3"><span className="h-8 w-2 bg-blue-600 rounded-full inline-block"></span>التعويض</h2>
                            <h3 className="text-xl font-bold mt-6 mb-4">أحكام عامة</h3>
                            <p>تتعهد بالدفاع عنّا وتعويضنا وإبراء ذمتنا، نحن وشركاتنا التابعة وموظفينا ومديرينا وممثلينا، من أي خسائر تنشأ عن أو تتعلق بأي مطالبة من طرف ثالث بسبب:</p>
                            <ul className="list-disc pr-6 space-y-2">
                                <li>أ) استخدامك للموقع أو المنتجات أو الخدمات؛</li>
                                <li>ب) إخلالك بهذه الشروط والأحكام أو مخالفتك للقوانين المعمول بها.</li>
                            </ul>
                            <p>كما تلتزم بسداد أتعاب المحاماة المعقولة، بالإضافة إلى التكاليف المتعلقة بوقت وجهد موظفينا أو متعاقدينا في التعامل مع أي مطالبات أو أوامر قانونية ناتجة عن ذلك، في حدود الأضرار أو الخسائر المتكبدة.</p>
                        </section>

                        <section className="space-y-4">
                            <h2 className="text-2xl font-black mt-10 mb-6 flex items-center gap-3"><span className="h-8 w-2 bg-blue-600 rounded-full inline-block"></span>حدود المسؤولية</h2>
                            <p>لن نكون نحن ولا أيّ من الشركات التابعة لنا مسؤولين تجاهك عن أي أضرار مباشرة أو غير مباشرة أو عرضية أو خاصة أو تبعية أو تأديبية (بما في ذلك الأضرار الناتجة عن فقدان الأرباح أو الإيرادات أو العملاء أو الفرص أو السمعة التجارية أو الاستخدام أو البيانات)، حتى لو تم إخطار أي طرف بإمكانية وقوع مثل هذه الأضرار.</p>
                            <p>وعلاوة على ذلك، لن نكون نحن ولا أي من الشركات التابعة لنا مسؤولين عن أي تعويض أو ردّ مبالغ أو أضرار تنشأ فيما يتصل بما يلي:</p>
                            <ul className="list-disc pr-6 space-y-2">
                                <li>(أ) عدم قدرتك على استخدام الخدمات، بما في ذلك نتيجةً لأي من: (1) إنهاء أو تعليق هذه الاتفاقية أو استخدامك أو وصولك إلى عروض الخدمات، أو (2) إيقافنا تقديم أيّ من عروض الخدمات أو جميعها، أو (3) ودون الإخلال بأي التزامات بموجب اتفاقيات مستوى الطلب، أي توقّف غير متوقع أو غير مجدول لكامل الخدمات أو لجزء منها لأي سبب كان؛</li>
                                <li>(ب) تكلفة شراء سلع أو خدمات بديلة؛</li>
                                <li>(ج) أي استثمارات أو نفقات أو التزامات تقوم بها فيما يتصل بهذه الاتفاقية أو باستخدامك أو وصولك إلى عروض الخدمات؛ أو</li>
                                <li>(د) أي وصول غير مصرح به إلى أي من محتواك أو بياناتك الأخرى، أو أي تعديل أو حذف أو إتلاف أو تدمير أو تلف أو فقدان لها، أو الإخفاق في تخزينها.</li>
                            </ul>
                        </section>

                        <section className="space-y-4">
                            <h2 className="text-2xl font-black mt-10 mb-6 flex items-center gap-3"><span className="h-8 w-2 bg-blue-600 rounded-full inline-block"></span>أحكام متفرقة</h2>

                            <h3 className="text-xl font-bold mt-6 mb-4">التعديلات على هذه الشروط والأحكام</h3>
                            <p>يجوز لنا تعديل هذه الشروط والأحكام (بما في ذلك أي سياسات) في أي وقت من خلال نشر نسخة منقحة على موقع نقليات الإلكتروني. وباستمرارك في استخدام الموقع بعد تاريخ سريان أي تعديلات على هذه الشروط والأحكام، فإنك توافق على الالتزام بالشروط المعدلة. وتقع على عاتقك مسؤولية مراجعة موقع نقليات بانتظام للاطلاع على أي تعديلات تطرأ على هذه الشروط والأحكام.</p>

                            <h3 className="text-xl font-bold mt-6 mb-4">القوة القاهرة</h3>
                            <p>لن نكون نحن ولا أيٌّ من الشركات التابعة لنا مسؤولين عن أي تأخير أو إخفاق في تنفيذ أي التزام بموجب هذه الشروط والأحكام إذا كان هذا التأخير أو الإخفاق ناتجًا عن سبب خارج عن نطاق سيطرتنا المعقولة، بما في ذلك على سبيل المثال لا الحصر: الكوارث الطبيعية، نزاعات العمل أو الاضطرابات الصناعية الأخرى، انقطاع الكهرباء أو الطاقة، تعطل المرافق أو الاتصالات السلكية أو اللاسلكية الأخرى، الزلازل، العواصف أو غيرها من الظواهر الطبيعية، الحصارات، الحظر، أعمال الشغب، الأفعال أو الأوامر الحكومية، الأعمال الإرهابية، أو الحروب.</p>

                            <h3 className="text-xl font-bold mt-6 mb-4">القانون الواجب التطبيق</h3>
                            <p>تخضع هذه الشروط والأحكام، وأي نزاع من أي نوع قد ينشأ بينك وبيننا، لقوانين دولة الإمارات العربية المتحدة، دون الرجوع إلى قواعد تنازع القوانين.</p>

                            <h3 className="text-xl font-bold mt-6 mb-4">النزاعات</h3>
                            <p>أي نزاع أو مطالبة تنشأ بأي شكل من الأشكال عن استخدامك للموقع الإلكتروني، أو عن أي من المنتجات أو الخدمات التي تبيعها أو توزعها شركة نقليات، يتم الفصل فيها عن طريق التحكيم وفقًا لقانون التحكيم والتوفيق لعام 1996 وأي تعديلات لاحقة عليه. ويكون مقر التحكيم في بنغالورو، وتكون لغة التحكيم هي اللغة الإنجليزية.</p>

                            <h3 className="text-xl font-bold mt-6 mb-4">الامتثال</h3>
                            <p>تلتزم بالامتثال لجميع القوانين والقواعد واللوائح المعمول بها.</p>

                            <h3 className="text-xl font-bold mt-6 mb-4">اللغة</h3>
                            <p>النسخة الإنجليزية للشروط والاحكام هي النسخة المعتمدة والواجبة التطبيق في حال وجود أي تعارض بين النسختين الإنجليزية والعربية.</p>
                        </section>

                    </div>
                </motion.div>
            </div>

            {/* Footer الجديد المخصص لصفحات السياسة */}
            <footer className="bg-slate-900 text-white py-16 px-6 mt-10 rounded-t-[3rem]">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-12" dir="rtl">
                    <div className="flex flex-col gap-2">
                        <img src="/logo.png" alt="Logo" className="h-12 w-auto brightness-0 invert opacity-100 object-contain drop-shadow-md cursor-pointer" onClick={() => navigate('/')} />
                        <p className="text-slate-400 text-xs font-bold text-right pt-2">شريكك الموثوق في كل طريق</p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-16 w-full text-sm font-bold text-slate-300">
                        <div className="flex flex-col gap-4">
                            <button onClick={() => navigate('/info')} className="text-right hover:text-white transition-colors flex items-center gap-2 flex-row-reverse"><Home size={14} /> معلومات عامة</button>
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
                            <button className="text-right hover:text-white transition-colors text-[#005274]">تطبيق نقليات العملاء</button>
                            <button className="text-right hover:text-white transition-colors text-[#FF9800]">تطبيق نقليات للسائقين</button>
                        </div>
                        <div className="flex flex-col gap-4">
                            <button className="text-right hover:text-white transition-colors">Manage consent</button>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default TermsPage;
