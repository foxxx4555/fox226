import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/services/api';
import {
    Gavel,
    ArrowRight,
    CheckCircle2,
    XCircle,
    MessageCircle,
    Loader2,
    Navigation,
    User,
    Calendar,
    BadgeDollarSign,
    Truck
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';

export default function ShipperBids() {
    const { userProfile } = useAuth();
    const navigate = useNavigate();
    const [bids, setBids] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [acceptingId, setAcceptingId] = useState<string | null>(null);
    const [rejectingId, setRejectingId] = useState<string | null>(null);

    const fetchBids = async () => {
        if (!userProfile?.id) return;
        try {
            const data = await api.getBids(userProfile.id, 'shipper');
            // Filter out rejected bids so they don't show up in the shipper's view
            const activeBids = (data || []).filter((bid: any) => bid.status !== 'rejected');
            setBids(activeBids);
        } catch (error) {
            console.error(error);
            toast.error("حدث خطأ أثناء جلب العروض");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBids();
    }, [userProfile?.id]);

    const handleAcceptBid = async (bid: any) => {
        if (!confirm(`هل أنت متأكد من قبول عرض السائق ${bid.driver?.full_name} بقيمة ${bid.price} ر.س؟`)) return;

        setAcceptingId(bid.id);
        try {
            await api.acceptBid(bid.load_id, bid.driver_id, bid.price);
            toast.success("تم قبول العرض بنجاح! الشحنة الآن قيد التنفيذ.");
            fetchBids();
            // الانتقال لصفحة التتبع لمراقبة السائق
            setTimeout(() => navigate('/shipper/track'), 1500);
        } catch (error) {
            toast.error("حدث خطأ أثناء قبول العرض");
        } finally {
            setAcceptingId(null);
        }
    };

    const handleRejectBid = async (bidId: string, driverId: string, driverName: string) => {
        if (!confirm(`هل أنت متأكد من رفض عرض السائق ${driverName}؟`)) return;

        setRejectingId(bidId);
        try {
            await api.rejectBid(bidId);
            // Send notification to the driver
            await api.createNotification(
                driverId,
                'تم رفض عرضك',
                `عذراً، قام الشاحن برفض عرضك المُقدم على الشحنة.`,
                'system'
            );
            toast.success("تم رفض العرض وإشعار السائق.");
            fetchBids();
        } catch (error) {
            toast.error("حدث خطأ أثناء رفض العرض");
        } finally {
            setRejectingId(null);
        }
    };

    return (
        <AppLayout>
            <div className="max-w-6xl mx-auto space-y-8 pb-20">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-600/10 rounded-2xl text-blue-600"><Gavel size={32} /></div>
                        <div>
                            <h1 className="text-4xl font-black tracking-tight text-slate-800">عروض الأسعار المستلمة</h1>
                            <p className="text-muted-foreground font-medium mt-1">راجع عروض الناقلين واختر الأنسب لشحنتك</p>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <Loader2 className="animate-spin text-blue-600" size={48} />
                        <p className="font-black text-slate-400">جاري جلب العروض...</p>
                    </div>
                ) : bids.length === 0 ? (
                    <div className="py-32 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-100 shadow-sm">
                        <BadgeDollarSign size={80} className="mx-auto text-slate-200 mb-6" />
                        <h3 className="text-2xl font-black text-slate-800 mb-2">لا يوجد عروض حالياً</h3>
                        <p className="text-slate-400 font-bold max-w-sm mx-auto">بمجرد قيام السائقين بتقديم عروض على شحناتك المتاحة، ستظهر هنا فوراً.</p>
                        <Button
                            variant="outline"
                            className="mt-8 rounded-xl font-black border-blue-200 text-blue-600"
                            onClick={() => navigate('/shipper/post')}
                        >
                            نشر شحنة جديدة الآن
                        </Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <AnimatePresence>
                            {bids.map((bid) => (
                                <motion.div
                                    key={bid.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                >
                                    <Card className="rounded-[2.5rem] border-none shadow-xl hover:shadow-2xl transition-all bg-white overflow-hidden flex flex-col h-full border-t-4 border-t-blue-500">
                                        <CardContent className="p-8 flex flex-col h-full">
                                            {/* رأس الكارت - بيانات الشحنة */}
                                            <div className="flex justify-between items-start mb-6">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2 text-blue-600 font-black mb-2">
                                                        <Navigation size={18} />
                                                        <span>{bid.loads.origin} ← {bid.loads.destination}</span>
                                                    </div>
                                                    <Badge className="bg-slate-100 text-slate-600 border-none font-bold text-[10px]">
                                                        رقم الشحنة: #{bid.load_id.slice(0, 8)}
                                                    </Badge>
                                                </div>
                                                <div className="text-end">
                                                    <p className="text-3xl font-black text-emerald-600">{bid.price}</p>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ريال سعودي</p>
                                                </div>
                                            </div>

                                            {/* بيانات السائق والشاحنة */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                                                <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50">
                                                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm text-slate-400">
                                                        <User size={24} />
                                                    </div>
                                                    <div className="flex-1">
                                                        <h4 className="font-black text-slate-800 text-sm">{bid.driver?.full_name}</h4>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <span className="text-[10px] font-bold text-amber-500">⭐ 4.9</span>
                                                            <span className="text-[10px] font-bold text-slate-400">{bid.driver?.phone}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-4 p-4 rounded-2xl bg-blue-50/50 border border-blue-100/50">
                                                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm text-blue-500">
                                                        <Truck size={24} />
                                                    </div>
                                                    <div className="flex-1">
                                                        <h4 className="font-black text-slate-800 text-sm">بيانات الشاحنة</h4>
                                                        <p className="text-[10px] font-bold text-blue-600">
                                                            {bid.driver?.truck_type || 'شاحنة نقل'} - لوحة: {bid.driver?.plate_number || 'غير مسجل'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* ملاحظات السائق */}
                                            {bid.message && (
                                                <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-800">
                                                    <p className="text-[10px] font-black uppercase mb-1 opacity-60">ملاحظة السائق:</p>
                                                    <p className="text-xs font-bold leading-relaxed">{bid.message}</p>
                                                </div>
                                            )}

                                            <div className="mt-auto pt-6 border-t border-slate-50 space-y-4">
                                                <div className="bg-slate-50 rounded-xl p-3">
                                                    <p className="text-[9px] font-black text-slate-400 text-center mb-2 uppercase tracking-tighter">ماذا يحدث عند القبول؟</p>
                                                    <div className="flex justify-around items-center opacity-60">
                                                        <div className="flex flex-col items-center gap-1">
                                                            <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center text-white text-[10px] font-black">1</div>
                                                            <span className="text-[8px] font-bold">حجز السائق</span>
                                                        </div>
                                                        <ArrowRight size={10} className="text-slate-300" />
                                                        <div className="flex flex-col items-center gap-1">
                                                            <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-[10px] font-black">2</div>
                                                            <span className="text-[8px] font-bold">إشعار فوري</span>
                                                        </div>
                                                        <ArrowRight size={10} className="text-slate-300" />
                                                        <div className="flex flex-col items-center gap-1">
                                                            <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center text-white text-[10px] font-black">3</div>
                                                            <span className="text-[8px] font-bold">بدء التتبع</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex gap-3">
                                                    <Button
                                                        onClick={() => handleAcceptBid(bid)}
                                                        disabled={acceptingId === bid.id || rejectingId === bid.id}
                                                        className="flex-1 h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-lg shadow-lg shadow-blue-500/20"
                                                    >
                                                        {acceptingId === bid.id ? <Loader2 className="animate-spin" /> : (
                                                            <>
                                                                <CheckCircle2 className="me-2" size={20} /> قبول العرض
                                                            </>
                                                        )}
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        onClick={() => handleRejectBid(bid.id, bid.driver_id, bid.driver?.full_name || 'السائق')}
                                                        disabled={acceptingId === bid.id || rejectingId === bid.id}
                                                        className="h-14 flex-[0.3] rounded-2xl bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 font-black shadow-none flex items-center justify-center border border-red-100/50"
                                                        title="رفض العرض"
                                                    >
                                                        {rejectingId === bid.id ? <Loader2 className="animate-spin" /> : (
                                                            <>
                                                                <XCircle className="me-2" size={20} /> رفض
                                                            </>
                                                        )}
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        onClick={() => navigate(`/shipper/messaging?driverId=${bid.driver_id}`)}
                                                        className="h-14 w-14 rounded-2xl bg-slate-50 text-slate-600 hover:bg-slate-100 flex items-center justify-center shrink-0"
                                                        title="مراسلة السائق"
                                                    >
                                                        <MessageCircle size={24} />
                                                    </Button>
                                                </div>
                                                <p className="text-center text-[10px] font-bold text-slate-400 flex items-center justify-center gap-1">
                                                    <Calendar size={12} /> تاريخ العرض: {new Date(bid.created_at).toLocaleDateString('ar-SA')}
                                                </p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
