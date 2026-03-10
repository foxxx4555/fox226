import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Search, Package, MapPin, Calendar, Clock, ArrowRight, Loader2, CheckCircle2, Truck, AlertCircle, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

export default function PublicTrackingPage() {
    const { t, i18n } = useTranslation();
    const [trackingNumber, setTrackingNumber] = useState("");
    const [loading, setLoading] = useState(false);
    const [shipment, setShipment] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const [scrolled, setScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const scrollToSection = (id: string) => {
        if (id === 'hero') {
            navigate('/');
            return;
        }
        navigate('/#' + id);
    };

    const handleTrack = async (e?: React.FormEvent, manualID?: string) => {
        if (e) e.preventDefault();
        const cleanID = (manualID || trackingNumber).trim();
        if (!cleanID) return;

        setLoading(true);
        setError(null);
        setShipment(null);

        // تعديل: السماح بالبحث إذا كان النص طوله 8 حروف على الأقل (المعرف المختصر)
        if (cleanID.length < 8) {
            setError(t('tracking_error_short'));
            setLoading(false);
            return;
        }

        try {
            const hex = cleanID.replace(/-/g, '').toLowerCase();
            const isFullUUID = /^[0-9a-f]{32}$/.test(hex);

            let query = supabase.from('loads').select('*');

            if (isFullUUID) {
                // بحث دقيق إذا كان المعرف كاملاً
                const uuid = hex.replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, '$1-$2-$3-$4-$5');
                query = query.eq('id', uuid);
            } else {
                // بحث بنظام النطاق (Range) للمعاملات الجزئية لتجنب خطأ الـ Casting
                const min = hex.padEnd(32, '0').replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, '$1-$2-$3-$4-$5');
                const max = hex.padEnd(32, 'f').replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, '$1-$2-$3-$4-$5');
                query = query.gte('id', min).lte('id', max);
            }

            const { data, error: sbError } = await query.maybeSingle();

            if (sbError) throw sbError;

            if (data) {
                setShipment(data);
            } else {
                setError(t('tracking_error_not_found'));
            }
        } catch (err) {
            console.error("Tracking error:", err);
            setError(t('tracking_error_generic'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);

        const idFromUrl = searchParams.get('id');
        if (idFromUrl) {
            setTrackingNumber(idFromUrl);
            handleTrack(undefined, idFromUrl);
        }

        return () => window.removeEventListener('scroll', handleScroll);
    }, [searchParams]);

    const getStatusStep = (status: string) => {
        switch (status) {
            case 'available': return 1;
            case 'pending': return 2;
            case 'in_progress': return 3;
            case 'completed': return 4;
            default: return 0;
        }
    };

    const steps = [
        { label: t('status_received'), status: "available" },
        { label: t('status_preparing'), status: "pending" },
        { label: t('status_in_transit'), status: "in_progress" },
        { label: t('status_delivered'), status: "completed" }
    ];

    const currentStep = shipment ? getStatusStep(shipment.status) : 0;

    return (
        <div className="min-h-screen bg-white flex flex-col pt-16 md:pt-20" dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>

            {/* 🚀 الـ Navbar الاحترافي */}
            <nav className={cn(
                "fixed top-0 left-0 right-0 z-[100] transition-all duration-500 py-2 px-4 md:px-8 flex items-center justify-between",
                (scrolled || isMobileMenuOpen) ? 'bg-white/95 shadow-sm backdrop-blur-xl border-b border-slate-100' : 'bg-transparent'
            )}>
                {/* أزرار الدخول */}
                <div className="flex items-center gap-2 md:gap-3">
                    <div className="hidden sm:flex items-center gap-2">
                        <Button
                            onClick={() => navigate('/login')}
                            className="bg-slate-900 hover:bg-slate-800 text-white font-black px-3 py-1 h-8 rounded-lg shadow-sm transition-all text-[8px] md:text-[10px] whitespace-nowrap"
                        >
                            {t('login_system')}
                        </Button>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="xl:hidden rounded-lg w-8 h-8 bg-slate-50 border border-slate-200"
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    >
                        {isMobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
                    </Button>
                </div>

                {/* روابط التنقل - متناسقة مع الرئيسية */}
                <div className="hidden xl:flex items-center gap-6">
                    <button onClick={() => navigate('/')} className="font-black text-slate-400 hover:text-primary transition-all text-[9px] whitespace-nowrap uppercase tracking-tighter">{t('home')}</button>
                    <button onClick={() => navigate('/#about-us')} className="font-black text-slate-400 hover:text-primary transition-all text-[9px] whitespace-nowrap uppercase tracking-tighter">{t('about_us')}</button>
                    <button onClick={() => navigate('/#contact-us')} className="font-black text-slate-400 hover:text-primary transition-all text-[9px] whitespace-nowrap uppercase tracking-tighter">{t('contact_us')}</button>
                    <Button
                        variant="ghost"
                        onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); setIsMobileMenuOpen(false); }}
                        className="font-black text-primary hover:bg-primary/5 transition-all text-[9px] flex items-center gap-1 h-auto py-1 px-3 whitespace-nowrap uppercase tracking-tighter"
                    >
                        <Search size={12} />
                        {t('track_shipment')}
                    </Button>
                </div>

                <div className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center">
                    <img src="/logo.png" className="w-full h-full object-contain" alt="Logo" />
                </div>
            </nav>

            {/* 📱 القائمة الجانبية للجوال */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div
                        initial={{ x: i18n.language === 'ar' ? '100%' : '-100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: i18n.language === 'ar' ? '100%' : '-100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed inset-0 z-[90] bg-white pt-48 pb-10 px-8 flex flex-col xl:hidden"
                    >
                        <div className="space-y-4">
                            <button
                                onClick={() => { navigate('/'); setIsMobileMenuOpen(false); }}
                                className={cn("w-full text-xl font-black text-slate-800 py-4 border-b border-slate-50 flex items-center gap-3", i18n.language === 'ar' ? "text-right justify-end" : "text-left justify-start")}
                            >
                                {t('home')}
                            </button>
                            <button
                                onClick={() => { navigate('/#about-us'); setIsMobileMenuOpen(false); }}
                                className={cn("w-full text-xl font-black text-slate-800 py-4 border-b border-slate-50 flex items-center gap-3", i18n.language === 'ar' ? "text-right justify-end" : "text-left justify-start")}
                            >
                                {t('about_us')}
                            </button>
                            <button
                                onClick={() => { navigate('/#contact-us'); setIsMobileMenuOpen(false); }}
                                className={cn("w-full text-xl font-black text-slate-800 py-4 border-b border-slate-50 flex items-center gap-3", i18n.language === 'ar' ? "text-right justify-end" : "text-left justify-start")}
                            >
                                {t('contact_us')}
                            </button>
                            <button
                                onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); setIsMobileMenuOpen(false); }}
                                className={cn("w-full text-xl font-black text-primary py-4 flex items-center gap-3", i18n.language === 'ar' ? "text-right justify-end" : "text-left justify-start")}
                            >
                                {t('track_shipment')} <Search size={24} />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main Area */}
            <main className="flex-1 flex flex-col items-center pt-12 pb-20 px-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full max-w-3xl text-center"
                >
                    <h1 className="text-2xl md:text-3xl font-black text-slate-900 mb-4">{t('track_shipment_title')}</h1>
                    <p className="text-slate-500 font-bold text-sm mb-8">{t('track_shipment_desc')}</p>

                    <form onSubmit={handleTrack} className="flex flex-col md:flex-row gap-4 mb-12">
                        <div className="relative flex-1 group">
                            <Input
                                value={trackingNumber}
                                onChange={(e) => setTrackingNumber(e.target.value)}
                                placeholder={t('tracking_placeholder')}
                                className={cn("h-12 md:h-14 rounded-xl border-2 border-slate-100 bg-white text-sm font-bold transition-all shadow-sm", i18n.language === 'ar' ? "pr-8 pl-12" : "pl-8 pr-12")}
                            />
                            <Search className={cn("absolute top-1/2 -translate-y-1/2 text-slate-400", i18n.language === 'ar' ? "left-6" : "right-6")} size={20} />
                        </div>
                        <Button
                            disabled={loading || !trackingNumber.trim()}
                            className="h-12 md:h-14 px-8 rounded-xl bg-primary text-white text-sm font-black shadow-lg shadow-primary/20"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : t('track_btn')}
                        </Button>
                    </form>

                    <AnimatePresence mode="wait">
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className={cn("p-6 bg-rose-50 border-2 border-rose-100 rounded-3xl text-rose-600 font-black flex items-center gap-4", i18n.language === 'ar' ? "text-right" : "text-left")}
                            >
                                <AlertCircle size={32} />
                                <p>{error}</p>
                            </motion.div>
                        )}

                        {shipment && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className={cn("space-y-6", i18n.language === 'ar' ? "text-right" : "text-left")}
                            >
                                {/* Results Card */}
                                <Card className="border-none shadow-2xl shadow-slate-200/50 rounded-[2.5rem] overflow-hidden bg-white">
                                    <CardContent className="p-6 md:p-8">
                                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 pb-6 border-b border-slate-50">
                                            <div>
                                                <h2 className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('shipment_details')}</h2>
                                                <p className="text-xl font-black text-slate-900 mb-1">#{shipment.id.substring(0, 8).toUpperCase()}</p>
                                                <p className="text-[8px] font-bold text-slate-300 tracking-tighter uppercase">ID: {shipment.id}</p>
                                            </div>
                                            <div className="px-5 py-2 bg-primary/5 rounded-full border border-primary/10">
                                                <span className="text-primary font-black flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                                                    {steps.find(s => s.status === shipment.status)?.label || shipment.status}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Progressive Tracker */}
                                        <div className="relative mb-16 px-4">
                                            {/* Track Line */}
                                            <div className="absolute top-1/2 left-0 right-0 h-1.5 bg-slate-100 -translate-y-1/2 rounded-full overflow-hidden">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${(currentStep - 1) * 33.33}%` }}
                                                    className="h-full bg-primary shadow-[0_0_15px_rgba(37,99,235,0.4)]"
                                                />
                                            </div>

                                            {/* Icons */}
                                            <div className="relative flex justify-between">
                                                {steps.map((step, index) => {
                                                    const isActive = index + 1 <= currentStep;
                                                    const isCurrent = index + 1 === currentStep;

                                                    return (
                                                        <div key={index} className="flex flex-col items-center gap-3">
                                                            <div className={cn(
                                                                "w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-500 z-10 shadow-lg",
                                                                isActive ? 'bg-primary text-white scale-110 shadow-primary/30' : 'bg-white text-slate-300 border-2 border-slate-100',
                                                                isCurrent ? 'ring-4 ring-primary/20 bg-blue-600' : ''
                                                            )}>
                                                                {index === 0 && <Package size={22} />}
                                                                {index === 1 && <Clock size={22} />}
                                                                {index === 2 && <Truck size={22} />}
                                                                {index === 3 && <CheckCircle2 size={22} />}
                                                            </div>
                                                            <span className={cn("text-[10px] font-black whitespace-nowrap", isActive ? 'text-slate-900' : 'text-slate-400')}>
                                                                {step.label}
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Details Grid */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <div className="p-6 bg-slate-50 rounded-3xl border border-white">
                                                <div className="flex items-center gap-4 mb-4">
                                                    <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
                                                        <MapPin size={22} />
                                                    </div>
                                                    <h3 className="font-black text-slate-900 text-lg">{t('route')}</h3>
                                                </div>
                                                <div className={cn("space-y-4", i18n.language === 'ar' ? "pr-1" : "pl-1")}>
                                                    <div className="flex items-start gap-4">
                                                        <div className="w-3 h-3 rounded-full bg-orange-400 mt-1.5" />
                                                        <div>
                                                            <p className="text-[10px] font-bold text-slate-400">{t('from_origin')}</p>
                                                            <p className="font-black text-slate-800 text-sm">{shipment.origin}</p>
                                                        </div>
                                                    </div>
                                                    <div className={cn("w-0.5 h-6 bg-slate-200", i18n.language === 'ar' ? "mr-1.5" : "ml-1.5")} />
                                                    <div className="flex items-start gap-4">
                                                        <div className="w-3 h-3 rounded-full bg-blue-600 mt-1.5" />
                                                        <div>
                                                            <p className="text-[10px] font-bold text-slate-400">{t('to_destination')}</p>
                                                            <p className="font-black text-slate-800 text-sm">{shipment.destination}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 gap-4">
                                                <div className="p-6 bg-blue-50/50 rounded-3xl border border-blue-100/50 flex items-center justify-between">
                                                    <div className="flex items-center gap-4">
                                                        <Calendar className="text-blue-600" size={24} />
                                                        <div>
                                                            <p className="text-[10px] font-bold text-slate-400">{t('shipping_date')}</p>
                                                            <p className="font-black text-slate-800 text-sm">{new Date(shipment.created_at).toLocaleDateString(i18n.language === 'ar' ? 'ar-SA' : 'en-US')}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="p-6 bg-emerald-50/50 rounded-3xl border border-emerald-100/50 flex items-center justify-between">
                                                    <div className="flex items-center gap-4">
                                                        <Package className="text-emerald-600" size={24} />
                                                        <div>
                                                            <p className="text-[10px] font-bold text-slate-400">{t('package_type')}</p>
                                                            <p className="font-black text-slate-800 text-sm">{shipment.package_type || t('general_transport')}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <div className="p-8 bg-slate-900 rounded-[2.5rem] text-white flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative group">
                                    <div className={cn("z-10", i18n.language === 'ar' ? "text-right" : "text-left")}>
                                        <h3 className="text-xl font-black mb-2">{t('manage_shippments_cta_title')}</h3>
                                        <p className="text-slate-400 font-bold text-sm">{t('manage_shippments_cta_desc')}</p>
                                    </div>
                                    <Button
                                        onClick={() => navigate('/register')}
                                        className="z-10 h-14 px-10 rounded-2xl bg-white text-slate-900 hover:bg-slate-100 font-black transition-all"
                                    >
                                        {t('start_now_free')}
                                        <ArrowRight className={cn("inline-block", i18n.language === 'ar' ? "mr-2 rotate-180" : "ml-2 rotate-0")} size={20} />
                                    </Button>
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2" />
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            </main>

            {/* Footer */}
            <footer className="py-12 px-6 border-t border-slate-100 bg-white">
                <div className={cn("container mx-auto flex flex-col md:flex-row justify-between items-center gap-8", i18n.language === 'ar' ? "text-right" : "text-left")}>
                    <div className="flex items-center gap-6">
                        <img src="/favicon.png" alt="SAS" className="h-8 opacity-40 grayscale" />
                        <span className="text-slate-400 font-bold text-sm">© {new Date().getFullYear()} SAS TRANSPORT LOGISTICS</span>
                    </div>

                    <div className="flex items-center gap-8">
                        <Link to="/privacy" className="text-slate-400 hover:text-primary font-black text-sm transition-colors">{t('privacy_policy')}</Link>
                        <Link to="/terms" className="text-slate-400 hover:text-primary font-black text-sm transition-colors">{t('terms_conditions')}</Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}
