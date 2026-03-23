import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Truck, Home, User, Menu, X, Download } from 'lucide-react';
import { useAppStore } from '@/store/appStore';

export const Navbar = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { t, i18n } = useTranslation();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const { currentRole } = useAppStore();

    const isActive = (path: string) => location.pathname === path;

    const toggleLanguage = () => {
        const newLang = i18n.language === 'ar' ? 'en' : 'ar';
        i18n.changeLanguage(newLang);
        localStorage.setItem('i18nextLng', newLang);
        document.documentElement.dir = newLang === 'ar' ? 'rtl' : 'ltr';
        document.documentElement.lang = newLang;
    };

    const getHomeRoute = () => {
        if (!currentRole) return '/';
        const normalizedRole = currentRole.toLowerCase();
        
        if (normalizedRole === 'driver') return '/driver/dashboard';
        if (normalizedRole === 'shipper') return '/shipper/dashboard';
        
        const adminRoles = [
            'super_admin', 'admin', 'finance', 'operations',
            'carrier_manager', 'vendor_manager', 'support', 'analytics'
        ];
        if (adminRoles.includes(normalizedRole)) return '/admin/dashboard';
        
        return '/';
    };

    return (
        <>
            <nav className="fixed top-0 left-0 right-0 z-[100] bg-white/95 backdrop-blur-md border-b border-slate-100 py-2 px-6 md:px-12 flex items-center justify-between shadow-sm" dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Button
                            onClick={() => navigate('/login')}
                            className="bg-[#005274] hover:bg-[#003d57] text-white font-black px-4 md:px-6 rounded-xl h-10 text-xs hidden md:flex items-center gap-2"
                        >
                            {t('login_nav', 'تسجيل دخول')}
                        </Button>
                        <Button
                            onClick={() => navigate('/register')}
                            className="bg-[#FF7A00] hover:bg-orange-600 text-white font-black px-4 md:px-6 rounded-xl h-10 text-xs hidden sm:flex items-center gap-2"
                        >
                            {t('register_nav', 'إنشاء تسجيل الدخول')}
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
                        {t('general_info')} <Home size={18} />
                    </button>
                    <button
                        onClick={() => navigate('/drivers')}
                        className={`font-bold text-sm flex items-center gap-2 transition-colors ${isActive('/drivers') ? 'text-primary border-b-2 border-primary pb-1' : 'text-slate-600 hover:text-primary'}`}
                    >
                        {t('drivers')} <Truck size={18} />
                    </button>
                    <button
                        onClick={() => navigate('/customers')}
                        className={`font-bold text-sm flex items-center gap-2 transition-colors ${isActive('/customers') ? 'text-primary border-b-2 border-primary pb-1' : 'text-slate-600 hover:text-primary'}`}
                    >
                        {t('customers')} <User size={18} />
                    </button>
                    <button
                        onClick={() => navigate(getHomeRoute())}
                        className={`font-bold text-sm flex items-center gap-2 transition-colors ${isActive(getHomeRoute()) ? 'text-primary border-b-2 border-primary pb-1' : 'text-slate-600 hover:text-primary'}`}
                    >
                        {t('home_nav')} <Home size={18} />
                    </button>
                </div>

                <div className="cursor-pointer flex items-center gap-2" onClick={() => navigate('/')}>
                    <img src="/logo.png" alt={t('app_name')} className="h-[55px] md:h-[75px] w-auto object-contain" />
                </div>
            </nav>

            {isMobileMenuOpen && (
                <div className="fixed inset-0 z-[99] bg-white pt-24 px-8 flex flex-col md:hidden" dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
                    <button onClick={() => { navigate(getHomeRoute()); setIsMobileMenuOpen(false); }} className={`py-4 text-xl font-black border-b border-slate-50 text-right flex items-center justify-end gap-3 ${isActive(getHomeRoute()) ? 'text-primary' : 'text-slate-800'}`}>
                        {t('home_nav')} <Home size={22} />
                    </button>
                    <button onClick={() => { navigate('/drivers'); setIsMobileMenuOpen(false); }} className={`py-4 text-xl font-black border-b border-slate-50 text-right flex items-center justify-end gap-3 ${isActive('/drivers') ? 'text-primary' : 'text-slate-800'}`}>
                        {t('drivers')} <Truck size={22} />
                    </button>
                    <button onClick={() => { navigate('/customers'); setIsMobileMenuOpen(false); }} className={`py-4 text-xl font-black border-b border-slate-50 text-right flex items-center justify-end gap-3 ${isActive('/customers') ? 'text-primary' : 'text-slate-800'}`}>
                        {t('customers')} <User size={22} />
                    </button>
                    <button onClick={() => { navigate('/info'); setIsMobileMenuOpen(false); }} className={`py-4 text-xl font-black border-b border-slate-50 text-right flex items-center justify-end gap-3 ${isActive('/info') ? 'text-primary' : 'text-slate-800'}`}>
                        {t('general_info')} <Home size={22} />
                    </button>
                    <div className="mt-8 flex flex-col gap-4">
                        <Button onClick={() => { navigate('/login'); setIsMobileMenuOpen(false); }} className="h-14 bg-[#005274] text-white font-black text-lg rounded-2xl">{t('login_nav', 'تسجيل دخول')}</Button>
                        <Button onClick={() => { navigate('/register'); setIsMobileMenuOpen(false); }} className="h-14 bg-[#FF7A00] text-white font-black text-lg rounded-2xl">{t('register_nav', 'إنشاء تسجيل الدخول')}</Button>
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
