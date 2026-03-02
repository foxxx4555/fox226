import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { Wallet, Printer, Download, TrendingUp, ArrowDownRight, ArrowUpRight, CreditCard, Clock, CheckCircle2, XCircle, FileImage } from 'lucide-react';
import { api } from '@/services/api';
import { financeApi } from '@/lib/finances';
import WalletCard from '@/components/finance/WalletCard';
import TransactionList from '@/components/finance/TransactionList';
import {
    ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
    CartesianGrid, Tooltip
} from 'recharts';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function DriverStatement() {
    const { userProfile } = useAuth();
    const [loading, setLoading] = useState(true);
    const [wallet, setWallet] = useState<any>(null);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [stats, setStats] = useState({ earned: 0, spent: 0, completedLoads: 0 });
    const [withdrawals, setWithdrawals] = useState<any[]>([]);
    const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
    const [selectedReceipt, setSelectedReceipt] = useState<string | null>(null);

    const loadFinancialData = async () => {
        if (!userProfile?.id) return;
        setLoading(true);
        try {
            // 1. جلب بيانات المحفظة الفعلي
            const walletData = await api.getWalletBalance(userProfile.id);
            setWallet(walletData);

            // 2. جلب العمليات المالية الحقيقية
            const txHistory = await api.getTransactionHistory(userProfile.id);

            // 3. جلب طلبات السحب الخاصة بالمستخدم
            const userWithdrawals = await api.getUserWithdrawals(userProfile.id);
            setWithdrawals(userWithdrawals || []);

            const mappedTransactions = txHistory.map((t: any) => ({
                ...t,
                id: t.transaction_id,
                date: t.created_at,
                description: t.description || (t.shipment ? `شحنة من ${t.shipment.origin}` : 'عملية مالية'),
                amount: Number(t.amount),
                // credit يعني دخل للمحفظة، debit يعني خصم
                type: t.type === 'credit' ? 'income' : 'expense',
                reference: `TX-${t.transaction_id.toString().padStart(6, '0')}`,
                status: 'completed',
                is_load: !!t.shipment_id
            }));

            setTransactions(mappedTransactions);

            // Calculate stats based on transactions
            const earned = mappedTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
            const spent = mappedTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);

            setStats({
                earned,
                spent,
                completedLoads: mappedTransactions.filter(t => t.is_load).length
            });
        } catch (err) {
            console.error("Financial Load Error:", err);
        } finally {
            setLoading(false);
        }
    };

    const pendingWithdrawalAmount = withdrawals
        .filter(w => w.status === 'pending')
        .reduce((sum, w) => sum + Number(w.amount), 0);

    // دالة شحن الرصيد عبر Stripe
    const handleTopUp = async () => {
        const amount = window.prompt("أدخل المبلغ المراد شحنه (ر.س):");
        if (!amount || isNaN(Number(amount))) return;

        try {
            const { url } = await api.createStripeSession((wallet as any).wallet_id, Number(amount));
            if (url) window.location.href = url;
        } catch (err) {
            alert("فشل الاتصال ببوابة الدفع");
        }
    };

    const handleWithdraw = async () => {
        const amount = window.prompt("أدخل مبلغ السحب (ر.س):");
        if (!amount || isNaN(Number(amount))) return;
        if (Number(amount) > (wallet?.balance || 0)) {
            alert("الرصيد غير كافٍ");
            return;
        }

        try {
            await financeApi.requestWithdrawal(userProfile!.id, Number(amount), { method: 'bank_transfer' });
            alert("تم إرسال طلب السحب بنجاح");
            loadFinancialData();
        } catch (err) {
            console.error("Withdrawal error:", err);
            alert("فشل في إرسال طلب السحب");
        }
    };

    useEffect(() => {
        loadFinancialData();
    }, [userProfile?.id]);

    const chartData = transactions.slice(0, 7).reverse().map(t => ({
        name: new Date(t.created_at).toLocaleDateString('ar-SA', { weekday: 'short' }),
        amount: Number(t.amount)
    }));

    const formatCurrency = (val: number) => new Intl.NumberFormat('ar-SA').format(val);

    return (
        <AppLayout>
            <div className="max-w-6xl mx-auto space-y-8 pb-32 px-4 mt-6">

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-5">
                        <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-[2rem] flex items-center justify-center shadow-xl">
                            <Wallet size={32} />
                        </div>
                        <div>
                            <h1 className="text-4xl font-black text-slate-900">كشف الحساب والمستحقات</h1>
                            <p className="text-slate-500 font-bold mt-1">إجمالي الشحنات المنفذة: <span className="text-blue-600">{stats.completedLoads}</span></p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Sidebar: Wallet Info */}
                    <div className="space-y-6">
                        <WalletCard
                            balance={wallet?.balance || 0}
                            currency={wallet?.currency || 'ر.س'}
                            type="carrier"
                            onRefresh={() => loadFinancialData()}
                            onTopUp={handleTopUp}
                            onWithdraw={handleWithdraw}
                        />

                        {pendingWithdrawalAmount > 0 && (
                            <div className="bg-amber-50 border border-amber-200 rounded-3xl p-5 text-center shadow-sm">
                                <Clock className="mx-auto text-amber-500 mb-2" size={24} />
                                <h4 className="font-black text-amber-800">مبالغ قيد التحويل بانتظار الاعتماد</h4>
                                <p className="text-2xl font-black text-amber-600 mt-1">{pendingWithdrawalAmount.toLocaleString()} ر.س</p>
                            </div>
                        )}
                    </div>

                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Card className="rounded-[2.5rem] border-none shadow-xl bg-white p-8 border-t-4 border-emerald-500">
                                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center mb-4"><ArrowDownRight /></div>
                                <p className="text-slate-500 font-black">إجمالي الأرباح المستلمة</p>
                                <h2 className="text-3xl font-black mt-1 text-slate-900">{formatCurrency(stats.earned)} ر.س</h2>
                            </Card>
                            <Card className="rounded-[2.5rem] border-none shadow-xl bg-white p-8 border-t-4 border-rose-500">
                                <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center mb-4"><ArrowUpRight /></div>
                                <p className="text-slate-500 font-black">إجمالي السحوبات</p>
                                <h2 className="text-3xl font-black mt-1 text-slate-900">{formatCurrency(stats.spent)} ر.س</h2>
                            </Card>
                        </div>

                        {/* Withdrawals Section */}
                        <Card className="rounded-[3rem] border-none shadow-2xl bg-white overflow-hidden p-6 md:p-10">
                            <div className="flex items-center justify-between mb-8 border-b pb-4">
                                <h3 className="text-xl font-black flex items-center gap-2">
                                    <CreditCard className="text-blue-500" /> طلبات السحب والحوالات
                                </h3>
                            </div>
                            <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                                {withdrawals.length === 0 ? (
                                    <div className="text-center py-8 opacity-50 font-bold bg-slate-50 rounded-2xl">لا يوجد طلبات سحب سابقة</div>
                                ) : withdrawals.map(w => (
                                    <div key={w.id} className="p-5 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-blue-200 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className={`p-3 rounded-2xl text-white flex-shrink-0 ${w.status === 'approved' ? 'bg-emerald-500 shadow-emerald-500/20' : w.status === 'rejected' ? 'bg-rose-500 shadow-rose-500/20' : 'bg-amber-500 shadow-amber-500/20'} shadow-lg`}>
                                                {w.status === 'approved' ? <CheckCircle2 size={24} /> : w.status === 'rejected' ? <XCircle size={24} /> : <Clock size={24} />}
                                            </div>
                                            <div>
                                                <p className="font-black text-lg text-slate-800">{w.status === 'approved' ? 'مكتمل (تم التحويل)' : w.status === 'rejected' ? 'مرفوض' : 'قيد المراجعة'}</p>
                                                <p className="text-sm text-slate-400 font-bold mt-1" dir="ltr">{(new Date(w.created_at)).toLocaleDateString('ar-SA')} - {new Date(w.created_at).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}</p>
                                            </div>
                                        </div>

                                        <div className="text-left w-full md:w-auto">
                                            <p className="font-black text-2xl tracking-tight text-slate-800 mb-2">{Number(w.amount).toLocaleString()} <span className="text-sm font-bold text-slate-500">ر.س</span></p>

                                            {w.status === 'approved' && w.proof_image_url && (
                                                <Button
                                                    variant="outline"
                                                    onClick={() => {
                                                        setSelectedReceipt(w.proof_image_url);
                                                        setIsReceiptModalOpen(true);
                                                    }}
                                                    className="w-full h-10 rounded-xl font-bold border-emerald-200 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 shadow-sm"
                                                >
                                                    <FileImage size={16} className="me-2" />
                                                    عرض الإيصال
                                                </Button>
                                            )}

                                            {w.admin_notes && (
                                                <p className="text-xs bg-white border border-rose-200 rounded-lg p-2 mt-2 font-bold text-rose-600">
                                                    ملاحظة: {w.admin_notes}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>

                    </div>
                </div>

                <div className="space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Printer size={20} /></div>
                        <h3 className="text-xl font-black">سجل العمليات المالية الشامل</h3>
                    </div>
                    <TransactionList
                        transactions={transactions}
                        loading={loading}
                    />
                </div>
            </div>

            {/* Receipt Modal */}
            <Dialog open={isReceiptModalOpen} onOpenChange={setIsReceiptModalOpen}>
                <DialogContent className="sm:max-w-xl bg-white rounded-[2rem] p-0 overflow-hidden border-none text-right shadow-2xl" dir="rtl">
                    <div className="bg-slate-50 p-6 border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center">
                                <CheckCircle2 size={24} />
                            </div>
                            <div>
                                <DialogTitle className="text-xl font-black">إيصال التحويل البنكي</DialogTitle>
                                <DialogDescription className="font-bold text-slate-500 mt-1">المرفق من قسم الحسابات والإدارة المالية</DialogDescription>
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
                            className="h-12 rounded-xl font-black bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20 px-8"
                        >
                            <Download size={18} className="me-2" /> تكبير / تحميل
                        </Button>
                        <Button variant="outline" onClick={() => setIsReceiptModalOpen(false)} className="h-12 rounded-xl font-bold bg-white text-slate-600 mx-0 border-slate-200">
                            إغلاق
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}

// Ensure the Dialog component is imported at the top. The top of the file seems to have it already.

