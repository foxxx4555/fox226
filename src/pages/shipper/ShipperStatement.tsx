import { useState, useEffect, useMemo, useRef } from 'react';
import AppLayout from '@/components/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
    CartesianGrid, Tooltip
} from 'recharts';
import { api } from '@/services/api';
import { financeApi } from '@/lib/finances';
import { useAuth } from '@/hooks/useAuth';
import {
    FileText, Download, Calendar, ArrowUpRight,
    ArrowDownRight, DollarSign, Loader2, Search,
    Wallet, Printer, CreditCard, Receipt,
    CheckCircle2, Clock, XCircle, FileImage, Info, Upload
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { motion } from 'framer-motion';
import WalletCard from '@/components/finance/WalletCard';
import TransactionList from '@/components/finance/TransactionList';
import InvoiceTemplate from '@/components/finance/InvoiceTemplate';
import { toast } from 'sonner';

export default function ShipperStatement() {
    const { userProfile } = useAuth();
    const printRef = useRef<HTMLDivElement>(null);
    const [loading, setLoading] = useState(true);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [wallet, setWallet] = useState<any>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
    const [selectedTransaction, setSelectedTransaction] = useState<any>(null); // للتفاصيل
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [isGlow, setIsGlow] = useState(false);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery);
        }, 300);
        return () => clearTimeout(handler);
    }, [searchQuery]);

    const [shipperPayments, setShipperPayments] = useState<any[]>([]);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentNotes, setPaymentNotes] = useState('');
    const [paymentImage, setPaymentImage] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedReceipt, setSelectedReceipt] = useState<string | null>(null);
    const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

    const loadFinancialData = async () => {
        if (!userProfile?.id) return;
        setLoading(true);
        try {
            const [walletData, txHistory, payments] = await Promise.all([
                api.getWalletBalance(userProfile.id, 'shipper'),
                api.getTransactionHistory(userProfile.id),
                api.getShipperPayments(userProfile.id)
            ]);

            setWallet(walletData);
            setShipperPayments(payments || []);

            const mappedTransactions = txHistory?.map((t: any) => {
                const amount = Math.abs(Number(t.amount) || 0);
                const type = (t.type === 'debit' || t.transaction_type === 'usage') ? 'expense' : 'income';

                // تعريب الوصف إذا كان إنجليزياً أو يحتوي على ديون
                let rawDesc = t.description || (t.loads ? `شحنة من ${t.loads.origin}` : 'عملية مالية');
                if (rawDesc.includes('DEBT:') || rawDesc.includes('Outstanding shipment payment')) {
                    const loadIdMatch = rawDesc.match(/#[0-9a-f-]+/);
                    const loadIdShort = loadIdMatch ? loadIdMatch[0].substring(0, 9) : '';
                    rawDesc = `مستحقات شحنة رقم ${loadIdShort}`;
                }

                return {
                    ...t,
                    id: t.id || t.transaction_id,
                    date: t.created_at,
                    description: rawDesc,
                    amount,
                    type,
                    status: t.status || 'completed',
                    shipment_id: t.loads?.id || t.shipment_id
                };
            }) || [];

            setTransactions(mappedTransactions);
        } catch (err) {
            console.error("Financial Load Error:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadFinancialData();

        // مستمع حي لتحديث المحفظة عند اعتماد الإدارة للسداد
        if (userProfile?.id) {
            const walletChannel = supabase
                .channel('wallet-updates')
                .on(
                    'postgres_changes',
                    { event: 'UPDATE', schema: 'public', table: 'wallets', filter: `user_id=eq.${userProfile.id}` },
                    (payload) => {
                        setWallet(payload.new);
                        setIsGlow(true);
                        setTimeout(() => setIsGlow(false), 2000);
                        toast.success("تم تحديث رصيد محفظتك! 💰");
                        loadFinancialData();
                    }
                )
                .subscribe();

            return () => { supabase.removeChannel(walletChannel); };
        }
    }, [userProfile?.id]);

    const handleTopUp = async () => {
        const amount = window.prompt("أدخل المبلغ المراد شحنه (ر.س):");
        if (!amount || isNaN(Number(amount))) return;

        try {
            const { url } = await api.createStripeSession((wallet as any).wallet_id, Number(amount));
            if (url) window.location.href = url;
        } catch (err) {
            console.error("Top-up error:", err);
            alert("فشل في بدء عملية الدفع");
        }
    };

    const filteredTransactions = useMemo(() => {
        return transactions.filter(t => {
            const matchesSearch = t.description?.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
                t.id?.includes(debouncedSearchQuery);
            const matchesDateFrom = dateFrom ? new Date(t.date) >= new Date(dateFrom) : true;
            const matchesDateTo = dateTo ? new Date(t.date) <= new Date(dateTo) : true;

            return matchesSearch && matchesDateFrom && matchesDateTo;
        });
    }, [transactions, debouncedSearchQuery, dateFrom, dateTo]);

    // حساب الإحصائيات (المصروفات والمدفوعات)
    const stats = useMemo(() => {
        // Total amount paid (Credits/Income)
        const earned = filteredTransactions
            .filter(t => t.type === 'income')
            .reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

        // For the "Debt" card, we want the current absolute balance
        // For the "Earned" card, we show the total confirmed payments
        const currentBalance = Number(wallet?.balance) || 0;
        return {
            debt: Math.abs(currentBalance),
            paid: earned
        };
    }, [filteredTransactions, wallet?.balance]);

    const chartData = useMemo(() => {
        const last7Days = Array.from({ length: 7 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (6 - i));
            return d.toISOString().split('T')[0];
        });

        return last7Days.map(date => {
            const dayName = new Date(date).toLocaleDateString('ar-SA', { weekday: 'short' });
            const dayAmount = transactions
                .filter(t => (t.created_at || t.date).startsWith(date) && t.type === 'expense')
                .reduce((acc, curr) => acc + Number(curr.amount), 0);
            return { name: dayName, amount: dayAmount };
        });
    }, [transactions]);

    const handlePayDebt = async () => {
        if (!paymentAmount || Number(paymentAmount) <= 0 || !paymentImage) {
            toast.error("يرجى إكمال البيانات المطلوبة");
            return;
        }

        if (paymentImage.size > 2 * 1024 * 1024) {
            toast.error("حجم الصورة كبير جداً، يرجى اختيار صورة أقل من 2 ميجابايت");
            return;
        }

        setIsSubmitting(true);
        try {
            const proofUrl = await api.uploadImage(paymentImage, 'receipts');
            await api.submitShipperPayment(userProfile!.id, Number(paymentAmount), proofUrl, paymentNotes);

            toast.success("تم إرسال إثبات السداد بنجاح، بانتظار مراجعة الإدارة");
            setIsPaymentModalOpen(false);
            setPaymentAmount('');
            setPaymentImage(null);
            loadFinancialData();
        } catch (err) {
            toast.error("فشل إرسال البيانات");
        } finally {
            setIsSubmitting(false);
        }
    };

    const formatCurrency = (val: number) => new Intl.NumberFormat('ar-SA').format(val);

    const handlePrintInvoice = (tx: any) => {
        setSelectedInvoice(tx);
        setTimeout(() => {
            window.print();
        }, 500);
    };

    if (loading || !userProfile) {
        return (
            <AppLayout>
                <div className="max-w-6xl mx-auto space-y-8 pb-20 px-4 mt-6 animate-pulse">
                    <div className="flex flex-col md:flex-row justify-between gap-6 mb-8">
                        <div>
                            <div className="h-10 w-48 bg-slate-200 rounded-lg mb-2"></div>
                            <div className="h-4 w-64 bg-slate-200 rounded-lg"></div>
                        </div>
                        <div className="flex gap-3">
                            <div className="h-12 w-32 bg-slate-200 rounded-xl"></div>
                            <div className="h-12 w-32 bg-slate-200 rounded-xl"></div>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-1 space-y-6">
                            <div className="h-48 bg-slate-200 rounded-[2.5rem]"></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="h-32 bg-slate-200 rounded-[2rem]"></div>
                                <div className="h-32 bg-slate-200 rounded-[2rem]"></div>
                            </div>
                        </div>
                        <div className="h-[380px] lg:col-span-2 bg-slate-200 rounded-[2.5rem]"></div>
                    </div>
                    <div className="h-64 bg-slate-200 rounded-[3rem] mt-8"></div>
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout>
            <div className="max-w-6xl mx-auto space-y-8 pb-20 px-4 mt-6">

                {/* Print Template (Hidden) */}
                <InvoiceTemplate invoice={selectedInvoice} userProfile={userProfile} printRef={printRef} />

                {/* Main Header */}
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-5">
                        <div className="w-16 h-16 bg-gradient-to-br from-blue-700 to-blue-900 text-white rounded-[2rem] flex items-center justify-center shadow-2xl shadow-blue-200">
                            <Wallet size={32} />
                        </div>
                        <div>
                            <h1 className="text-4xl font-black text-slate-900 tracking-tight">إدارة المحفظة</h1>
                            <p className="text-slate-500 font-bold mt-1">تتبع رصيدك، تعاملاتك، وفواتيرك الضريبية</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 md:gap-3">
                        <Button variant="outline" className="h-12 md:h-14 rounded-2xl font-black px-4 md:px-6 border-slate-200 hover:bg-slate-50 text-xs md:text-sm">
                            <Printer size={18} className="md:ml-2 text-slate-400" /> <span className="hidden md:inline">طباعة سجل النشاط</span>
                        </Button>
                        <Button
                            onClick={() => setIsPaymentModalOpen(true)}
                            className="h-12 md:h-14 rounded-2xl bg-slate-900 hover:bg-slate-800 font-black px-4 md:px-8 shadow-xl transition-all active:scale-95 text-white text-xs md:text-sm"
                        >
                            <Upload size={18} className="md:ml-2" /> <span className="hidden md:inline">إرفاق إيصال سداد</span>
                        </Button>
                        <Button
                            onClick={handleTopUp}
                            className="h-12 md:h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 font-black px-4 md:px-8 shadow-xl shadow-blue-200 transition-all active:scale-95 text-white text-xs md:text-sm"
                        >
                            <CreditCard size={18} className="md:ml-2" /> <span className="hidden md:inline">الدفع بالبطاقة</span>
                        </Button>
                    </div>
                </motion.div>

                {/* Metrics Section */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-1">
                        <div className={`transition-all duration-500 rounded-[2.5rem] ${isGlow ? 'ring-4 ring-emerald-400 ring-offset-4 shadow-[0_0_30px_rgba(52,211,153,0.5)]' : ''}`}>
                            <WalletCard
                                balance={wallet?.balance || 0}
                                currency={wallet?.currency || 'SAR'}
                                type="shipper"
                                onRefresh={loadFinancialData}
                                onTopUp={handleTopUp}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4 mt-6">
                            <Card className="rounded-[2rem] border-none shadow-xl bg-white p-6">
                                <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center mb-4">
                                    <ArrowUpRight size={20} />
                                </div>
                                <p className="text-slate-400 font-bold text-xs uppercase tracking-wider">المديونية الحالية</p>
                                <h4 className="text-2xl font-black text-slate-800 mt-1">{formatCurrency(stats.debt)} <span className="text-xs text-slate-400">ر.س</span></h4>
                            </Card>
                            <Card className="rounded-[2rem] border-none shadow-xl bg-white p-6">
                                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center mb-4">
                                    <ArrowDownRight size={20} />
                                </div>
                                <p className="text-slate-400 font-bold text-xs uppercase tracking-wider">تم سداده</p>
                                <h4 className="text-2xl font-black text-slate-800 mt-1">{formatCurrency(stats.paid)} <span className="text-xs text-slate-400">ر.س</span></h4>
                            </Card>
                        </div>
                    </div>

                    <Card className="lg:col-span-2 rounded-[2.5rem] border-none shadow-2xl bg-white overflow-hidden p-8">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-black text-slate-800">تحليل المصروفات الأسبوعي</h3>
                            <Badge className="bg-blue-50 text-blue-600 border-none font-black px-3 py-1">تحديث حي</Badge>
                        </div>
                        <div className="h-[280px] w-full">
                            {chartData.every(d => d.amount === 0) ? (
                                <div className="flex flex-col items-center justify-center h-full text-slate-400 bg-slate-50/50 rounded-2xl">
                                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-3 shadow-sm border border-slate-100">
                                        <Info size={24} className="text-slate-300" />
                                    </div>
                                    <p className="font-bold text-slate-500">لا توجد بيانات كافية للتحليل حالياً</p>
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartData}>
                                        <defs>
                                            <linearGradient id="colorMain" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15} />
                                                <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="5 5" vertical={false} stroke="#f1f5f9" />
                                        <XAxis
                                            dataKey="name"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#64748b', fontWeight: 'bold', fontSize: 12 }}
                                            dy={10}
                                        />
                                        <YAxis hide />
                                        <Tooltip
                                            contentStyle={{ borderRadius: '1.5rem', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="amount"
                                            stroke="#2563eb"
                                            strokeWidth={4}
                                            fillOpacity={1}
                                            fill="url(#colorMain)"
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </Card>
                </div>

                {/* Shipper Payments Section */}
                <Card className="rounded-[3rem] border-none shadow-2xl bg-white overflow-hidden p-6 md:p-10">
                    <div className="flex items-center justify-between mb-8 border-b pb-4">
                        <h3 className="text-xl font-black flex items-center gap-2">
                            <Receipt className="text-blue-500" /> إيصالات السداد المرفوعة
                        </h3>
                    </div>
                    <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                        {shipperPayments.length === 0 ? (
                            <div className="text-center py-8 opacity-50 font-bold bg-slate-50 rounded-2xl">لا يوجد إيصالات سداد سابقة</div>
                        ) : shipperPayments.map((payment) => (
                            <div key={payment.id} className="p-5 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-blue-200 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className={`p-3 rounded-2xl text-white flex-shrink-0 ${payment.status === 'approved' ? 'bg-emerald-500 shadow-emerald-500/20' : payment.status === 'rejected' ? 'bg-rose-500 shadow-rose-500/20' : 'bg-amber-500 shadow-amber-500/20'} shadow-lg`}>
                                        {payment.status === 'approved' ? <CheckCircle2 size={24} /> : payment.status === 'rejected' ? <XCircle size={24} /> : <Clock size={24} />}
                                    </div>
                                    <div>
                                        <p className="font-black text-lg text-slate-800">{payment.status === 'approved' ? 'مقبول (تم تأكيد السداد)' : payment.status === 'rejected' ? 'مرفوض' : 'قيد المراجعة'}</p>
                                        <p className="text-sm text-slate-400 font-bold mt-1" dir="ltr">{(new Date(payment.created_at)).toLocaleDateString('ar-SA')} - {new Date(payment.created_at).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}</p>
                                    </div>
                                </div>

                                <div className="text-left w-full md:w-auto">
                                    <p className="font-black text-2xl tracking-tight text-slate-800 mb-2 border-b border-slate-200 pb-2">{Number(payment.amount).toLocaleString()} <span className="text-sm font-bold text-slate-500">ر.س</span></p>

                                    <div className="flex flex-col gap-2">
                                        {payment.proof_image_url && (
                                            <Button
                                                variant="outline"
                                                onClick={() => {
                                                    setSelectedReceipt(payment.proof_image_url);
                                                    setIsReceiptModalOpen(true);
                                                }}
                                                className="w-full h-10 rounded-xl font-bold border-blue-200 text-blue-600 bg-blue-50 hover:bg-blue-100 shadow-sm"
                                            >
                                                <FileImage size={16} className="me-2" />
                                                شاهد الإيصال
                                            </Button>
                                        )}
                                        {/* محاولة استخراج رقم الشحنة من الملاحظات إذا لم يكن هناك حقل صريح */}
                                        {(payment.shipper_notes?.match(/#[0-9a-f-]+/) || payment.admin_notes?.match(/#[0-9a-f-]+/)) && (
                                            <Badge
                                                variant="outline"
                                                className="bg-blue-50 border-blue-100 text-blue-600 font-bold py-1 px-3 rounded-lg flex items-center justify-center cursor-pointer hover:bg-blue-100 transition-colors"
                                                onClick={() => {
                                                    const match = (payment.shipper_notes + (payment.admin_notes || '')).match(/#[0-9a-f-]+/);
                                                    if (match) window.open(`/loads/${match[0].replace('#', '')}`, '_blank');
                                                }}
                                            >
                                                شحنة مرتبطة: {(payment.shipper_notes + (payment.admin_notes || '')).match(/#[0-9a-f-]+/)?.[0].substring(0, 9)}
                                            </Badge>
                                        )}
                                    </div>

                                    {(payment.shipper_notes || payment.admin_notes) && (
                                        <div className="mt-3 space-y-2">
                                            {payment.shipper_notes && (
                                                <p className="text-xs bg-white border border-slate-200 rounded-lg p-2 font-bold text-slate-600">
                                                    ملاحظتك: {payment.shipper_notes}
                                                </p>
                                            )}
                                            {payment.admin_notes && (
                                                <p className={`text-xs bg-white border rounded-lg p-2 font-bold relative overflow-hidden ${payment.status === 'approved' ? 'border-emerald-200 text-emerald-600 bg-emerald-50' : 'border-rose-200 text-rose-600 bg-rose-50'}`}>
                                                    <span className={`absolute right-0 top-0 bottom-0 w-1 ${payment.status === 'approved' ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                                                    رد الإدارة: {payment.admin_notes}
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>

                {/* Filters */}
                <div className="bg-white/50 p-3 rounded-[2rem] border border-white grid grid-cols-1 md:grid-cols-4 gap-3 items-center">
                    <div className="relative md:col-span-2">
                        <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <Input
                            placeholder="البحث في العمليات..."
                            className="h-12 pr-12 pl-6 bg-white border-none rounded-2xl shadow-sm font-bold"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center bg-white rounded-2xl px-4 shadow-sm h-12 border-none">
                        <Calendar size={18} className="text-slate-400 ml-2" />
                        <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="bg-transparent border-none h-full p-0 font-bold focus-visible:ring-0 text-xs" />
                    </div>
                    <div className="flex items-center bg-white rounded-2xl px-4 shadow-sm h-12 border-none">
                        <Calendar size={18} className="text-slate-400 ml-2" />
                        <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="bg-transparent border-none h-full p-0 font-bold focus-visible:ring-0 text-xs" />
                    </div>
                </div>

                <TransactionList
                    transactions={filteredTransactions}
                    loading={loading}
                    onViewDetails={(trx) => {
                        setSelectedTransaction(trx);
                        setIsDetailsModalOpen(true);
                    }}
                />

            </div>

            {/* Upload Payment Modal */}
            <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
                <DialogContent className="sm:max-w-md bg-white rounded-[2rem] p-0 overflow-hidden border-none text-right shadow-2xl" dir="rtl">
                    <div className="bg-slate-50 p-6 border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center">
                                <Upload size={24} />
                            </div>
                            <div>
                                <DialogTitle className="text-xl font-black">إرفاق إيصال سداد</DialogTitle>
                                <DialogDescription className="font-bold text-slate-500 mt-1">سيتم مراجعة الإيصال وتأكيد السداد</DialogDescription>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 space-y-6 bg-slate-100/30">
                        <div className="space-y-3">
                            <Label className="text-sm font-black text-slate-700">المبلغ المحول (ر.س) *</Label>
                            <Input
                                type="number"
                                placeholder="أدخل مبلغ الحوالة"
                                value={paymentAmount}
                                onChange={(e) => setPaymentAmount(e.target.value)}
                                className="h-14 rounded-2xl border-slate-200 font-black text-lg focus:ring-blue-500 focus:border-blue-500 bg-white"
                            />
                        </div>

                        <div className="space-y-3">
                            <Label className="text-sm font-black text-slate-700">صورة إيصال التحويل *</Label>
                            <div className="border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center hover:bg-slate-50 transition-colors bg-white">
                                <Input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => setPaymentImage(e.target.files?.[0] || null)}
                                    className="hidden"
                                    id="receipt-upload"
                                />
                                <Label htmlFor="receipt-upload" className="cursor-pointer flex flex-col items-center gap-3">
                                    <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center">
                                        <FileImage size={32} />
                                    </div>
                                    <div className="font-bold text-slate-600">
                                        {paymentImage ? paymentImage.name : 'انقر لاختيار صورة الإيصال'}
                                    </div>
                                </Label>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <Label className="text-sm font-black text-slate-700">ملاحظات إضافية (اختياري)</Label>
                            <Textarea
                                placeholder="أي تفاصيل أخرى حول التحويل..."
                                value={paymentNotes}
                                onChange={(e) => setPaymentNotes(e.target.value)}
                                className="rounded-2xl border-slate-200 resize-none font-bold bg-white"
                                rows={3}
                            />
                        </div>
                    </div>

                    <div className="p-6 border-t border-slate-100 flex gap-3 bg-white">
                        <Button
                            onClick={handlePayDebt}
                            disabled={isSubmitting || !paymentAmount || !paymentImage}
                            className="flex-1 h-14 rounded-xl font-black bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20"
                        >
                            {isSubmitting ? <Loader2 size={18} className="animate-spin me-2" /> : <CheckCircle2 size={18} className="me-2" />}
                            إرسال إثبات السداد
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => setIsPaymentModalOpen(false)}
                            disabled={isSubmitting}
                            className="h-14 px-6 rounded-xl font-bold bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                        >
                            إلغاء
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Receipt Viewing Modal */}
            <Dialog open={isReceiptModalOpen} onOpenChange={setIsReceiptModalOpen}>
                <DialogContent className="sm:max-w-xl bg-white rounded-[2rem] p-0 overflow-hidden border-none text-right shadow-2xl" dir="rtl">
                    <div className="bg-slate-50 p-6 border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center">
                                <FileImage size={24} />
                            </div>
                            <div>
                                <DialogTitle className="text-xl font-black">إيصال التحويل البنكي</DialogTitle>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 flex justify-center bg-slate-100/50 min-h-[300px]">
                        {selectedReceipt ? (
                            <img
                                src={selectedReceipt}
                                alt="إيصال التحويل"
                                className="max-w-full rounded-2xl shadow-sm border border-slate-200 object-contain"
                                style={{ maxHeight: '60vh' }}
                            />
                        ) : (
                            <div className="flex items-center justify-center h-full w-full text-slate-400 font-bold">جاري تحميل الإيصال...</div>
                        )}
                    </div>

                    <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-white">
                        <Button
                            onClick={() => {
                                if (selectedReceipt) {
                                    window.open(selectedReceipt, '_blank');
                                }
                            }}
                            className="h-12 rounded-xl font-black bg-slate-900 hover:bg-slate-800 text-white px-8"
                        >
                            <Download size={18} className="me-2" /> تحميل
                        </Button>
                        <Button variant="outline" onClick={() => setIsReceiptModalOpen(false)} className="h-12 rounded-xl font-bold bg-white text-slate-600 mx-0 border-slate-200">
                            إغلاق
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Modal: View Transaction Details */}
            <Dialog open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen}>
                <DialogContent className="sm:max-w-md bg-white rounded-[2rem] p-0 overflow-hidden border-none text-right" dir="rtl">
                    <div className="bg-slate-50 p-6 border-b border-slate-100 flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center">
                            <Info size={24} />
                        </div>
                        <div>
                            <DialogTitle className="text-xl font-black">تفاصيل المعاملة</DialogTitle>
                            <DialogDescription className="font-bold">رقم العملية: {selectedTransaction?.id?.substring(0, 8).toUpperCase()}</DialogDescription>
                        </div>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl">
                            <span className="font-bold text-slate-500">المبلغ:</span>
                            <span className={`text-xl font-black ${selectedTransaction?.amount > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {selectedTransaction?.amount?.toLocaleString()} ر.س
                            </span>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <Label className="text-slate-400 text-xs">التاريخ</Label>
                                <p className="font-bold">{(new Date(selectedTransaction?.created_at)).toLocaleDateString('ar-SA')}</p>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-slate-400 text-xs">الحالة</Label>
                                <Badge className="bg-emerald-50 text-emerald-600 border-none">مكتمل</Badge>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-slate-400 text-xs">الوصف</Label>
                            <p className="font-bold text-slate-700 bg-white border p-3 rounded-xl">{selectedTransaction?.description}</p>
                        </div>
                    </div>
                    <DialogFooter className="p-6 bg-slate-50 border-t">
                        <Button onClick={() => setIsDetailsModalOpen(false)} className="w-full h-12 rounded-xl bg-slate-900 text-white font-bold">إغلاق</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </AppLayout>
    );
}
