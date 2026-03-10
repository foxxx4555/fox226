import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Truck, Home, User, Menu, X, Download } from 'lucide-react';

export const Navbar = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { t, i18n } = useTranslation();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const isActive = (path: string) => location.pathname === path;

    const toggleLanguage = () => {
        const newLang = i18n.language === 'ar' ? 'en' : 'ar';
        i18n.changeLanguage(newLang);
        localStorage.setItem('i18nextLng', newLang);
        document.documentElement.dir = newLang === 'ar' ? 'rtl' : 'ltr';
        document.documentElement.lang = newLang;
    };

    return (
        <>
            <nav className="fixed top-0 left-0 right-0 z-[100] bg-white/95 backdrop-blur-md border-b border-slate-100 py-3 px-6 md:px-12 flex items-center justify-between shadow-sm" dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Button
                            onClick={() => navigate('/drivers')}
                            className="bg-[#FF7A00] hover:bg-orange-600 text-white font-black px-4 md:px-6 rounded-xl h-10 text-xs hidden md:flex items-center gap-2"
                        >
                            {t('driver_app', 'تطبيق SAS للسائقين')}
                            <Download size={14} />
                        </Button>
                        <Button
                            className="bg-[#005274] hover:bg-[#003d57] text-white font-black px-4 md:px-6 rounded-xl h-10 text-xs hidden sm:flex items-center gap-2"
                        >
                            {t('shipper_app', 'تطبيق SAS للعملاء')}
                            <Download size={14} />
                        </Button>
                    </div>

                    <div
                        onClick={toggleLanguage}
                        className="bg-[#ffebcc] text-[#FF7A00] font-bold px-4 py-2 rounded-full text-sm flex items-center gap-2 cursor-pointer hover:bg-orange-200 transition-colors hidden md:flex"
                    >
                        <span className="font-black">{i18n.language.toUpperCase()}</span>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                    </div>

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
                    <button
                        onClick={() => navigate('/info')}
                        className={`font-bold text-sm flex items-center gap-2 transition-colors ${isActive('/info') ? 'text-primary border-b-2 border-primary pb-1' : 'text-slate-600 hover:text-primary'}`}
                    >
                        {t('general_info', 'معلومات عامة')} <Home size={18} />
                    </button>
                    <button
                        onClick={() => navigate('/drivers')}
                        className={`font-bold text-sm flex items-center gap-2 transition-colors ${isActive('/drivers') ? 'text-primary border-b-2 border-primary pb-1' : 'text-slate-600 hover:text-primary'}`}
                    >
                        {t('drivers', 'السائقين')} <Truck size={18} />
                    </button>
                    <button
                        onClick={() => navigate('/customers')}
                        className={`font-bold text-sm flex items-center gap-2 transition-colors ${isActive('/customers') ? 'text-primary border-b-2 border-primary pb-1' : 'text-slate-600 hover:text-primary'}`}
                    >
                        {t('customers', 'العملاء')} <User size={18} />
                    </button>
                    <button
                        onClick={() => navigate('/')}
                        className={`font-bold text-sm flex items-center gap-2 transition-colors ${isActive('/') ? 'text-primary border-b-2 border-primary pb-1' : 'text-slate-600 hover:text-primary'}`}
                    >
                        {t('home_nav', 'الصفحة الرئيسية')} <Home size={18} />
                    </button>
                </div>

                <div className="cursor-pointer flex items-center gap-2" onClick={() => navigate('/')}>
                    <img src="/logo.png" alt="شعار SAS" className="h-[50px] md:h-[60px] w-auto object-contain" />
                </div>
            </nav>

            {isMobileMenuOpen && (
                <div className="fixed inset-0 z-[99] bg-white pt-24 px-8 flex flex-col md:hidden" dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
                    <button onClick={() => { navigate('/'); setIsMobileMenuOpen(false); }} className={`py-4 text-xl font-black border-b border-slate-50 text-right flex items-center justify-end gap-3 ${isActive('/') ? 'text-primary' : 'text-slate-800'}`}>
                        {t('home_nav', 'الصفحة الرئيسية')} <Home size={22} />
                    </button>
                    <button onClick={() => { navigate('/drivers'); setIsMobileMenuOpen(false); }} className={`py-4 text-xl font-black border-b border-slate-50 text-right flex items-center justify-end gap-3 ${isActive('/drivers') ? 'text-primary' : 'text-slate-800'}`}>
                        {t('drivers', 'السائقين')} <Truck size={22} />
                    </button>
                    <button onClick={() => { navigate('/customers'); setIsMobileMenuOpen(false); }} className={`py-4 text-xl font-black border-b border-slate-50 text-right flex items-center justify-end gap-3 ${isActive('/customers') ? 'text-primary' : 'text-slate-800'}`}>
                        {t('customers', 'العملاء')} <User size={22} />
                    </button>
                    <button onClick={() => { navigate('/info'); setIsMobileMenuOpen(false); }} className={`py-4 text-xl font-black border-b border-slate-50 text-right flex items-center justify-end gap-3 ${isActive('/info') ? 'text-primary' : 'text-slate-800'}`}>
                        {t('general_info', 'معلومات عامة')} <Home size={22} />
                    </button>
                    <div className="mt-8 flex flex-col gap-4">
                        <Button onClick={() => { navigate('/drivers'); setIsMobileMenuOpen(false); }} className="h-14 bg-[#FF7A00] text-white font-black text-lg rounded-2xl">{t('driver_app', 'تطبيق SAS للسائقين')}</Button>
                        <Button className="h-14 bg-[#005274] text-white font-black text-lg rounded-2xl">{t('shipper_app', 'تطبيق SAS للعملاء')}</Button>
                        <div className="mt-4 flex justify-center">
                            <span
                                onClick={toggleLanguage}
                                className="bg-[#ffebcc] text-[#FF7A00] font-bold px-6 py-3 rounded-full text-lg flex items-center gap-2 cursor-pointer"
                            >
                                {i18n.language.toUpperCase()} <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                            </span>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
