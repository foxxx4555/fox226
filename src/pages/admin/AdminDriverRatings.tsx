import { useEffect, useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { api } from '@/services/api';
import { Loader2, Search, Star, MessageSquare, ShieldAlert, CheckCircle2, User, Truck, Calendar } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function AdminDriverRatings() {
    const [ratings, setRatings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    const fetchRatings = async () => {
        try {
            const data = await api.getAdminDriverRatings();
            setRatings(data || []);
        } catch (error) {
            toast.error("حدث خطأ أثناء جلب التقييمات");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRatings();
    }, []);

    const filteredRatings = ratings.filter(r =>
        r.rated?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.rater?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.comment?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const renderStars = (rating: number) => {
        return Array(5).fill(0).map((_, i) => (
            <Star key={i} size={16} className={i < rating ? "fill-amber-500 text-amber-500" : "text-slate-200 fill-slate-50"} />
        ));
    };

    return (
        <AdminLayout>
            <div className="space-y-8 max-w-7xl mx-auto pb-20 px-4">
                <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
                            <Star className="text-amber-500 fill-amber-50" size={32} />
                            سجل تقييمات الناقلين
                        </h1>
                        <p className="text-slate-500 font-bold mt-1">مراقبة آراء التجار وتقييماتهم لأداء السائقين</p>
                    </div>
                    <div className="relative w-full md:w-96">
                        <Input
                            placeholder="ابحث باسم السائق، التاجر، أو التعليق..."
                            className="h-14 rounded-2xl bg-slate-50 border-none font-bold pl-12"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <Loader2 className="animate-spin text-blue-600" size={48} />
                    </div>
                ) : filteredRatings.length === 0 ? (
                    <div className="text-center py-24 bg-white rounded-[3rem] border border-slate-100 shadow-sm mt-4">
                        <div className="w-24 h-24 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Star size={48} className="text-amber-300 fill-amber-300" />
                        </div>
                        <p className="text-slate-500 font-black text-xl">لا توجد تقييمات مطابقة للبحث</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {filteredRatings.map(rating => (
                            <Card key={rating.id} className="rounded-[2.5rem] border-none shadow-md bg-white hover:shadow-xl transition-all overflow-hidden relative group">
                                <div className={`absolute top-0 right-0 w-2 h-full ${rating.rating >= 4 ? 'bg-emerald-500' : rating.rating === 3 ? 'bg-amber-500' : 'bg-rose-500'}`}></div>

                                <CardContent className="p-0">
                                    <div className="p-8 border-b border-slate-50 bg-slate-50/50 flex justify-between items-start">
                                        <div className="flex gap-4 items-start">
                                            <div className="w-16 h-16 rounded-2xl bg-white shadow-sm flex items-center justify-center text-2xl font-black text-slate-700 border border-slate-100">
                                                {rating.rated?.full_name?.charAt(0) || <User size={24} className="text-slate-400" />}
                                            </div>
                                            <div>
                                                <h3 className="font-black text-xl text-slate-800 flex items-center gap-2">
                                                    {rating.rated?.full_name || 'سائق غير معروف'}
                                                    {rating.rated?.status === 'active' && <span title="موثق"><CheckCircle2 size={16} className="text-emerald-500" /></span>}
                                                </h3>
                                                <div className="flex gap-1 mt-2 bg-white px-3 py-1.5 rounded-xl border border-slate-100 shadow-sm inline-flex">
                                                    {renderStars(rating.rating)}
                                                </div>
                                            </div>
                                        </div>
                                        <Badge variant="outline" className="bg-white border-slate-200 text-slate-500 whitespace-nowrap hidden sm:flex items-center gap-1.5 px-3 py-1.5">
                                            <Calendar size={14} /> {new Date(rating.created_at).toLocaleDateString('ar-SA')}
                                        </Badge>
                                    </div>

                                    <div className="p-8 space-y-6">
                                        {rating.comment && (
                                            <div className="bg-blue-50/50 border border-blue-100 rounded-3xl p-6 relative">
                                                <MessageSquare size={24} className="text-blue-200 absolute top-4 left-4" />
                                                <p className="text-[12px] font-black uppercase text-blue-400 mb-2">تعليق التاجر</p>
                                                <p className="font-bold text-blue-900 text-lg leading-relaxed relative z-10">{rating.comment}</p>
                                            </div>
                                        )}

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                                                <div className="flex items-center gap-2 mb-2 text-slate-400">
                                                    <User size={14} />
                                                    <p className="text-[11px] font-black uppercase">التاجر (المُقيِّم)</p>
                                                </div>
                                                <p className="font-bold text-slate-700 truncate">{rating.rater?.full_name || 'غير معروف'}</p>
                                            </div>
                                            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                                                <div className="flex items-center gap-2 mb-2 text-slate-400">
                                                    <Truck size={14} />
                                                    <p className="text-[11px] font-black uppercase">تفاصيل الرحلة</p>
                                                </div>
                                                <p className="font-bold text-slate-700 truncate">
                                                    {rating.load?.origin} ← {rating.load?.destination}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
