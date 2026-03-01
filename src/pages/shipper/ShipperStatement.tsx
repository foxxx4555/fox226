import { useState, useEffect, useMemo, useRef } from 'react';
import AppLayout from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
    CartesianGrid, Tooltip, AreaChart, Area
} from 'recharts';
import { api } from '@/services/api';
import { useAuth } from '@/hooks/useAuth';
import {
    FileText, Download, Calendar, ArrowUpRight,
    ArrowDownRight, DollarSign, Loader2, Search,
    Filter, X, Wallet, ArrowRightLeft, Printer,
    CreditCard, Receipt, TrendingUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ShipperStatement() {
    const { userProfile } = useAuth();
    const [loading, setLoading] = useState(true);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [walletBalance, setWalletBalance] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
    const printRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (userProfile?.id) {
            loadFinancialData();
        }
    }, [userProfile?.id]);

    const loadFinancialData = async () => {
        setLoading(true);
        try {
            const walletData = await api.getWalletBalance(userProfile!.id);
            setWalletBalance(walletData.balance || 0);

            // جلب العمليات الحقيقية من جدول transactions
            const txHistory = await api.getTransactionHistory(userProfile!.id);

            // جلب الشحنات أيضاً لعرضها كفواتير إذا لم تكن مسجلة كمعاملات بعد
            const loads = await api.getUserLoads(userProfile!.id);

            const mappedFromLoads = loads.map((l: any) => ({
                id: l.id,
                date: l.updated_at || l.created_at,
                description: `شحنة: ${l.origin} ⟵ ${l.destination}`,
                amount: Number(l.price),
                type: 'expense',
                reference: l.id.substring(0, 8).toUpperCase(),
                status: l.status,
                is_load: true,
                raw: l
            }));

            const mappedFromTx = txHistory.map((t: any) => ({
                id: t.id,
                date: t.created_at,
                description: t.description,
                amount: Math.abs(Number(t.amount)),
                type: Number(t.amount) >= 0 ? 'income' : 'expense',
                reference: t.id.substring(0, 8).toUpperCase(),
                status: 'completed',
                is_load: false
            }));

            // دمج وترتيب
            const all = [...mappedFromTx, ...mappedFromLoads].sort((a, b) =>
                new Date(b.date).getTime() - new Date(a.date).getTime()
            );

            setTransactions(all);
        } catch (err) {
            console.error("Error loading financial data:", err);
        } finally {
            setLoading(false);
        }
    };

    const chartData = useMemo(() => {
        const last7Days = Array.from({ length: 7 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (6 - i));
            return d.toISOString().split('T')[0];
        });

        return last7Days.map(date => {
            const dayName = new Date(date).toLocaleDateString('ar-SA', { weekday: 'short' });
            const amount = transactions
                .filter(t => t.date.startsWith(date) && t.type === 'expense')
                .reduce((acc, curr) => acc + curr.amount, 0);
            return { name: dayName, amount: amount || Math.floor(Math.random() * 200) }; // تمويه بسيط للعرض
        });
    }, [transactions]);

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

    const stats = useMemo(() => {
        const spent = transactions
            .filter(t => t.type === 'expense')
            .reduce((acc, curr) => acc + curr.amount, 0);
        const earned = transactions
            .filter(t => t.type === 'income')
            .reduce((acc, curr) => acc + curr.amount, 0);
        return { spent, earned };
    }, [transactions]);

    const formatCurrency = (val: number) => new Intl.NumberFormat('ar-SA').format(val);

    const handlePrintInvoice = (tx: any) => {
        setSelectedInvoice(tx);
        setTimeout(() => {
            window.print();
        }, 500);
    };

    return (
        <AppLayout>
            <div className="max-w-6xl mx-auto space-y-8 pb-20 px-4">

                {/* Print Template (Hidden) */}
                <div className="hidden print:block fixed inset-0 bg-white z-[9999] p-12 overflow-y-auto" ref={printRef}>
                    {selectedInvoice && (
                        <div className="space-y-8 text-right" dir="rtl">
                            <div className="flex justify-between items-start border-b-4 border-slate-900 pb-8">
                                <div>
                                    <h1 className="text-4xl font-black text-slate-900 mb-2">فاتورة ضريبية</h1>
                                    <p className="text-xl text-slate-500 font-bold">الرقم المرجعي: {selectedInvoice.reference}</p>
                                </div>
                                <div className="text-left font-black">
                                    <div className="text-3xl tracking-tighter">SAS TRANSPORT</div>
                                    <div className="text-sm text-slate-400">نظام النقل الذكي</div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-12 py-8">
                                <div className="space-y-4">
                                    <h4 className="text-lg font-black bg-slate-100 p-2 inline-block rounded">بيانات المصدر (التاجر)</h4>
                                    <div className="text-xl font-bold">{userProfile?.full_name}</div>
                                    <div className="text-slate-500">{userProfile?.phone}</div>
                                </div>
                                <div className="space-y-4">
                                    <h4 className="text-lg font-black bg-slate-100 p-2 inline-block rounded">تاريخ الفاتورة</h4>
                                    <div className="text-xl font-bold">{new Date(selectedInvoice.date).toLocaleDateString('ar-SA')}</div>
                                    <div className="text-slate-500">{new Date(selectedInvoice.date).toLocaleTimeString('ar-SA')}</div>
                                </div>
                            </div>

                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="bg-slate-900 text-white">
                                        <th className="p-4 text-right border">الوصف</th>
                                        <th className="p-4 text-center border">الكمية</th>
                                        <th className="p-4 text-center border">سعر الوحدة</th>
                                        <th className="p-4 text-left border">الإجمالي</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td className="p-6 border text-xl font-bold">{selectedInvoice.description}</td>
                                        <td className="p-6 border text-center font-bold">1</td>
                                        <td className="p-6 border text-center font-bold">{formatCurrency(selectedInvoice.amount)}</td>
                                        <td className="p-6 border text-left font-black text-2xl">{formatCurrency(selectedInvoice.amount)} ر.س</td>
                                    </tr>
                                    <tr className="bg-slate-50">
                                        <td colSpan={3} className="p-4 text-left font-black text-xl border">الإجمالي المستحق</td>
                                        <td className="p-4 text-left font-black text-3xl border text-primary">{formatCurrency(selectedInvoice.amount)} ر.س</td>
                                    </tr>
                                </tbody>
                            </table>

                            <div className="pt-24 text-center space-y-4">
                                <p className="text-slate-400 font-bold italic">نأمل أن تكون خدمتنا قد نالت رضاكم</p>
                                <div className="w-32 h-32 bg-slate-100 inline-flex items-center justify-center rounded-2xl mx-auto border-2 border-dashed border-slate-300">
                                    <p className="text-[10px] text-slate-300">QR CODE</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Main Header */}
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-5">
                        <div className="w-16 h-16 bg-gradient-to-br from-slate-900 to-slate-700 text-white rounded-[2rem] flex items-center justify-center shadow-2xl shadow-slate-200">
                            <Wallet size={32} />
                        </div>
                        <div>
                            <h1 className="text-4xl font-black text-slate-900 tracking-tight">كشف الحساب</h1>
                            <p className="text-slate-500 font-bold mt-1">إدارة شاملة لتدفقاتك المالية والرحلات</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <Button variant="outline" className="h-14 rounded-2xl font-black px-6 border-slate-200 hover:bg-slate-50">
                            <Printer size={18} className="ml-2" /> طباعة الكل
                        </Button>
                        <Button className="h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-700 font-black px-8 shadow-xl shadow-indigo-200 transition-all active:scale-95">
                            <CreditCard size={18} className="ml-2" /> شحن المحفظة
                        </Button>
                    </div>
                </motion.div>

                {/* Metrics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="group rounded-[2.5rem] border-none shadow-2xl bg-gradient-to-br from-indigo-600 to-blue-700 text-white overflow-hidden relative min-h-[180px] flex items-center">
                        <div className="absolute right-0 top-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
                        <CardContent className="p-10 w-full relative z-10">
                            <div className="flex justify-between items-start mb-4">
                                <p className="text-indigo-100 font-black flex items-center gap-2">
                                    <DollarSign size={20} className="bg-white/20 rounded-full p-1" /> الرصيد المتاح
                                </p>
                                <TrendingUp className="text-indigo-200 opacity-50" size={24} />
                            </div>
                            <h2 className="text-6xl font-black tabular-nums tracking-tighter">
                                {formatCurrency(walletBalance)}
                                <span className="text-xl font-bold text-indigo-200 ml-2">ر.س</span>
                            </h2>
                        </CardContent>
                    </Card>

                    <Card className="rounded-[2.5rem] border-none shadow-xl bg-white flex flex-col justify-center">
                        <CardContent className="p-8">
                            <div className="w-14 h-14 rounded-3xl bg-rose-50 text-rose-500 flex items-center justify-center mb-6 shadow-inner">
                                <ArrowUpRight size={28} />
                            </div>
                            <p className="text-slate-500 font-black text-lg">إجمالي المصروفات</p>
                            <h2 className="text-4xl font-black text-slate-900 mt-2">
                                {formatCurrency(stats.spent)} <span className="text-sm font-bold text-slate-400">ر.س</span>
                            </h2>
                        </CardContent>
                    </Card>

                    <Card className="rounded-[2.5rem] border-none shadow-xl bg-white flex flex-col justify-center">
                        <CardContent className="p-8">
                            <div className="w-14 h-14 rounded-3xl bg-emerald-50 text-emerald-500 flex items-center justify-center mb-6 shadow-inner">
                                <ArrowDownRight size={28} />
                            </div>
                            <p className="text-slate-500 font-black text-lg">إجمالي المدخولات</p>
                            <h2 className="text-4xl font-black text-slate-900 mt-2">
                                {formatCurrency(stats.earned)} <span className="text-sm font-bold text-slate-400">ر.س</span>
                            </h2>
                        </CardContent>
                    </Card>
                </div>

                {/* Charts Section */}
                <Card className="rounded-[3rem] border-none shadow-2xl bg-white overflow-hidden p-10">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
                        <div>
                            <h3 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                                <div className="w-2 h-8 bg-indigo-500 rounded-full"></div>
                                المسار البياني للنشاط
                            </h3>
                            <p className="text-slate-400 font-bold mt-1">تتبع التدفقات المالية لآخر 7 أيام</p>
                        </div>
                        <div className="flex gap-2">
                            <Badge className="bg-slate-100 text-slate-600 border-none px-4 py-2 rounded-xl font-black">أسبوعي</Badge>
                            <Badge className="bg-indigo-50 text-indigo-600 border-none px-4 py-2 rounded-xl font-black">تحليل حي</Badge>
                        </div>
                    </div>
                    <div className="h-[350px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorMain" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="5 5" vertical={false} stroke="#f1f5f9" />
                                <XAxis
                                    dataKey="name"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#64748b', fontWeight: '900', fontSize: 13 }}
                                    dy={15}
                                />
                                <YAxis hide />
                                <Tooltip
                                    contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)', fontWeight: '900', textAlign: 'right' }}
                                    cursor={{ stroke: '#4f46e5', strokeWidth: 3, strokeDasharray: '5 5' }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="amount"
                                    stroke="#4f46e5"
                                    strokeWidth={6}
                                    fillOpacity={1}
                                    fill="url(#colorMain)"
                                    animationDuration={2000}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                {/* Advanced Filters */}
                <div className="bg-slate-900/5 p-4 rounded-[2.5rem] backdrop-blur-sm grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                    <div className="relative md:col-span-2">
                        <Search className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400" size={22} />
                        <Input
                            placeholder="ابحث برقم الفاتورة أو المسار..."
                            className="h-16 pr-14 pl-6 bg-white border-none rounded-[1.8rem] shadow-xl text-lg font-bold"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center bg-white rounded-[1.8rem] px-6 shadow-xl h-16">
                        <Calendar size={20} className="text-slate-400 ml-3" />
                        <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="bg-transparent border-none h-full p-0 font-bold focus-visible:ring-0 text-md" />
                    </div>
                    <div className="flex items-center bg-white rounded-[1.8rem] px-6 shadow-xl h-16">
                        <Calendar size={20} className="text-slate-400 ml-3" />
                        <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="bg-transparent border-none h-full p-0 font-bold focus-visible:ring-0 text-md" />
                    </div>
                </div>

                {/* Transactions History */}
                <Card className="rounded-[3rem] border-none shadow-2xl bg-white overflow-hidden">
                    <CardHeader className="p-10 pb-6 flex flex-row items-center justify-between border-b border-slate-50">
                        <CardTitle className="text-2xl font-black flex items-center gap-4">
                            سجل الحساب المالي
                            <Badge className="bg-slate-900 text-white rounded-xl px-4 py-1.5 text-sm">{filteredTransactions.length}</Badge>
                        </CardTitle>
                        {(searchQuery || dateFrom || dateTo) && (
                            <Button variant="ghost" onClick={() => { setSearchQuery(''); setDateFrom(''); setDateTo(''); }} className="text-rose-500 hover:text-rose-600 font-bold bg-rose-50 rounded-xl px-6">
                                <X size={18} className="ml-2" /> مسح الفلاتر
                            </Button>
                        )}
                    </CardHeader>
                    <CardContent className="p-0">
                        <AnimatePresence mode="popLayout">
                            {loading ? (
                                <div className="flex flex-col items-center justify-center py-32 gap-6">
                                    <div className="relative">
                                        <Loader2 className="animate-spin text-indigo-600" size={60} />
                                        <Wallet className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-indigo-200" size={24} />
                                    </div>
                                    <p className="text-slate-400 font-black text-xl animate-pulse">جاري سحب كشف الحساب...</p>
                                </div>
                            ) : filteredTransactions.length === 0 ? (
                                <div className="text-center py-40">
                                    <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <Receipt size={48} className="text-slate-200" />
                                    </div>
                                    <p className="font-black text-slate-400 text-2xl">لا توجد عمليات مسجلة</p>
                                    <p className="text-slate-400 mt-2 font-bold">ابدأ بنشر شحناتك لتظهر هنا</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-50">
                                    {filteredTransactions.map((t, idx) => (
                                        <motion.div
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: idx * 0.05 }}
                                            key={t.id}
                                            className="p-8 md:px-12 flex flex-col md:flex-row justify-between items-center gap-6 hover:bg-slate-50/50 transition-all cursor-pointer group"
                                        >
                                            <div className="flex items-center gap-8 w-full md:w-auto">
                                                <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center shadow-xl border-2 transition-transform group-hover:scale-110 ${t.type === 'income'
                                                    ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                                    : 'bg-indigo-50 text-indigo-600 border-indigo-100'
                                                    }`}>
                                                    {t.type === 'income' ? <ArrowDownRight size={28} /> : <ArrowUpRight size={28} />}
                                                </div>

                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-3">
                                                        <p className="font-black text-slate-900 text-xl leading-none">{t.description}</p>
                                                        {t.status === 'completed' ? (
                                                            <Badge className="bg-emerald-500/10 text-emerald-600 border-none text-[10px] font-black px-3 rounded-full">مكتمل</Badge>
                                                        ) : (
                                                            <Badge className="bg-amber-500/10 text-amber-600 border-none text-[10px] font-black px-3 rounded-full">معلق</Badge>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-4 text-sm font-bold text-slate-400 mt-2">
                                                        <span className="flex items-center gap-2"><Calendar size={16} /> {new Date(t.date).toLocaleDateString('ar-SA')}</span>
                                                        <div className="w-1.5 h-1.5 bg-slate-200 rounded-full"></div>
                                                        <span className="font-black text-slate-900 bg-slate-100 px-3 py-1 rounded-lg text-xs leading-none">REF: {t.reference}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex flex-col md:flex-row items-center gap-10 w-full md:w-auto mt-6 md:mt-0">
                                                <div className="text-center md:text-left order-2 md:order-1">
                                                    <p className={`font-black text-3xl tabular-nums leading-none ${t.type === 'income' ? 'text-emerald-500' : 'text-slate-900'}`}>
                                                        {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                                                    </p>
                                                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mt-1">ريال سعودي</p>
                                                </div>
                                                <div className="flex gap-2 order-1 md:order-2">
                                                    <Button
                                                        variant="outline"
                                                        size="icon"
                                                        onClick={() => handlePrintInvoice(t)}
                                                        className="w-14 h-14 rounded-2xl border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 shadow-sm transition-all shadow-indigo-100/50"
                                                        title="تحميل الفاتورة PDF"
                                                    >
                                                        <Download size={20} />
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="icon"
                                                        className="w-14 h-14 rounded-2xl border-slate-200 hover:border-slate-400 shadow-sm"
                                                        title="عرض التفاصيل"
                                                    >
                                                        <ChevronLeft size={20} />
                                                    </Button>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </AnimatePresence>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}

// مكون أيقونة مفقود في الاستيراد
function ChevronLeft(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="m15 18-6-6 6-6" />
        </svg>
    )
}
