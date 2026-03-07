import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Search, Package, MapPin, Calendar, Clock, ArrowRight, Loader2, CheckCircle2, Truck, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";

export default function PublicTrackingPage() {
    const [trackingNumber, setTrackingNumber] = useState("");
    const [loading, setLoading] = useState(false);
    const [shipment, setShipment] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    const handleTrack = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!trackingNumber.trim()) return;

        setLoading(true);
        setError(null);
        setShipment(null);

        try {
            const { data, error: sbError } = await supabase
                .from('loads')
                .select('*')
                .eq('id', trackingNumber.trim())
                .maybeSingle();

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
        <div className="min-h-screen bg-[#f8fafc] flex flex-col font-['Cairo']" dir="rtl">
            {/* Header / Navbar */}
            <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100 flex items-center justify-between px-6 py-4">
                <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
                    <img src="/logo.png" alt="SAS Logo" className="h-10 w-auto" />
                </div>
                <Button variant="ghost" className="font-bold text-slate-600" onClick={() => navigate('/login')}>
                    تسجيل الدخول
                </Button>
            </header>

            {/* Main Area */}
            <main className="flex-1 flex flex-col items-center pt-32 pb-20 px-4">
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
                                                <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-1">رقم الشحنة المستعلم عنها</h2>
                                                <p className="text-2xl font-black text-slate-900">{shipment.id}</p>
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
            <footer className="py-10 text-center text-slate-400 text-xs font-black tracking-widest uppercase border-t border-slate-100 bg-white">
                SAS TRANSPORT WORLDWIDE LOGISTICS • {new Date().getFullYear()}
            </footer>
        </div>
    );
}
