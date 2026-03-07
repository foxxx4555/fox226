import { useState, useEffect, useMemo } from 'react';
import AppLayout from '@/components/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import {
    Wallet, Printer, Download, TrendingUp, ArrowDownRight,
    ArrowUpRight, CreditCard, Clock, CheckCircle2, XCircle,
    FileImage, Info, Loader2
} from 'lucide-react';
import { api } from '@/services/api';
import { financeApi } from '@/lib/finances';
import { supabase } from '@/integrations/supabase/client';
import WalletCard from '@/components/finance/WalletCard';
import TransactionList from '@/components/finance/TransactionList';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function DriverStatement() {
    const { userProfile } = useAuth();
    const [loading, setLoading] = useState(true);
    const [wallet, setWallet] = useState<any>(null);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [withdrawals, setWithdrawals] = useState<any[]>([]);

    // UI States
    const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
    const [selectedReceipt, setSelectedReceipt] = useState<string | null>(null);
    const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

    const loadFinancialData = async () => {
        if (!userProfile?.id) return;
        setLoading(true);
        try {
            const [walletData, txHistory, userWithdrawals] = await Promise.all([
                api.getWalletBalance(userProfile.id),
                api.getTransactionHistory(userProfile.id),
                api.getUserWithdrawals(userProfile.id)
            ]);

            setWallet(walletData);
            setWithdrawals(userWithdrawals || []);

            const mappedTransactions = txHistory.map((t: any) => ({
                ...t,
                id: t.transaction_id,
                date: t.created_at,
                description: t.description || (t.shipment ? `أرباح شحنة من ${t.shipment.origin}` : 'عملية مالية'),
                amount: Number(t.amount),
                type: t.amount > 0 ? 'income' : 'expense',
                status: 'completed'
            }));

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

        // 1. مستمع حي لتحديثات المحفظة
        const walletChannel = supabase
            .channel('driver-wallet')
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'wallets',
                filter: `profile_id=eq.${userProfile?.id}`
            }, (payload) => {
                setWallet(payload.new);
                toast.success("تم تحديث رصيد محفظتك! 💰");
                loadFinancialData();
            })
            .subscribe();

        // 2. مستمع حي لطلبات السحب (عندما يغير الأدمن الحالة)
        const withdrawalChannel = supabase
            .channel('withdrawal-updates')
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'withdrawal_requests'
            }, (payload) => {
                toast.info("تم تحديث حالة طلب السحب الخاص بك");
                loadFinancialData();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(walletChannel);
            supabase.removeChannel(withdrawalChannel);
        };
    }, [userProfile?.id]);

    // حساب الإحصائيات
    const stats = useMemo(() => {
        const earned = transactions.filter(t => t.amount > 0).reduce((acc, t) => acc + t.amount, 0);

        // المسحوبات هي مجموع الطلبات التي تمت الموافقة عليها (approved)
        const withdrawn = withdrawals
            .filter(w => w.status === 'approved')
            .reduce((acc, w) => acc + Number(w.amount), 0);

        const pending = withdrawals
            .filter(w => w.status === 'pending')
            .reduce((acc, w) => acc + Number(w.amount), 0);

        return { earned, withdrawn, pending, completedLoads: transactions.filter(t => !!t.shipment_id).length };
    }, [transactions, withdrawals]);

    const handleWithdraw = async () => {
        const amount = window.prompt("أدخل مبلغ السحب (ر.س):");
        if (!amount || isNaN(Number(amount))) return;

        const withdrawAmount = Number(amount);
        if (withdrawAmount > (wallet?.balance || 0)) {
            toast.error("الرصيد غير كافٍ للسحب");
            return;
        }

        try {
            toast.loading("جاري إرسال الطلب...");
            await financeApi.requestWithdrawal(userProfile!.id, withdrawAmount, { method: 'bank_transfer' });
            toast.dismiss();
            toast.success("تم إرسال طلب السحب بنجاح، سيتم التحويل قريباً");
            loadFinancialData();
        } catch (err) {
            toast.dismiss();
            toast.error("فشل في إرسال الطلب");
        }
    };

    return (
        <AppLayout>
            <div className="max-w-6xl mx-auto space-y-8 pb-32 px-4 mt-6">

                {/* Header */}
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-5">
                        <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-[2rem] flex items-center justify-center shadow-xl shadow-blue-200">
                            <Wallet size={32} />
                        </div>
                        <div>
                            <h1 className="text-4xl font-black text-slate-900 tracking-tight">المستحقات المالية</h1>
                            <p className="text-slate-500 font-bold mt-1">
                                إجمالي الشحنات المكتملة: <span className="text-blue-600 font-black">{stats.completedLoads}</span>
                            </p>
                        </div>
                    </div>
                    <Button
                        onClick={handleWithdraw}
                        className="h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 font-black px-8 shadow-xl shadow-blue-200 text-white transition-all active:scale-95"
                    >
                        <CreditCard size={18} className="ml-2" /> طلب سحب أرباح
                    </Button>
                </motion.div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Wallet Sidebar */}
                    <div className="space-y-6">
                        <WalletCard
                            balance={wallet?.balance || 0}
                            currency="SAR"
                            type="carrier"
                            onRefresh={loadFinancialData}
                            onWithdraw={handleWithdraw}
                        />

                        {stats.pending > 0 && (
                            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-amber-50 border border-amber-200 rounded-[2rem] p-6 text-center shadow-sm relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-2 opacity-10"><Clock size={80} /></div>
                                <Clock className="mx-auto text-amber-500 mb-2 relative z-10" size={24} />
                                <h4 className="font-black text-amber-800 relative z-10">مستحقات بانتظار التحويل</h4>
                                <p className="text-3xl font-black text-amber-600 mt-1 relative z-10">{stats.pending.toLocaleString()} ر.س</p>
                            </motion.div>
                        )}
                    </div>

                    {/* Main Stats */}
                    <div className="lg:col-span-2 space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Card className="rounded-[2.5rem] border-none shadow-xl bg-white p-8 border-r-8 border-emerald-500">
                                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center mb-4"><ArrowDownRight /></div>
                                <p className="text-slate-500 font-black text-sm">إجمالي الأرباح المستلمة</p>
                                <h2 className="text-3xl font-black mt-1 text-slate-900">{stats.earned.toLocaleString()} <span className="text-lg">ر.س</span></h2>
                            </Card>
                            <Card className="rounded-[2.5rem] border-none shadow-xl bg-white p-8 border-r-8 border-rose-500">
                                <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center mb-4"><ArrowUpRight /></div>
                                <p className="text-slate-500 font-black text-sm">إجمالي المسحوبات</p>
                                <h2 className="text-3xl font-black mt-1 text-slate-900">{stats.withdrawn.toLocaleString()} <span className="text-lg">ر.س</span></h2>
                            </Card>
                        </div>

                        {/* Withdrawals List */}
                        <Card className="rounded-[3rem] border-none shadow-2xl bg-white overflow-hidden p-6 md:p-10">
                            <div className="flex items-center justify-between mb-8 border-b pb-4">
                                <h3 className="text-xl font-black flex items-center gap-2">
                                    <CreditCard className="text-blue-500" /> تتبع طلبات السحب والحوالات
                                </h3>
                            </div>
                            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                {withdrawals.length === 0 ? (
                                    <div className="text-center py-12 opacity-50 font-bold bg-slate-50 rounded-3xl border-2 border-dashed">لا يوجد طلبات سحب سابقة</div>
                                ) : (
                                    withdrawals.map(w => (
                                        <div key={w.id} className="p-5 rounded-3xl bg-slate-50 border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 hover:border-blue-200 transition-all">
                                            <div className="flex items-center gap-4">
                                                <div className={`p-3 rounded-2xl text-white ${w.status === 'approved' ? 'bg-emerald-500' :
                                                    w.status === 'rejected' ? 'bg-rose-500' : 'bg-amber-500'
                                                    } shadow-lg shadow-current/20`}>
                                                    {w.status === 'approved' ? <CheckCircle2 size={24} /> : w.status === 'rejected' ? <XCircle size={24} /> : <Clock size={24} />}
                                                </div>
                                                <div>
                                                    <p className="font-black text-slate-800">{w.status === 'approved' ? 'تم تحويل المبلغ' : w.status === 'rejected' ? 'الطلب مرفوض' : 'قيد المراجعة الإدارية'}</p>
                                                    <p className="text-xs text-slate-400 font-bold">{(new Date(w.created_at)).toLocaleDateString('ar-SA')}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4 w-full md:w-auto">
                                                <div className="text-left flex-1 md:flex-none">
                                                    <p className="font-black text-2xl text-slate-800">{Number(w.amount).toLocaleString()} <span className="text-xs">ر.س</span></p>
                                                    {w.status === 'approved' && w.proof_image_url && (
                                                        <Button
                                                            variant="link"
                                                            onClick={() => { setSelectedReceipt(w.proof_image_url); setIsReceiptModalOpen(true); }}
                                                            className="h-auto p-0 text-emerald-600 font-bold text-xs"
                                                        >
                                                            عرض إيصال التحويل
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </Card>
                    </div>
                </div>

                {/* All Transactions */}
                <div className="pt-8">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-slate-900 text-white rounded-xl"><Printer size={20} /></div>
                            <h3 className="text-2xl font-black text-slate-900">سجل العمليات المالية</h3>
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
            </div>

            {/* Modal: Receipt View */}
            <Dialog open={isReceiptModalOpen} onOpenChange={setIsReceiptModalOpen}>
                <DialogContent className="sm:max-w-xl bg-white rounded-[2rem] p-0 overflow-hidden border-none text-right" dir="rtl">
                    <div className="bg-slate-50 p-6 border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center"><CheckCircle2 size={24} /></div>
                            <div>
                                <DialogTitle className="text-xl font-black">إيصال التحويل البنكي</DialogTitle>
                                <DialogDescription className="font-bold">تم التحويل من قبل الإدارة المالية للمنصة</DialogDescription>
                            </div>
                        </div>
                    </div>
                    <div className="p-6 bg-slate-100/50">
                        {selectedReceipt && (
                            <img src={selectedReceipt} alt="Receipt" className="max-w-full rounded-2xl shadow-sm border object-contain mx-auto" style={{ maxHeight: '60vh' }} />
                        )}
                    </div>
                    <DialogFooter className="p-6 bg-white border-t gap-3 flex-row-reverse">
                        <Button onClick={() => window.open(selectedReceipt!, '_blank')} className="bg-slate-900 text-white font-bold h-12 rounded-xl px-6"><Download size={18} className="ml-2" /> تحميل الإيصال</Button>
                        <Button variant="outline" onClick={() => setIsReceiptModalOpen(false)} className="h-12 rounded-xl font-bold">إغلاق</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal: Transaction Details */}
            <Dialog open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen}>
                <DialogContent className="sm:max-w-md bg-white rounded-[2rem] p-0 overflow-hidden border-none text-right" dir="rtl">
                    <div className="bg-slate-50 p-6 border-b border-slate-100 flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center"><Info size={24} /></div>
                        <div>
                            <DialogTitle className="text-xl font-black">تفاصيل العملية</DialogTitle>
                            <DialogDescription className="font-bold">بيانات المعاملة المالية رقم: {selectedTransaction?.id?.substring(0, 8)}</DialogDescription>
                        </div>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="flex justify-between p-4 bg-slate-50 rounded-2xl items-center">
                            <span className="font-bold text-slate-500">القيمة:</span>
                            <span className={`text-2xl font-black ${selectedTransaction?.amount > 0 ? 'text-emerald-600' : 'text-slate-900'}`}>{selectedTransaction?.amount?.toLocaleString()} ر.س</span>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-slate-400 text-xs">الوصف</Label>
                            <p className="font-black text-slate-800 bg-white border p-4 rounded-2xl leading-relaxed">{selectedTransaction?.description}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div><Label className="text-slate-400 text-xs">التاريخ</Label><p className="font-bold">{(new Date(selectedTransaction?.created_at)).toLocaleDateString('ar-SA')}</p></div>
                            <div><Label className="text-slate-400 text-xs">الحالة</Label><Badge className="bg-emerald-100 text-emerald-600 border-none">مكتملة</Badge></div>
                        </div>
                    </div>
                    <DialogFooter className="p-6 bg-slate-50 border-t">
                        <Button onClick={() => setIsDetailsModalOpen(false)} className="w-full h-12 rounded-xl bg-slate-900 text-white font-bold">إغلاق النافذة</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </AppLayout>
    );
}
