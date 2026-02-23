import { useState, useEffect, useMemo } from 'react';
import AppLayout from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge'; // تأكد من وجود مكون Badge في مشروعك
import { api } from '@/services/api';
import { useAuth } from '@/hooks/useAuth';
import {
    FileText, Download, Calendar, ArrowUpRight,
    ArrowDownRight, DollarSign, Loader2, Search,
    Filter, X, Wallet, ArrowRightLeft
} from 'lucide-react';

export default function ShipperStatement() {
    const { userProfile } = useAuth();
    const [loading, setLoading] = useState(true);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [walletBalance, setWalletBalance] = useState(0); // الرصيد من قاعدة البيانات
    const [searchQuery, setSearchQuery] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    useEffect(() => {
        if (userProfile?.id) {
            loadFinancialData();
        }
    }, [userProfile]);

    const loadFinancialData = async () => {
        setLoading(true);
        try {
            // 1. جلب الرصيد المتاح من قاعدة البيانات (افترضنا وجود دالة getWallet)
            const walletData = await api.getWalletBalance(userProfile?.id);
            setWalletBalance(walletData.balance || 0);

            // 2. جلب العمليات المالية (Transactions)
            // ملاحظة: يفضل أن يكون هناك API مخصص للعمليات المالية
            // إذا لم يتوفر، سنعتمد على معالجة الـ Loads كما فعلنا سابقاً
            const data = await api.getUserLoads(userProfile?.id);

            const mappedTransactions = data.map((l: any) => ({
                id: l.id,
                date: l.updated_at,
                description: `شحنة من ${l.origin} إلى ${l.destination}`,
                amount: Number(l.price),
                type: l.status === 'completed' ? 'expense' : 'pending',
                reference: l.id.substring(0, 8).toUpperCase(),
                status: l.status // completed, pending, cancelled
            }));

            setTransactions(mappedTransactions.sort((a, b) =>
                new Date(b.date).getTime() - new Date(a.date).getTime()
            ));
        } catch (err) {
            console.error("Error loading financial data:", err);
        } finally {
            setLoading(false);
        }
    };

    // منطق التصفية والبحث المتقدم
    const filteredTransactions = useMemo(() => {
        return transactions.filter(t => {
            const matchesSearch =
                t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                t.reference.toLowerCase().includes(searchQuery.toLowerCase());

            const tDate = new Date(t.date).getTime();
            const from = dateFrom ? new Date(dateFrom).getTime() : -Infinity;
            const to = dateTo ? new Date(dateTo).getTime() : Infinity;

            return matchesSearch && tDate >= from && tDate <= to;
        });
    }, [transactions, searchQuery, dateFrom, dateTo]);

    // حساب الإجماليات من البيانات الحقيقية
    const stats = useMemo(() => {
        const spent = transactions
            .filter(t => t.type === 'expense')
            .reduce((acc, curr) => acc + curr.amount, 0);
        return { spent };
    }, [transactions]);

    const formatCurrency = (val: number) => new Intl.NumberFormat('ar-SA').format(val);

    return (
        <AppLayout>
            <div className="max-w-6xl mx-auto space-y-8 pb-20">

                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="p-4 bg-primary text-white rounded-2xl shadow-lg shadow-primary/20">
                            <Wallet size={28} />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-slate-900">المحفظة المالية</h1>
                            <p className="text-muted-foreground font-medium">إدارة الرصيد والعمليات المالية الصادرة والواردة</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button variant="outline" className="rounded-xl font-bold border-slate-200">
                            <Download size={18} className="me-2" /> تصدير Excel
                        </Button>
                        <Button className="rounded-xl bg-slate-900 hover:bg-slate-800 font-bold px-6">
                            إضافة رصيد +
                        </Button>
                    </div>
                </div>

                {/* Statistics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* الرصيد المتاح - يأتي الآن من State منفصلة من قاعدة البيانات */}
                    <Card className="rounded-[2.5rem] border-none shadow-2xl bg-slate-900 text-white overflow-hidden relative min-h-[160px] flex items-center">
                        <div className="absolute -right-4 -top-4 w-32 h-32 bg-primary/20 rounded-full blur-3xl"></div>
                        <CardContent className="p-8 w-full relative z-10">
                            <p className="text-slate-400 font-bold mb-2 flex items-center gap-2">
                                <DollarSign size={16} /> الرصيد المتاح حالياً
                            </p>
                            <h2 className="text-5xl font-black tabular-nums">
                                {formatCurrency(walletBalance)}
                                <span className="text-lg font-medium text-slate-500 mr-2">ر.س</span>
                            </h2>
                        </CardContent>
                    </Card>

                    <Card className="rounded-[2.5rem] border-none shadow-sm bg-white overflow-hidden border border-slate-100">
                        <CardContent className="p-8">
                            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center mb-4">
                                <ArrowUpRight size={24} />
                            </div>
                            <p className="text-slate-500 font-bold">إجمالي المدفوعات</p>
                            <h2 className="text-3xl font-black text-slate-800 mt-1">
                                {formatCurrency(stats.spent)} <span className="text-sm font-bold text-slate-400">ر.س</span>
                            </h2>
                        </CardContent>
                    </Card>

                    <Card className="rounded-[2.5rem] border-none shadow-sm bg-white overflow-hidden border border-slate-100">
                        <CardContent className="p-8">
                            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center mb-4">
                                <ArrowRightLeft size={24} />
                            </div>
                            <p className="text-slate-500 font-bold">عمليات قيد التنفيذ</p>
                            <h2 className="text-3xl font-black text-slate-800 mt-1">
                                {transactions.filter(t => t.status === 'pending').length}
                                <span className="text-sm font-bold text-slate-400 mr-2">عملية</span>
                            </h2>
                        </CardContent>
                    </Card>
                </div>

                {/* Filters & Search Bar */}
                <div className="bg-white p-4 rounded-[2rem] shadow-sm border border-slate-100 grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="relative md:col-span-2">
                        <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <Input
                            placeholder="البحث برقم المرجع، المسار، أو التفاصيل..."
                            className="h-12 pr-12 bg-slate-50 border-none rounded-2xl focus-visible:ring-primary/20"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center bg-slate-50 rounded-2xl px-4 border border-transparent focus-within:border-primary/20">
                        <Calendar size={18} className="text-slate-400 ml-2" />
                        <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="bg-transparent border-none h-12 p-0 focus-visible:ring-0 text-sm" />
                    </div>
                    <div className="flex items-center bg-slate-50 rounded-2xl px-4 border border-transparent focus-within:border-primary/20">
                        <Calendar size={18} className="text-slate-400 ml-2" />
                        <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="bg-transparent border-none h-12 p-0 focus-visible:ring-0 text-sm" />
                    </div>
                </div>

                {/* Transactions Table/List */}
                <Card className="rounded-[2.5rem] border-none shadow-xl bg-white overflow-hidden">
                    <CardHeader className="p-8 pb-4 flex flex-row items-center justify-between">
                        <CardTitle className="text-xl font-black flex items-center gap-2">
                            سجل المعاملات
                            <Badge variant="secondary" className="rounded-lg">{filteredTransactions.length}</Badge>
                        </CardTitle>
                        {(searchQuery || dateFrom || dateTo) && (
                            <Button variant="ghost" size="sm" onClick={() => { setSearchQuery(''); setDateFrom(''); setDateTo(''); }} className="text-rose-500 hover:text-rose-600 font-bold">
                                <X size={16} className="ml-1" /> إعادة ضبط
                            </Button>
                        )}
                    </CardHeader>
                    <CardContent className="p-0">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-24 gap-4">
                                <Loader2 className="animate-spin text-primary" size={40} />
                                <p className="text-slate-400 font-bold">جاري تحديث البيانات المالية...</p>
                            </div>
                        ) : filteredTransactions.length === 0 ? (
                            <div className="text-center py-24">
                                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Filter size={32} className="text-slate-200" />
                                </div>
                                <p className="font-black text-slate-400 text-xl">لا توجد نتائج تطابق بحثك</p>
                                <p className="text-slate-400 mt-1">جرب تغيير فلاتر البحث أو التواريخ</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-50">
                                {filteredTransactions.map((t) => (
                                    <div key={t.id} className="p-6 md:px-8 flex flex-col md:flex-row justify-between items-center gap-4 hover:bg-slate-50/80 transition-all cursor-pointer group">
                                        <div className="flex items-center gap-6 w-full md:w-auto">
                                            {/* أيقونة الحالة */}
                                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm border transition-transform group-hover:scale-110 ${t.type === 'income'
                                                    ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                                    : 'bg-slate-100 text-slate-600 border-slate-200'
                                                }`}>
                                                {t.type === 'income' ? <ArrowDownRight size={24} /> : <ArrowUpRight size={24} />}
                                            </div>

                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <p className="font-black text-slate-800 text-lg leading-tight">{t.description}</p>
                                                    {t.status === 'pending' && (
                                                        <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-none text-[10px] px-2">معلق</Badge>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-3 text-sm font-bold text-slate-400">
                                                    <span className="flex items-center gap-1.5"><Calendar size={14} /> {new Date(t.date).toLocaleDateString('ar-SA')}</span>
                                                    <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                                                    <span className="tracking-widest text-[11px] bg-slate-50 px-2 py-0.5 rounded border border-slate-100">#{t.reference}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="text-end w-full md:w-auto mt-4 md:mt-0 flex md:flex-col justify-between md:justify-end items-center md:items-end border-t md:border-none pt-4 md:pt-0">
                                            <p className={`font-black text-2xl tabular-nums ${t.type === 'income' ? 'text-emerald-500' : 'text-slate-900'}`}>
                                                {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                                            </p>
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter">ريال سعودي</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}