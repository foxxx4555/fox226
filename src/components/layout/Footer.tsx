import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MessageCircle } from 'lucide-react';

export const Footer = () => {
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();

    const handleWhatsAppClick = () => {
        window.open('https://wa.me/966550258358', '_blank');
    };

    return (
        <footer className="py-16 px-6 border-t border-slate-100 bg-white mt-auto" dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
            <div className="max-w-7xl mx-auto flex flex-col items-center gap-12">
                <img src="/logo.png" alt="SAS Footer Logo" className="max-w-[200px] md:max-w-[300px] w-full h-auto mb-4 cursor-pointer" onClick={() => navigate('/')} />

                <div className="w-full flex flex-col md:flex-row justify-center items-center gap-12 md:gap-24 flex-wrap">
                    {/* Column 1: Main Links */}
                    <div className="flex flex-col items-center gap-8 md:gap-6 w-full md:w-auto">
                        <button onClick={() => navigate('/drivers')} className="text-xl font-bold text-slate-800 hover:text-primary transition-colors">{t('drivers', 'السائقين')}</button>
                        <button onClick={() => navigate('/customers')} className="text-xl font-bold text-slate-800 hover:text-primary transition-colors">{t('customers', 'العملاء')}</button>
                    </div>

                    {/* Column 2: Legal Links */}
                    <div className="flex flex-col items-center gap-8 md:gap-6 w-full md:w-auto">
                        <button onClick={() => navigate('/terms')} className="text-xl font-bold text-slate-800 hover:text-primary transition-colors">{t('terms_conditions', 'الشروط والأحكام')}</button>
                        <button onClick={() => navigate('/privacy')} className="text-xl font-bold text-slate-800 hover:text-primary transition-colors">{t('privacy_policy', 'سياسة الخصوصية')}</button>
                    </div>

                    {/* Column 3: Support */}
                    <div className="flex flex-col items-center gap-8 md:gap-6 w-full md:w-auto">
                        <span className="text-xl font-bold text-slate-400 cursor-not-allowed flex items-center gap-2" title="قريباً">{t('instagram', 'إنستغرام')}</span>
                        <span
                            className="text-xl font-bold text-slate-800 flex items-center gap-2 cursor-pointer hover:text-green-600 transition-colors"
                            dir="ltr"
                            onClick={handleWhatsAppClick}
                        >
                            <MessageCircle size={20} className="text-green-500" />
                            +966 55 025 8358
                        </span>
                        <span className="text-xl font-bold text-slate-400 cursor-not-allowed flex items-center gap-2" title="قريباً">{t('support', 'الدعم')}</span>
                    </div>
                </div>

                {/* App Download Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full mt-4">
                    <button className="w-full sm:w-auto bg-slate-900 text-white rounded-3xl px-12 py-4 flex items-center justify-center gap-3 hover:bg-slate-800 transition-all" onClick={(e) => e.preventDefault()}>
                        <span className="font-bold text-lg">{t('shipper_app', 'تطبيق SAS للعملاء')}</span>
                    </button>
                    <button className="w-full sm:w-auto bg-[#FF7A00] text-white rounded-3xl px-12 py-4 flex items-center justify-center gap-3 hover:bg-[#e66e00] transition-all" onClick={(e) => e.preventDefault()}>
                        <span className="font-bold text-lg">{t('driver_app', 'تطبيق SAS للسائقين')}</span>
                    </button>
                </div>

                <div className="text-slate-400 font-bold text-sm mt-8">
                    © {new Date().getFullYear()} SAS. {t('all_rights_reserved', 'جميع الحقوق محفوظة.')}
                </div>
            </div>
        </footer>
    );
};
