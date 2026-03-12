import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/services/api';
import {
    Hammer,
    ArrowRight,
    CheckCircle2,
    MessageCircle,
    Loader2,
    Navigation,
    Calendar,
    BadgeDollarSign,
    Clock,
    XCircle,
    Truck
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';

export default function DriverBids() {
    const { userProfile } = useAuth();
    const navigate = useNavigate();
    const [bids, setBids] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchBids = async () => {
        if (!userProfile?.id) return;
        try {
            const data = await api.getBids(userProfile.id, 'driver');
            setBids(data || []);
        } catch (error) {
            console.error(error);
            toast.error("حدث خطأ أثناء جلب عروضك");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBids();

        if (!userProfile?.id) return;

        const bidsSubscription = supabase
            .channel('driver-bids-changes')
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'load_bids',
                    filter: `driver_id=eq.${userProfile.id}`
                },
                () => fetchBids()
            )
            .subscribe();

        return () => {
            supabase.removeChannel(bidsSubscription);
        };
    }, [userProfile?.id]);

    const handleCancelBid = async (bidId: string) => {
        try {
            await api.cancelBid(bidId);
            toast.success("تم إلغاء طلب الترشح بنجاح");
            fetchBids();
        } catch (e: any) {
            toast.error("حدث خطأ أثناء إلغاء الطلب: " + e.message);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'accepted':
                return <Badge className="bg-emerald-500 text-white border-none flex items-center gap-1 font-bold"><CheckCircle2 size={12} /> مقبول</Badge>;
            case 'rejected':
                return <Badge className="bg-red-500 text-white border-none flex items-center gap-1 font-bold"><XCircle size={12} /> مرفوض</Badge>;
            default:
                return <Badge className="bg-amber-500 text-white border-none flex items-center gap-1 font-bold"><Clock size={12} /> قيد المراجعة</Badge>;
        }
    };

    return (
        <AppLayout>
            <div className="max-w-6xl mx-auto space-y-8 pb-20">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-600/10 rounded-2xl text-blue-600"><Hammer size={32} /></div>
                        <div>
                            <h1 className="text-4xl font-black tracking-tight text-slate-800">طلبات المهام</h1>
                            <p className="text-muted-foreground font-medium mt-1">تابع حالة الشحنات التي ترشحت لتنفيذها ومكافآتك المتوقعة</p>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <Loader2 className="animate-spin text-blue-600" size={48} />
                        <p className="font-black text-slate-400">جاري جلب عروضك...</p>
                    </div>
                ) : bids.length === 0 ? (
                    <div className="py-32 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-100 shadow-sm">
                        <BadgeDollarSign size={80} className="mx-auto text-slate-200 mb-6" />
                        <h3 className="text-2xl font-black text-slate-800 mb-2">لم تقم بالترشح لأي مهمة حتى الآن</h3>
                        <p className="text-slate-400 font-bold max-w-sm mx-auto">تصفح الشحنات المتاحة الآن وابدأ في التقاط المهام لزيادة مكافآتك.</p>
                        <Button
                            className="mt-8 rounded-xl font-black bg-blue-600 hover:bg-blue-700"
                            onClick={() => navigate('/driver/loads')}
                        >
                            تصفح المهام المتاحة
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
                                    <Card className="rounded-[2.5rem] border-none shadow-xl hover:shadow-2xl transition-all bg-white overflow-hidden flex flex-col h-full border-r-8 border-r-blue-500">
                                        <CardContent className="p-8 flex flex-col h-full">
                                            {/* رأس الكارت */}
                                            <div className="flex justify-between items-start mb-6">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2 text-blue-600 font-black mb-2">
                                                        <Navigation size={18} />
                                                        <span className="text-xl">{bid.loads?.origin} ← {bid.loads?.destination}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {getStatusBadge(bid.status)}
                                                        <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded">رقم الرحلة: #{bid.load_id?.slice(0, 8)}</span>
                                                    </div>
                                                </div>
                                                <div className="bg-blue-50/50 p-3 rounded-2xl text-center min-w-[100px] border border-blue-100/50">
                                                    <p className="text-3xl font-black text-blue-600">{bid.price}</p>
                                                    <p className="text-[10px] font-black text-blue-800/60 uppercase">حافز إضافي (ر.س)</p>
                                                </div>
                                            </div>

                                            {/* بيانات الشحنة للتعريف */}
                                            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 mb-6">
                                                <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-2">
                                                    <span>نوع الحمولة:</span>
                                                    <span className="text-slate-800">{bid.loads?.package_type || 'بضائع متنوعة'}</span>
                                                </div>
                                                <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                                                    <span>الوزن التقديري:</span>
                                                    <span className="text-slate-800">{bid.loads?.weight} طن</span>
                                                </div>
                                            </div>

                                            {/* رسالتك المرفقة */}
                                            {bid.message && (
                                                <div className="mb-6 p-4 rounded-2xl bg-slate-50/50 border border-slate-100/50 text-slate-800">
                                                    <p className="text-[10px] font-black uppercase mb-1 opacity-60">رسالتك المرفقة:</p>
                                                    <p className="text-xs font-bold leading-relaxed">{bid.message}</p>
                                                </div>
                                            )}

                                            <div className="mt-auto pt-6 border-t border-slate-50 space-y-4">
                                                {bid.status === 'accepted' ? (
                                                    <div className="space-y-3">
                                                        <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center gap-2 text-emerald-700 font-bold text-xs">
                                                            <CheckCircle2 size={16} /> تم إسناد المهمة لك لحساب الشركة.
                                                        </div>
                                                        <Button
                                                            onClick={async () => {
                                                                toast.success(`إشعار للإدارة: بدأ السائق ${userProfile?.full_name} التحرك لتنفيذ المهمة. ✅`);
                                                                navigate(`/driver/track?id=${bid.load_id}`);
                                                            }}
                                                            className="w-full h-14 rounded-2xl bg-slate-900 text-white font-black text-lg shadow-xl"
                                                        >
                                                            <Navigation className="me-2" size={20} /> ابدأ تتبع الرحلة الآن
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <div className="flex gap-3">
                                                        <Button
                                                            onClick={() => handleCancelBid(bid.id)}
                                                            variant="outline"
                                                            className="flex-1 h-14 rounded-2xl border-rose-100 text-rose-500 font-black hover:bg-rose-50 hover:text-rose-600"
                                                        >
                                                            <XCircle className="me-2" size={18} /> إلغاء الطلب
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            onClick={() => navigate('/driver/messages')}
                                                            className="h-14 w-14 rounded-2xl bg-blue-50 text-blue-600 hover:bg-blue-100 flex items-center justify-center"
                                                            title="مراسلة المشرف"
                                                        >
                                                            <MessageCircle size={24} />
                                                        </Button>
                                                    </div>
                                                )}
                                                <p className="text-center text-[10px] font-bold text-slate-400 flex items-center justify-center gap-1">
                                                    <Calendar size={12} /> قُدم في: {new Date(bid.created_at).toLocaleDateString('ar-SA')}
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
