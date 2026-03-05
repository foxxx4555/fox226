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
import { toast } from 'sonner';

export default function ShipperStatement() {
    const { userProfile } = useAuth();
    const printRef = useRef<HTMLDivElement>(null);
    const [loading, setLoading] = useState(true);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [wallet, setWallet] = useState<any>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
    const [selectedTransaction, setSelectedTransaction] = useState<any>(null); // للتفاصيل
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

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

            const mappedTransactions = txHistory?.map((t: any) => ({
                ...t,
                id: t.transaction_id,
                date: t.created_at,
                description: t.description || (t.shipment ? `شحنة من ${t.shipment.origin}` : 'عملية مالية'),
                amount: Math.abs(Number(t.amount)),
                type: t.type === 'debit' ? 'expense' : 'income',
                status: t.status || 'completed'
            })) || [];

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

    // حساب الإحصائيات (المصروفات والمدفوعات)
    const stats = useMemo(() => {
        const spent = transactions
            .filter(t => t.type === 'expense')
            .reduce((acc, curr) => acc + Number(curr.amount), 0);
        const earned = transactions
            .filter(t => t.type === 'income')
            .reduce((acc, curr) => acc + Number(curr.amount), 0);
        return { spent: wallet?.balance || 0, earned };
    }, [transactions, wallet?.balance]);

    const chartData = useMemo(() => {
        const last7Days = Array.from({ length: 7 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (6 - i));
            return d.toISOString().split('T')[0];
        });

        return last7Days.map(date => {
            const dayName = new Date(date).toLocaleDateString('ar-SA', { weekday: 'short' });
            const dayAmount = transactions
                .filter(t => t.created_at.startsWith(date) && t.type === 'expense')
                .reduce((acc, curr) => acc + Number(curr.amount), 0);
            return { name: dayName, amount: dayAmount };
        });
    }, [transactions]);

    const handlePayDebt = async () => {
        if (!paymentAmount || Number(paymentAmount) <= 0 || !paymentImage) {
            toast.error("يرجى إكمال البيانات المطلوبة");
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

    return (
        <AppLayout>
            <div className="max-w-6xl mx-auto space-y-8 pb-20 px-4 mt-6">

                {/* Print Template (Hidden) */}
                <div className="hidden print:block fixed inset-0 bg-white z-[9999] p-12 overflow-y-auto" ref={printRef}>
                    {selectedInvoice && (
                        <div className="space-y-8 text-right" dir="rtl">
                            <div className="flex justify-between items-start border-b-4 border-slate-900 pb-8">
                                <div>
                                    <h1 className="text-4xl font-black text-slate-900 mb-2">فاتورة ضريبية</h1>
                                    <p className="text-xl text-slate-500 font-bold">الرقم المرجعي: {selectedInvoice.transaction_id.substring(0, 8).toUpperCase()}</p>
                                </div>
                                <div className="text-left font-black">
                                    <div className="text-3xl tracking-tighter">FOX LOGISTICS</div>
                                    <div className="text-sm text-slate-400">المنصة المالية اللوجستية</div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-12 py-8">
                                <div className="space-y-4">
                                    <h4 className="text-lg font-black bg-slate-100 p-2 inline-block rounded">بيانات العميل</h4>
                                    <div className="text-xl font-bold">{userProfile?.full_name}</div>
                                    <div className="text-slate-500">{userProfile?.phone}</div>
                                </div>
                                <div className="space-y-4">
                                    <h4 className="text-lg font-black bg-slate-100 p-2 inline-block rounded">تاريخ المعاملة</h4>
                                    <div className="text-xl font-bold">{new Date(selectedInvoice.created_at).toLocaleDateString('ar-SA')}</div>
                                    <div className="text-slate-500">{new Date(selectedInvoice.created_at).toLocaleTimeString('ar-SA')}</div>
                                </div>
                            </div>

                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="bg-slate-900 text-white">
                                        <th className="p-4 text-right border">الوصف</th>
                                        <th className="p-4 text-center border">الحالة</th>
                                        <th className="p-4 text-left border">الإجمالي</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td className="p-6 border text-xl font-bold">{selectedInvoice.description}</td>
                                        <td className="p-6 border text-center font-bold">مكتمل</td>
                                        <td className="p-6 border text-left font-black text-2xl">{formatCurrency(selectedInvoice.amount)} ر.س</td>
                                    </tr>
                                    <tr className="bg-slate-50">
                                        <td colSpan={2} className="p-4 text-left font-black text-xl border">الإجمالي المستحق</td>
                                        <td className="p-4 text-left font-black text-3xl border text-primary">{formatCurrency(selectedInvoice.amount)} ر.س</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

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

                    <div className="flex items-center gap-3">
                        <Button variant="outline" className="h-14 rounded-2xl font-black px-6 border-slate-200 hover:bg-slate-50">
                            <Printer size={18} className="ml-2 text-slate-400" /> طباعة سجل النشاط
                        </Button>
                        <Button
                            onClick={() => setIsPaymentModalOpen(true)}
                            className="h-14 rounded-2xl bg-slate-900 hover:bg-slate-800 font-black px-8 shadow-xl transition-all active:scale-95 text-white"
                        >
                            <Upload size={18} className="ml-2" /> إرفاق إيصال سداد
                        </Button>
                        <Button
                            onClick={handleTopUp}
                            className="h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 font-black px-8 shadow-xl shadow-blue-200 transition-all active:scale-95 text-white"
                        >
                            <CreditCard size={18} className="ml-2" /> الدفع بالبطاقة
                        </Button>
                    </div>
                </motion.div>

                {/* Metrics Section */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-1">
                        <WalletCard
                            balance={wallet?.balance || 0}
                            currency={wallet?.currency || 'SAR'}
                            type="shipper"
                            onRefresh={loadFinancialData}
                            onTopUp={handleTopUp}
                        />

                        <div className="grid grid-cols-2 gap-4 mt-6">
                            <Card className="rounded-[2rem] border-none shadow-xl bg-white p-6">
                                <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center mb-4">
                                    <ArrowUpRight size={20} />
                                </div>
                                <p className="text-slate-400 font-bold text-xs">إجمالي المديونية</p>
                                <h4 className="text-xl font-black text-slate-800 mt-1">{formatCurrency(stats.spent)}</h4>
                            </Card>
                            <Card className="rounded-[2rem] border-none shadow-xl bg-white p-6">
                                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center mb-4">
                                    <ArrowDownRight size={20} />
                                </div>
                                <p className="text-slate-400 font-bold text-xs">تم سداده</p>
                                <h4 className="text-xl font-black text-slate-800 mt-1">{formatCurrency(stats.earned)}</h4>
                            </Card>
                        </div>
                    </div>

                    <Card className="lg:col-span-2 rounded-[2.5rem] border-none shadow-2xl bg-white overflow-hidden p-8">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-black text-slate-800">تحليل المصروفات الأسبوعي</h3>
                            <Badge className="bg-blue-50 text-blue-600 border-none font-black px-3 py-1">تحديث حي</Badge>
                        </div>
                        <div className="h-[280px] w-full">
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

                                    <div className="flex gap-2">
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
                                                الإيصال
                                            </Button>
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
                                                <p className="text-xs bg-rose-50 border border-rose-200 rounded-lg p-2 font-bold text-rose-600 relative overflow-hidden">
                                                    <span className="absolute right-0 top-0 bottom-0 w-1 bg-rose-500"></span>
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
                    transactions={transactions}
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
