import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Search, Package, MapPin, Calendar, Clock, ArrowRight, Loader2, CheckCircle2, Truck, AlertCircle, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useSearchParams, Link } from "react-router-dom";

export default function PublicTrackingPage() {
    const [trackingNumber, setTrackingNumber] = useState("");
    const [loading, setLoading] = useState(false);
    const [shipment, setShipment] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const [showBanner, setShowBanner] = useState(true);
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
            setError("عذراً، يجب إدخال 8 رموز على الأقل من رقم الشحنة.");
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
                setError("عذراً، لم يتم العثور على شحنة بهذا الرقم. يرجى التأكد من الرقم والمحاولة مرة أخرى.");
            }
        } catch (err) {
            console.error("Tracking error:", err);
            setError("حدث خطأ أثناء البحث. يرجى المحاولة لاحقاً.");
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
    }, [searchParams, handleTrack]); // Added handleTrack to dependencies

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
        { label: "تم استلام الطلب", status: "available" },
        { label: "جاري التجهيز", status: "pending" },
        { label: "قيد النقل", status: "in_progress" },
        { label: "تم التسليم", status: "completed" }
    ];

    const currentStep = shipment ? getStatusStep(shipment.status) : 0;

    return (
        <div className="min-h-screen bg-white font-['Cairo'] flex flex-col pt-32" dir="rtl">
            {/* 🚀 بانر تثبيت التطبيق */}
            <AnimatePresence>
                {showBanner && (
                    <motion.div
                        initial={{ y: -100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -100, opacity: 0 }}
                        className="fixed top-0 left-0 right-0 z-[110] bg-white/90 backdrop-blur-xl border-b border-slate-100 px-4 py-3 flex items-center justify-between shadow-sm"
                    >
                        <div className="flex items-center gap-3">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400" onClick={() => setShowBanner(false)}>
                                <X size={18} />
                            </Button>
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                <img src="/favicon.png" alt="SAS Icon" className="w-6 h-6 object-contain" />
                            </div>
                            <div className="flex flex-col text-right">
                                <h3 className="text-[12px] font-black text-slate-900 leading-tight">تطبيق SAS TRANSPORT</h3>
                                <p className="text-[10px] text-slate-500 font-bold italic">أسرع • أسهل • آمن</p>
                            </div>
                        </div>
                        <Button size="sm" className="bg-primary hover:bg-primary/90 text-white text-[11px] font-black h-8 px-4 rounded-lg shadow-lg shadow-primary/20">
                            تثبيت الآن
                        </Button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 🚀 الـ Navbar الاحترافي */}
            <nav className={`fixed ${showBanner ? 'top-[65px]' : 'top-0'} left-0 right-0 z-[100] transition-all duration-500 py-4 px-6 md:px-12 flex items-center justify-between
                ${scrolled || isMobileMenuOpen ? 'bg-white/95 shadow-2xl shadow-slate-200/50 backdrop-blur-xl border-b border-slate-100' : 'bg-transparent'}
            `}>
                {/* أزرار الدخول */}
                <div className="flex items-center gap-2 md:gap-3">
                    <div className="hidden sm:flex items-center gap-2 md:gap-3">
                        <Button
                            onClick={() => navigate('/login')}
                            className="bg-slate-900 hover:bg-slate-800 text-white font-black px-4 md:px-8 h-10 md:h-14 rounded-xl md:rounded-2xl shadow-xl transition-all hover:scale-105 active:scale-95 text-xs md:text-base whitespace-nowrap"
                        >
                            دخول النظام
                        </Button>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="xl:hidden rounded-xl w-12 h-12 bg-slate-50 border border-slate-200"
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    >
                        {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
                    </Button>
                </div>

                {/* روابط التنقل */}
                <div className="hidden xl:flex items-center gap-6 bg-white/50 backdrop-blur-md px-8 py-3 rounded-2xl border border-white/20 shadow-sm">
                    <button onClick={() => navigate('/')} className="font-black text-slate-800 hover:text-primary transition-all text-base whitespace-nowrap">الرئيسية</button>
                    <div className="w-1 h-1 bg-slate-300 rounded-full"></div>
                    <button onClick={() => navigate('/#about-us')} className="font-black text-slate-500 hover:text-primary transition-all text-base whitespace-nowrap">من نحن</button>
                    <div className="w-1 h-1 bg-slate-300 rounded-full"></div>
                    <button onClick={() => navigate('/#contact-us')} className="font-black text-slate-500 hover:text-primary transition-all text-base whitespace-nowrap">اتصل بنا</button>
                    <div className="w-1 h-1 bg-slate-300 rounded-full"></div>
                    <Button
                        variant="ghost"
                        onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); setIsMobileMenuOpen(false); }}
                        className="font-black text-primary hover:bg-primary/5 transition-all text-base flex items-center gap-2 h-auto py-0 whitespace-nowrap"
                    >
                        <Search size={18} />
                        تتبع شحنة
                    </Button>
                </div>

                {/* الشعار */}
                <div className="flex items-center">
                    <div className="relative group">
                        <img
                            src="/logo.png"
                            alt="SAS Logo"
                            className="h-20 md:h-32 w-auto object-contain cursor-pointer transition-all duration-700 hover:scale-110 active:scale-95 relative drop-shadow-xl"
                            onClick={() => navigate('/')}
                        />
                    </div>
                </div>
            </nav>

            {/* 📱 القائمة الجانبية للجوال */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed inset-0 z-[90] bg-white pt-48 pb-10 px-8 flex flex-col xl:hidden"
                    >
                        <div className="space-y-6">
                            <button
                                onClick={() => { navigate('/'); setIsMobileMenuOpen(false); }}
                                className="w-full text-right text-3xl font-black text-slate-800 py-6 border-b border-slate-50 flex items-center justify-end gap-4"
                            >
                                الرئيسية
                            </button>
                            <button
                                onClick={() => { navigate('/#about-us'); setIsMobileMenuOpen(false); }}
                                className="w-full text-right text-3xl font-black text-slate-800 py-6 border-b border-slate-50 flex items-center justify-end gap-4"
                            >
                                من نحن
                            </button>
                            <button
                                onClick={() => { navigate('/#contact-us'); setIsMobileMenuOpen(false); }}
                                className="w-full text-right text-3xl font-black text-slate-800 py-6 border-b border-slate-50 flex items-center justify-end gap-4"
                            >
                                اتصل بنا
                            </button>
                            <button
                                onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); setIsMobileMenuOpen(false); }}
                                className="w-full text-right text-3xl font-black text-primary py-6 flex items-center justify-end gap-4"
                            >
                                تتبع الشحنة <Search size={32} />
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
                    <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-6">تتبع شحنتك المباشر</h1>
                    <p className="text-slate-500 font-bold text-lg mb-10">أدخل رقم الشحنة لمتابعة حالتها في الوقت الفعلي</p>

                    <form onSubmit={handleTrack} className="flex flex-col md:flex-row gap-4 mb-12">
                        <div className="relative flex-1 group">
                            <Input
                                value={trackingNumber}
                                onChange={(e) => setTrackingNumber(e.target.value)}
                                placeholder="أدخل رقم الشحنة (Waybill)..."
                                className="h-16 px-8 rounded-2xl border-2 border-slate-100 bg-white text-lg font-bold focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all shadow-sm"
                            />
                            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={24} />
                        </div>
                        <Button
                            disabled={loading || !trackingNumber.trim()}
                            className="h-16 px-10 rounded-2xl bg-primary hover:bg-primary/90 text-white text-lg font-black shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : "بحث وتتبع"}
                        </Button>
                    </form>

                    <AnimatePresence mode="wait">
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="p-6 bg-rose-50 border-2 border-rose-100 rounded-3xl text-rose-600 font-black flex items-center gap-4 text-right"
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
                                className="space-y-6 text-right"
                            >
                                {/* Results Card */}
                                <Card className="border-none shadow-2xl shadow-slate-200/50 rounded-[2.5rem] overflow-hidden bg-white">
                                    <CardContent className="p-8 md:p-12">
                                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12 pb-8 border-b border-slate-50">
                                            <div>
                                                <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-1">بيانات الشحنة</h2>
                                                <p className="text-3xl font-black text-slate-900 mb-1">#{shipment.id.substring(0, 8).toUpperCase()}</p>
                                                <p className="text-[10px] font-bold text-slate-300 tracking-tighter uppercase">ID: {shipment.id}</p>
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
                                                        <div key={index} className="flex flex-col items-center gap-4">
                                                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 z-10 shadow-xl
                                                                ${isActive ? 'bg-primary text-white scale-110 shadow-primary/30' : 'bg-white text-slate-300 border-2 border-slate-100'}
                                                                ${isCurrent ? 'ring-4 ring-primary/20 bg-blue-600' : ''}
                                                            `}>
                                                                {index === 0 && <Package size={28} />}
                                                                {index === 1 && <Clock size={28} />}
                                                                {index === 2 && <Truck size={28} />}
                                                                {index === 3 && <CheckCircle2 size={28} />}
                                                            </div>
                                                            <span className={`text-sm font-black whitespace-nowrap ${isActive ? 'text-slate-900' : 'text-slate-400'}`}>
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
                                                    <h3 className="font-black text-slate-900 text-lg">مسار الرحلة</h3>
                                                </div>
                                                <div className="space-y-4 pr-1">
                                                    <div className="flex items-start gap-4">
                                                        <div className="w-3 h-3 rounded-full bg-orange-400 mt-1.5" />
                                                        <div>
                                                            <p className="text-xs font-bold text-slate-400">من (المصدر)</p>
                                                            <p className="font-black text-slate-800">{shipment.origin}</p>
                                                        </div>
                                                    </div>
                                                    <div className="w-0.5 h-6 bg-slate-200 mr-1.5" />
                                                    <div className="flex items-start gap-4">
                                                        <div className="w-3 h-3 rounded-full bg-blue-600 mt-1.5" />
                                                        <div>
                                                            <p className="text-xs font-bold text-slate-400">إلى (الوجهة)</p>
                                                            <p className="font-black text-slate-800">{shipment.destination}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 gap-4">
                                                <div className="p-6 bg-blue-50/50 rounded-3xl border border-blue-100/50 flex items-center justify-between">
                                                    <div className="flex items-center gap-4">
                                                        <Calendar className="text-blue-600" size={24} />
                                                        <div>
                                                            <p className="text-xs font-bold text-slate-400">تاريخ الشحن</p>
                                                            <p className="font-black text-slate-800">{new Date(shipment.created_at).toLocaleDateString('ar-SA')}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="p-6 bg-emerald-50/50 rounded-3xl border border-emerald-100/50 flex items-center justify-between">
                                                    <div className="flex items-center gap-4">
                                                        <Package className="text-emerald-600" size={24} />
                                                        <div>
                                                            <p className="text-xs font-bold text-slate-400">نوع الشحنة</p>
                                                            <p className="font-black text-slate-800">{shipment.package_type || "نقل عام"}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <div className="p-8 bg-slate-900 rounded-[2.5rem] text-white flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative group">
                                    <div className="z-10 text-center md:text-right">
                                        <h3 className="text-2xl font-black mb-2">هل تريد إدارة شحناتك باحترافية؟</h3>
                                        <p className="text-slate-400 font-bold">انضم إلى مجتمع SAS Transport وأدر أسطولك ذكياً</p>
                                    </div>
                                    <Button
                                        onClick={() => navigate('/register')}
                                        className="z-10 h-14 px-10 rounded-2xl bg-white text-slate-900 hover:bg-slate-100 font-black transition-all"
                                    >
                                        ابدأ الآن مجاناً
                                        <ArrowRight className="mr-2 rotate-180" size={20} />
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
                <div className="container mx-auto flex flex-col md:flex-row justify-between items-center gap-8 text-center md:text-right">
                    <div className="flex items-center gap-6">
                        <img src="/favicon.png" alt="SAS" className="h-8 opacity-40 grayscale" />
                        <span className="text-slate-400 font-bold text-sm">© {new Date().getFullYear()} SAS TRANSPORT LOGISTICS</span>
                    </div>

                    <div className="flex items-center gap-8">
                        <Link to="/privacy" className="text-slate-400 hover:text-primary font-black text-sm transition-colors">سياسة الخصوصية</Link>
                        <Link to="/terms" className="text-slate-400 hover:text-primary font-black text-sm transition-colors">الشروط والأحكام</Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}
