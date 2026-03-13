import { useState, useEffect, useMemo, useRef } from 'react';
import AppLayout from '@/components/AppLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import {
    Wallet, Printer, Download, ArrowDownRight,
    ArrowUpRight, CreditCard, Clock, CheckCircle2, XCircle,
    Info, Loader2, FileText, Search, Calendar
} from 'lucide-react';
import { api } from '@/services/api';
import { financeApi } from '@/lib/finances';
import { supabase } from '@/integrations/supabase/client';
import WalletCard from '@/components/finance/WalletCard';
import TransactionList from '@/components/finance/TransactionList';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function DriverStatement() {
    const { userProfile } = useAuth();
    const [loading, setLoading] = useState(true);
    const [wallet, setWallet] = useState<any>(null);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [withdrawals, setWithdrawals] = useState<any[]>([]);
    const [receipts, setReceipts] = useState<any[]>([]);
    const [pendingEarnings, setPendingEarnings] = useState<any[]>([]);

    // Filters State
    const [searchQuery, setSearchQuery] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    // UI States
    const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
    const [selectedReceipt, setSelectedReceipt] = useState<string | null>(null);
    const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
    const [withdrawInputAmount, setWithdrawInputAmount] = useState('');
    const [isSubmittingWithdraw, setIsSubmittingWithdraw] = useState(false);

    const loadFinancialData = async () => {
        if (!userProfile?.id) return;
        setLoading(true);
        try {
            const [walletData, txHistory, userWithdrawals, userReceipts, pendingEarningsData] = await Promise.all([
                api.getWalletBalance(userProfile.id, 'driver'),
                api.getTransactionHistory(userProfile.id),
                api.getUserWithdrawals(userProfile.id),
                api.getPayoutReceipts(userProfile.id),
                api.getPendingEarnings(userProfile.id)
            ]);

            setWallet(walletData);
            setWithdrawals(userWithdrawals || []);
            setReceipts(userReceipts || []);
            setPendingEarnings(pendingEarningsData || []);

            // ترتيب العمليات من الأقدم للأحدث لحساب الرصيد المتراكم
            const sortedTx = (txHistory || []).sort((a: any, b: any) =>
                new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            );

            let currentBalance = 0;
            const mappedTransactions = sortedTx.map((t: any) => {
                const amount = Number(t.amount);
                const isIncome = amount > 0;

                // تحديث الرصيد المتراكم
                currentBalance += amount;

                return {
                    ...t,
                    id: t.transaction_id || t.id,
                    date: t.created_at,
                    description: t.description || (t.shipment ? `أرباح شحنة رقم ${t.shipment.shipment_number || t.shipment_id.substring(0, 8)}` : 'عملية مالية'),
                    amount: Math.abs(amount),
                    type: isIncome ? 'income' : 'expense',
                    running_balance: currentBalance,
                    status: 'completed'
                };
            }).reverse(); // العودة للترتيب الأحدث أولاً للعرض

            setTransactions(mappedTransactions);
        } catch (err) {
            console.error("Financial Load Error:", err);
            toast.error("فشل في تحميل البيانات المالية");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadFinancialData();
        const channel = supabase
            .channel('db-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'wallets', filter: `profile_id=eq.${userProfile?.id}` }, () => loadFinancialData())
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [userProfile?.id]);

    // تصفية العمليات بناءً على البحث والتاريخ
    const filteredTransactions = useMemo(() => {
        return transactions.filter(t => {
            const matchesSearch = t.description?.toLowerCase().includes(searchQuery.toLowerCase()) || t.id?.includes(searchQuery);
            const matchesDateFrom = dateFrom ? new Date(t.date) >= new Date(dateFrom) : true;
            const matchesDateTo = dateTo ? new Date(t.date) <= new Date(dateTo) : true;
            return matchesSearch && matchesDateFrom && matchesDateTo;
        });
    }, [transactions, searchQuery, dateFrom, dateTo]);

    const stats = useMemo(() => {
        const earned = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
        const withdrawn = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
        return { earned, withdrawn, completedLoads: transactions.filter(t => t.description.includes('شحنة')).length };
    }, [transactions]);

    const handleWithdrawRequest = async () => {
        const amount = Number(withdrawInputAmount);
        if (!amount || amount <= 0 || amount > (wallet?.balance || 0)) {
            toast.error("يرجى التأكد من المبلغ والرصيد المتاح");
            return;
        }
        setIsSubmittingWithdraw(true);
        try {
            await financeApi.requestWithdrawal(userProfile!.id, amount, { method: 'bank_transfer' });
            toast.success("تم إرسال طلب السحب بنجاح");
            setIsWithdrawOpen(false);
            setWithdrawInputAmount('');
            loadFinancialData();
        } catch (err) {
            toast.error("حدث خطأ أثناء إرسال الطلب");
        } finally {
            setIsSubmittingWithdraw(false);
        }
    };

    return (
        <AppLayout>
            <div className="max-w-6xl mx-auto space-y-8 pb-32 px-4 mt-6">

                {/* Header */}
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-5">
                        <div className="w-12 h-12 md:w-16 md:h-16 bg-blue-700 text-white rounded-2xl md:rounded-[2rem] flex items-center justify-center shadow-xl shadow-blue-100 shrink-0">
                            <Wallet size={24} className="md:w-8 md:h-8" />
                        </div>
                        <div>
                            <h1 className="text-xl md:text-3xl font-black text-slate-900">كشف الحساب المالي</h1>
                            <p className="text-slate-500 font-bold mt-1 text-xs md:text-base">إدارة أرباحك ومسحوباتك بدقة</p>
                        </div>
                    </div>
                    <div className="flex gap-2 md:gap-3">
                        <Button variant="outline" className="h-10 md:h-12 rounded-xl md:rounded-2xl font-bold border-slate-200 flex-1 md:flex-none text-xs md:text-sm" onClick={() => window.print()}>
                            <Printer size={16} className="md:ml-2" /> طباعة
                        </Button>
                        <Button onClick={() => setIsWithdrawOpen(true)} className="h-10 md:h-12 rounded-xl md:rounded-2xl bg-blue-600 hover:bg-blue-700 font-bold px-4 md:px-6 shadow-lg text-white flex-1 md:flex-none text-xs md:text-sm">
                            <CreditCard size={16} className="md:ml-2" /> طلب سحب
                        </Button>
                    </div>
                </motion.div>

                {/* Cards Summary */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    <div className="lg:col-span-1">
                        <WalletCard
                            balance={wallet?.balance || 0}
                            frozenBalance={wallet?.frozen_balance || 0}
                            currency="SAR"
                            type="carrier"
                            onRefresh={loadFinancialData}
                            onWithdraw={() => setIsWithdrawOpen(true)}
                        />
                    </div>
                    <Card className="rounded-[2rem] p-6 border-none shadow-sm bg-white flex flex-col justify-center">
                        <p className="text-slate-400 font-bold text-xs uppercase mb-1">إجمالي الأرباح</p>
                        <h3 className="text-2xl font-black text-emerald-600">{stats.earned.toLocaleString()} <span className="text-sm">ر.س</span></h3>
                        <div className="mt-2 flex items-center text-[10px] text-emerald-500 font-bold bg-emerald-50 w-fit px-2 py-0.5 rounded-full">
                            <ArrowDownRight size={12} className="ml-1" /> مبالغ داخلة
                        </div>
                    </Card>
                    <Card className="rounded-[2rem] p-6 border-none shadow-sm bg-white flex flex-col justify-center">
                        <p className="text-slate-400 font-bold text-xs uppercase mb-1">إجمالي المسحوبات</p>
                        <h3 className="text-2xl font-black text-rose-600">{stats.withdrawn.toLocaleString()} <span className="text-sm">ر.س</span></h3>
                        <div className="mt-2 flex items-center text-[10px] text-rose-500 font-bold bg-rose-50 w-fit px-2 py-0.5 rounded-full">
                            <ArrowUpRight size={12} className="ml-1" /> مبالغ خارجة
                        </div>
                    </Card>
                    <Card className="rounded-[2rem] p-6 border-none shadow-sm bg-white flex flex-col justify-center border-r-4 border-blue-500">
                        <p className="text-slate-400 font-bold text-xs uppercase mb-1">أرباح قيد المراجعة</p>
                        <h3 className="text-2xl font-black text-blue-600">{(wallet?.frozen_balance || 0).toLocaleString()} <span className="text-sm">ر.س</span></h3>
                        <div className="mt-2 flex items-center text-[10px] text-blue-500 font-bold bg-blue-50 w-fit px-2 py-0.5 rounded-full">
                            <Clock size={12} className="ml-1" /> شحنات لم تعتمد بعد
                        </div>
                    </Card>
                </div>

                {/* Filters */}
                <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 grid grid-cols-1 md:grid-cols-4 gap-3 items-center">
                    <div className="relative md:col-span-2">
                        <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <Input
                            placeholder="البحث في العمليات..."
                            className="h-11 pr-11 border-none bg-slate-50 rounded-xl font-bold"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-11 bg-slate-50 border-none rounded-xl font-bold text-xs" />
                    <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-11 bg-slate-50 border-none rounded-xl font-bold text-xs" />
                </div>

                <Tabs defaultValue="ledger" className="w-full">
                    <TabsList className="flex md:grid w-full grid-cols-4 h-14 md:h-16 bg-white p-1.5 md:p-2 rounded-2xl md:rounded-[1.5rem] mb-8 shadow-sm border overflow-x-auto no-scrollbar justify-start md:justify-center">
                        <TabsTrigger value="ledger" className="rounded-xl font-black data-[state=active]:bg-blue-600 data-[state=active]:text-white transition-all whitespace-nowrap px-4 text-xs md:text-sm">كشف الحساب</TabsTrigger>
                        <TabsTrigger value="activity" className="rounded-xl font-black whitespace-nowrap px-4 text-xs md:text-sm">طلبات السحب</TabsTrigger>
                        <TabsTrigger value="pending" className="rounded-xl font-black whitespace-nowrap px-4 text-xs md:text-sm">أرباح معلقة</TabsTrigger>
                        <TabsTrigger value="receipts" className="rounded-xl font-black whitespace-nowrap px-4 text-xs md:text-sm">إيصالات الصرف</TabsTrigger>
                    </TabsList>

                    {/* كشف الحساب التفصيلي */}
                    <TabsContent value="ledger">
                        <Card className="rounded-[2.5rem] border-none shadow-xl bg-white overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-right border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-100">
                                            <th className="px-6 py-5 font-black text-slate-500 text-sm">التاريخ</th>
                                            <th className="px-6 py-5 font-black text-slate-500 text-sm">البيان / تفاصيل العملية</th>
                                            <th className="px-6 py-5 font-black text-emerald-600 text-sm text-center">دائن (+)</th>
                                            <th className="px-6 py-5 font-black text-rose-600 text-sm text-center">مدين (-)</th>
                                            <th className="px-6 py-5 font-black text-slate-900 text-sm text-center">الرصيد المتراكم</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {filteredTransactions.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="px-6 py-20 text-center text-slate-400 font-bold">لا توجد عمليات تطابق البحث</td>
                                            </tr>
                                        ) : (
                                            filteredTransactions.map((trx, idx) => (
                                                <tr key={trx.id} className="hover:bg-slate-50/50 transition-colors group">
                                                    <td className="px-6 py-5">
                                                        <p className="font-bold text-slate-700 text-sm">{new Date(trx.date).toLocaleDateString('ar-SA')}</p>
                                                        <p className="text-[10px] text-slate-400 font-bold">{new Date(trx.date).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}</p>
                                                    </td>
                                                    <td className="px-6 py-5">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${trx.type === 'income' ? 'bg-emerald-50 text-emerald-500' : 'bg-rose-50 text-rose-500'}`}>
                                                                {trx.type === 'income' ? <ArrowDownRight size={16} /> : <ArrowUpRight size={16} />}
                                                            </div>
                                                            <span className="font-bold text-slate-800 text-sm">{trx.description}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5 text-center font-black text-emerald-600">
                                                        {trx.type === 'income' ? `${trx.amount.toLocaleString()}` : '—'}
                                                    </td>
                                                    <td className="px-6 py-5 text-center font-black text-rose-600">
                                                        {trx.type === 'expense' ? `${trx.amount.toLocaleString()}` : '—'}
                                                    </td>
                                                    <td className="px-6 py-5 text-center">
                                                        <Badge className={`rounded-lg px-3 py-1 font-black ${trx.running_balance >= 0 ? 'bg-slate-100 text-slate-800' : 'bg-rose-100 text-rose-700'}`}>
                                                            {trx.running_balance.toLocaleString()} ر.س
                                                        </Badge>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    </TabsContent>

                    {/* بقية محتوى الـ Tabs (نفس المنطق السابق) */}
                    <TabsContent value="activity">
                        <TransactionList transactions={filteredTransactions.filter(t => t.type === 'expense')} loading={loading} onViewDetails={(t) => { setSelectedTransaction(t); setIsDetailsModalOpen(true); }} />
                    </TabsContent>

                    <TabsContent value="pending">
                        <div className="space-y-4">
                            {pendingEarnings.length === 0 ? (
                                <Card className="p-20 text-center font-bold text-slate-400 rounded-[2rem]">لا توجد أرباح معلقة</Card>
                            ) : (
                                pendingEarnings.map(e => (
                                    <div key={e.id} className="p-5 rounded-2xl bg-white border border-slate-100 flex justify-between items-center shadow-sm">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-xl flex items-center justify-center"><Clock /></div>
                                            <div>
                                                <p className="font-black text-slate-800">شحنة قيد المراجعة</p>
                                                <p className="text-xs text-slate-400 font-bold">{new Date(e.created_at).toLocaleDateString('ar-SA')}</p>
                                            </div>
                                        </div>
                                        <p className="font-black text-xl text-blue-600">{Number(e.amount).toLocaleString()} ر.س</p>
                                    </div>
                                ))
                            )}
                        </div>
                    </TabsContent>

                    <TabsContent value="receipts">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {receipts.map(r => (
                                <Card key={r.id} className="p-5 rounded-2xl border-none shadow-sm bg-white flex justify-between items-center">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center"><FileText /></div>
                                        <div>
                                            <p className="font-black text-slate-800">إيصال صرف أرباح</p>
                                            <p className="text-xs text-slate-400 font-bold">{new Date(r.created_at).toLocaleDateString('ar-SA')}</p>
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="icon" onClick={() => { setSelectedReceipt(r.file_url); setIsReceiptModalOpen(true); }} className="rounded-full bg-slate-50">
                                        <Download size={18} className="text-blue-600" />
                                    </Button>
                                </Card>
                            ))}
                        </div>
                    </TabsContent>
                </Tabs>
            </div>

            {/* Modal: طلب السحب */}
            <Dialog open={isWithdrawOpen} onOpenChange={setIsWithdrawOpen}>
                <DialogContent className="max-w-md w-[95vw] rounded-[2rem] p-8 border-none bg-white shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black text-slate-900 text-right">طلب سحب أرباح</DialogTitle>
                        <DialogDescription className="text-slate-500 font-bold text-right mt-2">
                            سيتم تحويل المبلغ إلى حسابك البنكي المسجل لدينا خلال 24 ساعة عمل.
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-6 pt-4" dir="rtl">
                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex justify-between items-center">
                            <span className="text-slate-500 font-bold">الرصيد المتاح للسحب</span>
                            <span className="text-2xl font-black text-emerald-600">{(wallet?.balance || 0).toLocaleString()} <span className="text-sm">ر.س</span></span>
                        </div>

                        <div className="space-y-3">
                            <Label className="font-black text-slate-700 pr-1">المبلغ المطلوب سحبه</Label>
                            <div className="relative">
                                <Input
                                    type="number"
                                    placeholder="0.00"
                                    className="h-16 text-2xl font-black rounded-2xl border-2 border-slate-100 bg-slate-50/50 pr-6 pl-16 focus:border-blue-500 focus:bg-white transition-all text-right"
                                    value={withdrawInputAmount}
                                    onChange={(e) => setWithdrawInputAmount(e.target.value)}
                                />
                                <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-slate-400">ر.س</span>
                            </div>
                        </div>

                        <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 flex gap-3 text-right">
                            <Info className="text-blue-500 shrink-0 mt-0.5" size={18} />
                            <p className="text-[11px] text-blue-700 font-bold leading-relaxed">
                                يرجى التأكد من صحة بيانات الآيبان (IBAN) في ملفك الشخصي قبل تقديم الطلب لضمان وصول المبلغ بنجاح.
                            </p>
                        </div>
                    </div>

                    <DialogFooter className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-slate-50 mt-4">
                        <Button 
                            onClick={handleWithdrawRequest} 
                            disabled={isSubmittingWithdraw || !withdrawInputAmount}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-black h-14 rounded-2xl transition-all shadow-lg shadow-blue-100"
                        >
                            {isSubmittingWithdraw ? (
                                <><Loader2 className="ml-2 animate-spin" size={20} /> جاري المعالجة...</>
                            ) : 'تأكيد طلب السحب'}
                        </Button>
                        <Button 
                            variant="outline" 
                            onClick={() => setIsWithdrawOpen(false)}
                            className="flex-1 border-2 border-slate-100 font-black h-14 rounded-2xl text-slate-500"
                        >
                            إلغاء
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal: عرض الإيصال */}
            <Dialog open={isReceiptModalOpen} onOpenChange={setIsReceiptModalOpen}>
                <DialogContent className="max-w-3xl w-[95vw] rounded-[2rem] p-4 sm:p-8 overflow-hidden bg-white border-none shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-black text-slate-900 text-right mb-4">معاينة إيصال الصرف</DialogTitle>
                    </DialogHeader>
                    <div className="bg-slate-100 rounded-2xl overflow-hidden min-h-[400px] flex items-center justify-center relative">
                        {selectedReceipt ? (
                            <img src={selectedReceipt} alt="Payout Receipt" className="max-w-full max-h-[70vh] object-contain shadow-lg" />
                        ) : (
                            <div className="flex flex-col items-center gap-4 text-slate-400">
                                <FileText size={48} />
                                <p className="font-bold">جاري تحميل الإيصال...</p>
                            </div>
                        )}
                    </div>
                    <div className="flex justify-center mt-6">
                        <Button 
                            className="bg-blue-600 text-white font-black px-8 h-12 rounded-xl"
                            onClick={() => selectedReceipt && window.open(selectedReceipt, '_blank')}
                        >
                            <Download size={18} className="ml-2" /> تنزيل الإيصال
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Modal: تفاصيل العملية */}
            <Dialog open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen}>
                <DialogContent className="max-w-md w-[95vw] rounded-[2rem] p-8 border-none bg-white shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-black text-slate-900 text-right">تفاصيل العملية المالية</DialogTitle>
                    </DialogHeader>
                    
                    {selectedTransaction && (
                        <div className="space-y-6 pt-4" dir="rtl">
                            <div className="flex items-center gap-4 mb-2">
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${selectedTransaction.type === 'income' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                    {selectedTransaction.type === 'income' ? <ArrowDownRight size={28} /> : <ArrowUpRight size={28} />}
                                </div>
                                <div>
                                    <p className="font-black text-slate-900 text-lg">{selectedTransaction.description}</p>
                                    <p className="text-xs text-slate-500 font-bold">{new Date(selectedTransaction.date).toLocaleDateString('ar-SA')} - {new Date(selectedTransaction.date).toLocaleTimeString('ar-SA')}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                    <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">المبلغ</p>
                                    <p className={`font-black text-xl ${selectedTransaction.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                        {selectedTransaction.type === 'income' ? '+' : '-'}{selectedTransaction.amount.toLocaleString()} <span className="text-xs">ر.س</span>
                                    </p>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                    <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">رقم المرجعية</p>
                                    <p className="font-black text-sm text-slate-700 truncate">{selectedTransaction.id.substring(0, 12)}...</p>
                                </div>
                            </div>

                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">الرصيد بعد العملية</p>
                                <p className="font-black text-lg text-slate-800">
                                    {selectedTransaction.running_balance?.toLocaleString()} <span className="text-xs font-bold text-slate-400">ر.س</span>
                                </p>
                            </div>

                            {selectedTransaction.type === 'expense' && (
                                <div className="p-4 rounded-2x border-2 border-dashed border-slate-100 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <CheckCircle2 className="text-emerald-500" size={18} />
                                        <span className="font-bold text-slate-600 text-sm">حالة الطلب: مكتمل</span>
                                    </div>
                                    <Badge className="bg-emerald-50 text-emerald-600 border-none font-bold">تم التحويل</Badge>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="mt-6">
                        <Button 
                            variant="outline" 
                            className="w-full h-12 rounded-xl border-2 border-slate-100 font-black text-slate-500"
                            onClick={() => setIsDetailsModalOpen(false)}
                        >
                            إغلاق
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

        </AppLayout>
    );
}