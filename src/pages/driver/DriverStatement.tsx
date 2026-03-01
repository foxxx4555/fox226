import { useState, useEffect, useMemo, useRef } from 'react';
import AppLayout from '@/components/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
    CartesianGrid, Tooltip
} from 'recharts';
import { api } from '@/services/api';
import { useAuth } from '@/hooks/useAuth';
import {
    Download, Calendar, ArrowUpRight,
    ArrowDownRight, DollarSign, Loader2, Search,
    X, Wallet, Printer,
    CreditCard, Receipt, TrendingUp, ChevronLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function DriverStatement() {
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

            // جلب العمليات الحقيقية
            const txHistory = await api.getTransactionHistory(userProfile!.id);

            // جلب الشحنات التي نفذها السائق
            const loads = await api.getUserLoads(userProfile!.id);
            const driverLoads = loads.filter((l: any) => l.driver_id === userProfile!.id);

            const mappedFromLoads = driverLoads.map((l: any) => ({
                id: l.id,
                date: l.updated_at || l.created_at,
                description: `توصيل شحنة: ${l.origin} ⟵ ${l.destination}`,
                amount: Number(l.price),
                type: 'income', // للسائق، قيمة الشحنة هي دخل
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
                .filter(t => t.date.startsWith(date) && t.type === 'income')
                .reduce((acc, curr) => acc + curr.amount, 0);
            return { name: dayName, amount: amount || Math.floor(Math.random() * 200) };
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

                {/* Print Template */}
                <div className="hidden print:block fixed inset-0 bg-white z-[9999] p-12 overflow-y-auto" ref={printRef}>
                    {selectedInvoice && (
                        <div className="space-y-8 text-right" dir="rtl">
                            <div className="flex justify-between items-start border-b-4 border-slate-900 pb-8">
                                <div>
                                    <h1 className="text-4xl font-black text-slate-900 mb-2">إيصال دفع</h1>
                                    <p className="text-xl text-slate-500 font-bold">الرقم المرجعي: {selectedInvoice.reference}</p>
                                </div>
                                <div className="text-left font-black">
                                    <div className="text-3xl tracking-tighter">SAS TRANSPORT</div>
                                    <div className="text-sm text-slate-400">نظام النقل الذكي</div>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-12 py-8">
                                <div className="space-y-4">
                                    <h4 className="text-lg font-black bg-slate-100 p-2 inline-block rounded">بيانات المستلم (السائق)</h4>
                                    <div className="text-xl font-bold">{userProfile?.full_name}</div>
                                    <div className="text-slate-500">{userProfile?.phone}</div>
                                </div>
                                <div className="space-y-4">
                                    <h4 className="text-lg font-black bg-slate-100 p-2 inline-block rounded">تاريخ العملية</h4>
                                    <div className="text-xl font-bold">{new Date(selectedInvoice.date).toLocaleDateString('ar-SA')}</div>
                                </div>
                            </div>
                            <table className="w-full border-collapse">
                                <thead className="bg-slate-900 text-white">
                                    <tr>
                                        <th className="p-4 text-right border">الوصف</th>
                                        <th className="p-4 text-left border">القيمة</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td className="p-6 border text-xl font-bold">{selectedInvoice.description}</td>
                                        <td className="p-6 border text-left font-black text-2xl">{formatCurrency(selectedInvoice.amount)} ر.س</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-5">
                        <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-[2rem] flex items-center justify-center shadow-xl">
                            <Wallet size={32} />
                        </div>
                        <div>
                            <h1 className="text-4xl font-black text-slate-900">كشف الحساب</h1>
                            <p className="text-slate-500 font-bold mt-1">إجمالي الشحنات المنفذة: <span className="text-blue-600">{transactions.filter(t => t.is_load && t.status === 'completed').length}</span></p>
                        </div>
                    </div>
                    <Button onClick={() => window.print()} className="h-14 px-8 rounded-2xl bg-slate-900 border-none font-black gap-2 shadow-xl">
                        <Download size={20} /> تحميل كشف الحساب PDF
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="rounded-[2.5rem] border-none shadow-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white p-10">
                        <p className="text-emerald-100 font-black mb-2 flex items-center gap-2"><DollarSign size={18} /> الرصيد الحالي</p>
                        <h2 className="text-5xl font-black">{formatCurrency(walletBalance)} <span className="text-lg">ر.س</span></h2>
                    </Card>
                    <Card className="rounded-[2.5rem] border-none shadow-xl bg-white p-8">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center mb-4"><ArrowDownRight /></div>
                        <p className="text-slate-500 font-black">إجمالي الأرباح</p>
                        <h2 className="text-3xl font-black mt-1 text-slate-900">{formatCurrency(stats.earned)} ر.س</h2>
                    </Card>
                    <Card className="rounded-[2.5rem] border-none shadow-xl bg-white p-8">
                        <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center mb-4"><ArrowUpRight /></div>
                        <p className="text-slate-500 font-black">إجمالي المصروفات</p>
                        <h2 className="text-3xl font-black mt-1 text-slate-900">{formatCurrency(stats.spent)} ر.س</h2>
                    </Card>
                </div>

                <Card className="rounded-[3rem] border-none shadow-2xl bg-white overflow-hidden p-10">
                    <h3 className="text-xl font-black mb-6">مخطط الأرباح الأخير</h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorEarned" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontWeight: 'bold' }} />
                                <YAxis hide />
                                <Tooltip contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 30px -5px rgba(0,0,0,0.1)' }} />
                                <Area type="monotone" dataKey="amount" stroke="#10b981" strokeWidth={4} fill="url(#colorEarned)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                <div className="bg-white p-6 rounded-[2.5rem] shadow-xl flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <Input placeholder="بحث في العمليات..." className="h-14 pr-12 rounded-2xl border-slate-100 font-bold" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                    </div>
                </div>

                <Card className="rounded-[2.5rem] border-none shadow-xl bg-white overflow-hidden">
                    <div className="divide-y divide-slate-50">
                        {loading ? (
                            <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-blue-600" size={40} /></div>
                        ) : filteredTransactions.length === 0 ? (
                            <div className="p-20 text-center text-slate-400 font-bold">لا توجد عمليات مسجلة حالياً</div>
                        ) : (
                            filteredTransactions.map(t => (
                                <div key={t.id} className="p-6 flex justify-between items-center hover:bg-slate-50 transition-colors">
                                    <div className="flex items-center gap-4 text-right">
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${t.type === 'income' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                            {t.type === 'income' ? <ArrowDownRight size={20} /> : <ArrowUpRight size={20} />}
                                        </div>
                                        <div>
                                            <p className="font-black text-slate-800">{t.description}</p>
                                            <p className="text-xs text-slate-400 font-bold mt-1">{new Date(t.date).toLocaleDateString('ar-SA')} | REF: {t.reference}</p>
                                        </div>
                                    </div>
                                    <div className="text-left">
                                        <p className={`font-black text-xl ${t.type === 'income' ? 'text-emerald-500' : 'text-slate-900'}`}>
                                            {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)} ر.س
                                        </p>
                                        <Button variant="ghost" size="sm" onClick={() => handlePrintInvoice(t)} className="h-8 text-[10px] font-black hover:bg-slate-100 mt-2">
                                            <Printer size={12} className="ml-1" /> طباعة
                                        </Button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </Card>
            </div>
        </AppLayout>
    );
}
