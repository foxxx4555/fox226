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
    CheckCircle2, Clock, XCircle, FileImage, Info, Upload, Trash2
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { motion } from 'framer-motion';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import WalletCard from '@/components/finance/WalletCard';
import TransactionList from '@/components/finance/TransactionList';
import InvoiceTemplate from '@/components/finance/InvoiceTemplate';
import ReceiptTemplate from '@/components/finance/ReceiptTemplate';
import { toast } from 'sonner';
import { formatShortId } from '@/lib/formatters';
import { generateReceiptPdf } from '@/lib/receipts';

function PaymentLoadDetails({ linkedLoad, payment }: { linkedLoad: any, payment: any }) {
    const [showDetails, setShowDetails] = useState(false);

    return (
        <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-3 mt-1 cursor-pointer transition-all hover:bg-blue-50" onClick={() => setShowDetails(!showDetails)}>
            <div className="flex items-center justify-between mb-2">
                <Badge
                    className="bg-blue-600 text-white cursor-pointer hover:bg-blue-700"
                    onClick={(e) => {
                        e.stopPropagation();
                        window.open(`/loads/${payment.shipment_id}`, '_blank');
                    }}
                >
                    شحنة #{payment.shipment_id.substring(0, 8)}
                </Badge>
                {linkedLoad.price && Number(payment.amount) < linkedLoad.price && (
                    <span className="text-[10px] font-black text-rose-500 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100">سداد جزئي</span>
                )}
            </div>

            <Button
                variant="ghost"
                size="sm"
                className="w-full h-8 text-xs font-bold text-blue-600 bg-white border border-blue-100 mb-2 hover:bg-blue-50"
                onClick={(e) => {
                    e.stopPropagation();
                    setShowDetails(!showDetails);
                }}
            >
                {showDetails ? 'إخفاء التفاصيل' : 'عرض التفاصيل'}
            </Button>

            {showDetails && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="overflow-hidden">
                    <div className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-100 shadow-sm">
                        <div className="text-right flex-1">
                            <p className="text-[10px] text-slate-400 font-bold mb-0.5">إجمالي الشحنة</p>
                            <p className="font-black text-sm text-slate-800">{linkedLoad.price?.toLocaleString()} <span className="text-[10px]">ر.س</span></p>
                        </div>
                        <div className="w-px h-8 bg-slate-100 mx-2"></div>
                        <div className="text-center flex-1">
                            <p className="text-[10px] text-slate-400 font-bold mb-0.5">المدفوع</p>
                            <p className="font-black text-sm text-blue-600">{Number(payment.amount).toLocaleString()} <span className="text-[10px]">ر.س</span></p>
                        </div>
                        {linkedLoad.price && Number(payment.amount) < linkedLoad.price && (
                            <>
                                <div className="w-px h-8 bg-slate-100 mx-2"></div>
                                <div className="text-left flex-1">
                                    <p className="text-[10px] text-slate-400 font-bold mb-0.5">المتبقي</p>
                                    <p className="font-black text-sm text-rose-600">{(linkedLoad.price - Number(payment.amount)).toLocaleString()} <span className="text-[10px]">ر.س</span></p>
                                </div>
                            </>
                        )}
                    </div>
                    <p className="text-[10px] font-bold text-slate-500 mt-2 text-center">
                        {linkedLoad.origin} ➔ {linkedLoad.destination}
                    </p>
                </motion.div>
            )}
        </div>
    );
}

export default function ShipperStatement() {
    const { userProfile } = useAuth();
    const printRef = useRef<HTMLDivElement>(null);
    const receiptRef = useRef<HTMLDivElement>(null);
    const [selectedReceiptData, setSelectedReceiptData] = useState<any>(null);
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
    const [userLoads, setUserLoads] = useState<any[]>([]);
    const [selectedLoadId, setSelectedLoadId] = useState<string>('');
    const [isResetting, setIsResetting] = useState(false);
    const [invoices, setInvoices] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState('activity');
    const [loadBalances, setLoadBalances] = useState<Record<string, { total: number, paid: number, remaining: number }>>({});
    const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<string[]>([]);
    const [paymentReference, setPaymentReference] = useState('');

    const handleResetAccount = async () => {
        if (!confirm("تنبيه: سيتم حذف كافة الشحنات والعمليات بصفة نهائية. هل أنت متأكد؟")) return;
        setIsResetting(true);
        try {
            await api.deleteAllUserLoads(userProfile.id);
            toast.success("تم تصفية الحساب بنجاح");
            loadFinancialData();
        } catch (err) {
            console.error(err);
            toast.error("حدث خطأ أثناء التصفية");
        } finally {
            setIsResetting(false);
        }
    };

    const loadFinancialData = async () => {
        if (!userProfile?.id) return;
        setLoading(true);
        try {
            const [walletData, txHistory, payments, loads, invoiceData] = await Promise.all([
                api.getWalletBalance(userProfile.id, 'shipper'),
                api.getTransactionHistory(userProfile.id, 'shipper'),
                api.getShipperPayments(userProfile.id),
                api.getUserLoads(userProfile.id),
                api.getInvoices(userProfile.id)
            ]);

            setWallet(walletData);
            setShipperPayments(payments || []);
            setUserLoads(loads?.filter((l: any) => l.owner_id === userProfile.id) || []);
            setInvoices(invoiceData || []);

            // حساب الأرصدة لكل شحنة بناءً على الفواتير والمدفوعات الفعلية
            const balances: Record<string, any> = {};
            (invoiceData || []).forEach((inv: any) => {
                if (inv.shipment_id) {
                    balances[inv.shipment_id] = {
                        total: Number(inv.total_amount),
                        paid: Number(inv.amount_paid || 0),
                        remaining: Number(inv.balance || (inv.total_amount - (inv.amount_paid || 0)))
                    };
                }
            });

            // تحديث الأرصدة بالمدفوعات الفعلية المعتمدة (shipper_payments مصدر الحقيقة)
            (payments || []).filter((p: any) => p.status === 'approved').forEach((p: any) => {
                if (p.shipment_id) {
                    if (balances[p.shipment_id]) {
                        // تراكم المدفوعات المعتمدة
                        const paid = (payments || [])
                            .filter((pp: any) => pp.shipment_id === p.shipment_id && pp.status === 'approved')
                            .reduce((sum: number, pp: any) => sum + Number(pp.amount), 0);
                        balances[p.shipment_id].paid = paid;
                        balances[p.shipment_id].remaining = balances[p.shipment_id].total - paid;
                    }
                }
            });

            setLoadBalances(balances);

            const sortedTx = (txHistory || []).sort((a: any, b: any) =>
                new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            );

            let currentBalance = 0;
            const mappedTransactions = sortedTx.map((t: any) => {
                const amount = Number(t.amount) || 0;
                const isDebit = t.type === 'debit' || t.transaction_type === 'usage' || t.transaction_type === 'debt';
                const type = isDebit ? 'expense' : 'income';

                // في منطق المديونية:
                // Debit (دين) -> ينقص الرصيد (يجعله سالباً أكثر)
                // Credit (سداد) -> يزيد الرصيد (يقربه من الصفر أو يجعله موجباً)
                if (isDebit) {
                    currentBalance -= amount;
                } else {
                    currentBalance += amount;
                }

                let rawDesc = t.description || 'عملية مالية';
                const resolvedShipmentId = t.loads?.id || t.shipment_id;
                if (resolvedShipmentId && (rawDesc.includes('DEBT:') || rawDesc.includes('Outstanding') || rawDesc.includes('سداد'))) {
                    rawDesc = `سداد مستحقات شحنة #${resolvedShipmentId.substring(0, 8)}`;
                } else if (t.loads) {
                    rawDesc = `مستحقات شحنة #${t.loads.id.substring(0, 8)} (${t.loads.origin})`;
                }

                return {
                    ...t,
                    id: t.id || t.transaction_id,
                    date: t.created_at,
                    description: rawDesc,
                    amount,
                    type,
                    running_balance: currentBalance,
                    status: t.status || 'completed',
                    shipment_id: resolvedShipmentId
                };
            }).reverse();

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

            // 🔔 مستمع حي لتحديث حالة مدفوعات الشحنات (عند اعتماد الأدمن لدفعتك)
            const paymentsChannel = supabase
                .channel('shipper-payments-updates')
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'shipper_payments', filter: `shipper_id=eq.${userProfile.id}` },
                    (payload: any) => {
                        if (payload.new?.status === 'approved') {
                            toast.success(`✅ تم اعتماد دفعتك! المبلغ ${Number(payload.new.amount).toLocaleString()} ر.س خصم من مديونيتك.`, { duration: 6000 });
                        } else if (payload.new?.status === 'pending') {
                            toast.info(`📥 تم استلام دفعتك وهي قيد المراجعة.`);
                        }
                        loadFinancialData();
                    }
                )
                .subscribe();

            return () => {
                supabase.removeChannel(walletChannel);
                supabase.removeChannel(paymentsChannel);
            };
        }
    }, [userProfile?.id]);

    // تحديث المبلغ تلقائياً عند اختيار شحنة - تم إيقافه لضمان كتابة المبلغ الفعلي من قبل المستخدم
    /*
    useEffect(() => {
        if (selectedLoadId && selectedLoadId !== 'general') {
            const balance = loadBalances[selectedLoadId];
            if (balance) {
                setPaymentAmount(String(balance.remaining));
            } else {
                // إذا لم توجد فاتورة بعد، المبلغ هو سعر الشحنة
                const load = userLoads.find(l => l.id === selectedLoadId);
                if (load) {
                    setPaymentAmount(String(load.price || 0));
                }
            }
        }
    }, [selectedLoadId, loadBalances, userLoads]);
    */

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
        const earned = transactions
            .filter(t => t.type === 'income')
            .reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

        // حساب الديون الحقيقية بناءً على الشحنات النشطة (غير الملغاة)
        const allPendingExpenses = transactions
            .filter(t => t.type === 'expense')
            .filter(t => {
                const idToCheck = t.shipment_id;

                if (idToCheck) {
                    return userLoads.some(l =>
                        l.id === idToCheck && l.status !== 'cancelled'
                    );
                }

                return true;
            })
            .reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

        return {
            debt: allPendingExpenses,
            paid: earned
        };
    }, [transactions, userLoads]);

    const pendingAmountTotal = useMemo(() => {
        return shipperPayments
            .filter(p => p.status === 'pending')
            .reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
    }, [shipperPayments]);

    // ✅ الأرقام الحقيقية من جدول المدفوعات مباشرة (لا نعتمد على wallet.balance)
    const realTotalPaid = useMemo(() =>
        shipperPayments
            .filter(p => p.status === 'approved')
            .reduce((sum, p) => sum + Number(p.amount || 0), 0),
    [shipperPayments]);

    const realTotalDebt = useMemo(() =>
        userLoads
            .filter(l => ['completed', 'delivered', 'in_progress'].includes(l.status))
            .reduce((sum, l) => sum + Number(l.price || 0), 0),
    [userLoads]);

    const realRemainingDebt = Math.max(0, realTotalDebt - realTotalPaid);
    const realTotalPaidToDebt = Math.min(realTotalPaid, realTotalDebt);
    const realWalletCredit = Math.max(0, realTotalPaid - realTotalDebt);

    const chartData = useMemo(() => {
        const last7Days = Array.from({ length: 7 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (6 - i));
            return d.toISOString().split('T')[0];
        });

        return last7Days.map(date => {
            const dayName = new Date(date).toLocaleDateString('ar-SA', { weekday: 'short' });
            const dayAmount = transactions
                .filter(t => t.date && t.date.startsWith(date) && t.type === 'expense')
                .filter(t => {
                    const idToCheck = t.shipment_id;
                    if (idToCheck) {
                        return userLoads.some(l =>
                            l.id === idToCheck && l.status !== 'cancelled'
                        );
                    }

                    return true;
                })
                .reduce((acc, curr) => acc + Number(curr.amount), 0);
            return { name: dayName, amount: dayAmount };
        });
    }, [transactions, userLoads]);

    const handlePayDebt = async () => {
        if (selectedInvoiceIds.length === 0 && (!selectedLoadId || selectedLoadId === 'general')) {
            toast.error("يرجى اختيار الفواتير أو الشحنة المراد سدادها");
            return;
        }

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
            const loadIdForSubmit = selectedLoadId === 'general' ? undefined : selectedLoadId;
            
            await api.submitShipperPayment(
                userProfile!.id, 
                Number(paymentAmount), 
                proofUrl, 
                paymentNotes, 
                loadIdForSubmit,
                selectedInvoiceIds,
                paymentReference
            );

            toast.success("تم إرسال إثبات السداد بنجاح، بانتظار مراجعة الإدارة");
            setIsPaymentModalOpen(false);
            setPaymentAmount('');
            setPaymentImage(null);
            setSelectedLoadId('general');
            setSelectedInvoiceIds([]);
            setPaymentReference('');
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
                <ReceiptTemplate data={selectedReceiptData} printRef={receiptRef} />

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

                    <div className="flex flex-wrap items-center gap-2 md:gap-3">
                        <Button
                            onClick={handleResetAccount}
                            variant="outline"
                            className="h-10 md:h-14 rounded-2xl border-rose-200 text-rose-600 hover:bg-rose-50 font-black px-3 md:px-6 shadow-sm transition-all active:scale-95 text-[10px] md:text-sm flex-1 md:flex-none"
                        >
                            <Trash2 size={16} className="md:ml-2" /> <span>تصفية الحساب</span>
                        </Button>
                        <Button 
                            variant="outline" 
                            className="h-10 md:h-14 rounded-2xl font-black px-3 md:px-6 border-slate-200 hover:bg-slate-50 text-[10px] md:text-sm flex-1 md:flex-none"
                        >
                            <Printer size={16} className="md:ml-2 text-slate-400" /> <span>طباعة</span>
                        </Button>
                        <Button
                            onClick={() => setIsPaymentModalOpen(true)}
                            className="h-10 md:h-14 rounded-2xl bg-slate-900 hover:bg-slate-800 font-black px-3 md:px-8 shadow-xl transition-all active:scale-95 text-white text-[10px] md:text-sm flex-1 md:flex-none"
                        >
                            <Upload size={16} className="md:ml-2" /> <span>إرفاق إيصال</span>
                        </Button>
                        <Button
                            onClick={handleTopUp}
                            className="h-10 md:h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 font-black px-3 md:px-8 shadow-xl shadow-blue-200 transition-all active:scale-95 text-white text-[10px] md:text-sm flex-1 md:flex-none"
                        >
                            <CreditCard size={16} className="md:ml-2" /> <span>دفع</span>
                        </Button>
                    </div>
                </motion.div>

                {/* Metrics Section */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-1">
                        <div className={`transition-all duration-500 rounded-[2.5rem] ${isGlow ? 'ring-4 ring-emerald-400 ring-offset-4 shadow-[0_0_30px_rgba(52,211,153,0.5)]' : ''}`}>
                            <WalletCard
                                balance={-realRemainingDebt}
                                currency={wallet?.currency || 'SAR'}
                                type="shipper"
                                onRefresh={loadFinancialData}
                                onTopUp={handleTopUp}
                            />
                        </div>

                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6">
                            <Card className="rounded-[2rem] border-none shadow-xl bg-white p-4 md:p-5">
                                <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center mb-3">
                                    <ArrowUpRight size={20} />
                                </div>
                                <p className="text-slate-400 font-bold text-[10px] md:text-xs uppercase tracking-wider">المديونية الحالية</p>
                                <h4 className="text-xl md:text-2xl font-black text-slate-800 mt-1">{formatCurrency(realRemainingDebt)} <span className="text-[10px] md:text-xs text-slate-400">ر.س</span></h4>
                            </Card>

                            <Card className="rounded-[2rem] border-none shadow-xl bg-white p-4 md:p-5">
                                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center mb-3">
                                    <Wallet size={20} />
                                </div>
                                <p className="text-slate-400 font-bold text-[10px] md:text-xs uppercase tracking-wider">رصيد المحفظة</p>
                                <h4 className="text-xl md:text-2xl font-black text-slate-800 mt-1">{formatCurrency(realWalletCredit)} <span className="text-[10px] md:text-xs text-slate-400">ر.س</span></h4>
                            </Card>

                            <Card className="rounded-[2rem] border-none shadow-xl bg-white p-4 md:p-5">
                                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center mb-3">
                                    <ArrowDownRight size={20} />
                                </div>
                                <p className="text-slate-400 font-bold text-[10px] md:text-xs uppercase tracking-wider">تم السداد</p>
                                <h4 className="text-xl md:text-2xl font-black text-slate-800 mt-1">{formatCurrency(realTotalPaidToDebt)} <span className="text-[10px] md:text-xs text-slate-400">ر.س</span></h4>
                            </Card>

                            <Card className="rounded-[2rem] border-none shadow-xl bg-white p-4 md:p-5">
                                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center mb-3">
                                    <Clock size={20} />
                                </div>
                                <p className="text-slate-400 font-bold text-[10px] md:text-xs uppercase tracking-wider">قيد المراجعة</p>
                                <h4 className="text-xl md:text-2xl font-black text-slate-800 mt-1">{formatCurrency(pendingAmountTotal)} <span className="text-[10px] md:text-xs text-slate-400">ر.س</span></h4>
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

                                        {payment.shipment_id && (
                                            (() => {
                                                const linkedLoad = userLoads.find(l => l.id === payment.shipment_id);
                                                return (
                                                    <div className="flex flex-col gap-2">
                                                        {linkedLoad ? (
                                                            <PaymentLoadDetails linkedLoad={linkedLoad} payment={payment} />
                                                        ) : (
                                                            <Badge variant="outline" className="bg-slate-50 border-slate-200 text-slate-400 font-bold whitespace-nowrap">شحنة {formatShortId(payment.shipment_id, 'SH')}</Badge>
                                                        )}
                                                        
                                                        {payment.status === 'approved' && (
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="w-full h-10 rounded-xl font-bold border-emerald-200 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 shadow-sm"
                                                                 onClick={async () => {
                                                                    setSelectedReceiptData({
                                                                        invoice_id: payment.id,
                                                                        shipment_id: payment.shipment_id,
                                                                        shipper_name: userProfile?.full_name || 'Shipper',
                                                                        amount: Number(payment.amount),
                                                                        date: payment.created_at
                                                                    });
                                                                    setTimeout(() => {
                                                                        generateReceiptPdf({
                                                                            invoice_id: payment.id,
                                                                            shipment_id: payment.shipment_id,
                                                                            shipper_name: userProfile?.full_name || 'Shipper',
                                                                            amount: Number(payment.amount),
                                                                            date: payment.created_at
                                                                        }, receiptRef);
                                                                    }, 100);
                                                                }}
                                                            >
                                                                <Download size={16} className="ml-2" />
                                                                تحميل السند (PDF)
                                                            </Button>
                                                        )}
                                                    </div>
                                                );
                                            })()
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

                <Tabs defaultValue="activity" className="w-full" onValueChange={setActiveTab}>
                    <TabsList className="grid w-full grid-cols-2 h-14 md:h-16 bg-white/50 p-1.5 md:p-2 rounded-2xl mb-8 border border-white">
                        <TabsTrigger value="activity" className="rounded-xl font-black data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs md:text-base">النشاط المالى والمدفوعات</TabsTrigger>
                        <TabsTrigger value="invoices" className="rounded-xl font-black data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs md:text-base">الفواتير الضريبية</TabsTrigger>
                    </TabsList>

                    <TabsContent value="activity" className="space-y-8">
                        <TransactionList
                            transactions={filteredTransactions}
                            loading={loading}
                            onViewDetails={(trx) => {
                                setSelectedTransaction(trx);
                                setIsDetailsModalOpen(true);
                            }}
                        />
                    </TabsContent>

                    <TabsContent value="invoices">
                        <Card className="rounded-[3rem] border-none shadow-2xl bg-white overflow-hidden p-6 md:p-10">
                            <div className="flex items-center justify-between mb-8 border-b pb-4">
                                <h3 className="text-2xl font-black flex items-center gap-2">
                                    <FileText className="text-blue-500" /> جدول الفواتير — Invoice Payments
                                </h3>
                                <div className="text-xs font-bold text-slate-400">إجمالي الفواتير الصادرة: {invoices.length}</div>
                            </div>

                            <div className="overflow-x-auto border border-slate-100 rounded-[2rem] bg-white">
                                <table className="w-full text-right border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-100">
                                            <th className="px-4 py-4 w-10">
                                                <input 
                                                    title="تحديد كل الفواتير"
                                                    aria-label="تحديد كل الفواتير"
                                                    type="checkbox" 
                                                    className="w-4 h-4 rounded border-slate-300 cursor-pointer"
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            const allUnpaid = invoices
                                                                .filter(inv => Number(inv.balance || (inv.total_amount - (inv.amount_paid || 0))) > 0)
                                                                .map(inv => inv.invoice_id);
                                                            setSelectedInvoiceIds(allUnpaid);
                                                        } else {
                                                            setSelectedInvoiceIds([]);
                                                        }
                                                    }}
                                                    checked={selectedInvoiceIds.length > 0 && selectedInvoiceIds.length === invoices.filter(inv => Number(inv.balance || (inv.total_amount - (inv.amount_paid || 0))) > 0).length}
                                                />
                                            </th>
                                            <th className="px-6 py-4 font-black text-slate-500 text-sm italic">رقم الشحنة</th>
                                            <th className="px-6 py-4 font-black text-slate-500 text-sm">المبلغ المتبقي</th>
                                            <th className="px-6 py-4 font-black text-slate-500 text-sm">المسدد</th>
                                            <th className="px-6 py-4 font-black text-slate-500 text-sm">الإجمالي</th>
                                            <th className="px-6 py-4 font-black text-slate-500 text-sm text-center">الحالة</th>
                                            <th className="px-6 py-4 font-black text-slate-500 text-sm text-center">الإجراء</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {invoices.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} className="px-6 py-20 text-center text-slate-400 font-bold">لا توجد فواتير صادرة حالياً</td>
                                            </tr>
                                        ) : invoices.map((invoice) => {
                                            const totalAmount = Number(invoice.total_amount);
                                            const paidAmount = loadBalances[invoice.shipment_id]?.paid || Number(invoice.amount_paid || 0);
                                            const unpaidAmount = Math.max(0, totalAmount - paidAmount);
                                            const isFullyPaid = unpaidAmount <= 0;
                                            const invoicePendingPayments = shipperPayments.filter(p => p.shipment_id === invoice.shipment_id && p.status === 'pending');
                                            const pendingAmountForInvoice = invoicePendingPayments.reduce((acc, curr) => acc + Number(curr.amount), 0);
                                            const hasPendingPayment = pendingAmountForInvoice > 0;
                                            
                                            // Determine Status and Styling
                                            let statusText = '';
                                            let rowStyle = '';
                                            let statusBadgeStyle = '';

                                            if (isFullyPaid) {
                                                statusText = 'تم الدفع';
                                                rowStyle = 'bg-emerald-50/10 hover:bg-emerald-50/40 transition-colors';
                                                statusBadgeStyle = 'bg-emerald-500 text-white font-black px-4 py-1.5 rounded-full text-xs shadow-sm w-full inline-block min-w-[120px]';
                                            } else if (hasPendingPayment) {
                                                if (pendingAmountForInvoice >= unpaidAmount) {
                                                    statusText = 'قيد المراجعة';
                                                } else {
                                                    statusText = 'سداد جزئي قيد المراجعة';
                                                }
                                                rowStyle = 'bg-amber-50/10 hover:bg-amber-50/40 transition-colors';
                                                statusBadgeStyle = 'bg-amber-500 text-white font-black px-4 py-1.5 rounded-full text-xs shadow-sm w-full inline-block min-w-[120px] leading-tight';
                                            } else if (paidAmount > 0) {
                                                statusText = 'سداد جزئي';
                                                rowStyle = 'bg-blue-50/10 hover:bg-blue-50/40 transition-colors';
                                                statusBadgeStyle = 'bg-blue-500 text-white font-black px-4 py-1.5 rounded-full text-xs shadow-sm w-full inline-block min-w-[120px]';
                                            } else {
                                                statusText = 'المبلغ لم يتم سداده';
                                                rowStyle = 'bg-rose-50/10 hover:bg-rose-50/40 transition-colors';
                                                statusBadgeStyle = 'bg-rose-500 text-white font-black px-4 py-1.5 rounded-full text-xs shadow-sm w-full inline-block min-w-[120px]';
                                            }

                                            return (
                                            <tr key={invoice.invoice_id} className={`border-b border-slate-100/50 ${rowStyle} group`}>
                                                <td className="px-4 py-5 text-center">
                                                    {!isFullyPaid && (
                                                        <input 
                                                            title={`تحديد الفاتورة ${invoice.invoice_id}`}
                                                            aria-label={`تحديد الفاتورة ${invoice.invoice_id}`}
                                                            type="checkbox" 
                                                            className="w-4 h-4 rounded border-slate-300 cursor-pointer"
                                                            checked={selectedInvoiceIds.includes(invoice.invoice_id)}
                                                            onChange={(e) => {
                                                                if (e.target.checked) {
                                                                    setSelectedInvoiceIds(prev => [...prev, invoice.invoice_id]);
                                                                } else {
                                                                    setSelectedInvoiceIds(prev => prev.filter(id => id !== invoice.invoice_id));
                                                                }
                                                            }}
                                                        />
                                                    )}
                                                </td>
                                                <td className="px-6 py-5 font-black text-slate-700">
                                                    <a href={`/loads/${invoice.shipment_id || ''}`} target="_blank" rel="noreferrer" className="hover:text-blue-600 transition-colors block">
                                                        {invoice.shipment_id ? formatShortId(invoice.shipment_id, 'SH') : formatShortId(invoice.invoice_id, 'INV')}
                                                    </a>
                                                </td>
                                                <td className="px-6 py-5 font-black text-rose-600">{unpaidAmount.toLocaleString()} ر.س</td>
                                                <td className="px-6 py-5 font-black text-slate-900">{paidAmount.toLocaleString()} ر.س</td>
                                                <td className="px-6 py-5 font-black text-slate-900">{totalAmount.toLocaleString()} ر.س</td>
                                                <td className="px-6 py-5 text-center align-middle">
                                                    <div className={statusBadgeStyle}>
                                                        {statusText}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5 text-center">
                                                    {(!isFullyPaid && !hasPendingPayment) ? (
                                                        <Button
                                                            size="sm"
                                                            className="h-9 rounded-xl bg-blue-600 hover:bg-blue-700 font-black text-xs px-4 w-full cursor-pointer z-10 relative"
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                if (invoice.shipment_id) {
                                                                    setSelectedLoadId(invoice.shipment_id);
                                                                    setPaymentAmount(''); // اترك المبلغ فارغاً للكتابة اليدوية
                                                                } else {
                                                                    setSelectedLoadId('general');
                                                                    setPaymentAmount('');
                                                                }
                                                                setPaymentNotes(`سداد شحنة رقم ${formatShortId(invoice.shipment_id || invoice.invoice_id, 'SH')}`);
                                                                setIsPaymentModalOpen(true);
                                                            }}
                                                        >
                                                            إرفاق إيصال الدفع
                                                        </Button>
                                                    ) : (
                                                        <div className="flex items-center justify-center gap-2">
                                                            {(paidAmount > 0) && (
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    className="h-9 rounded-xl border-emerald-200 text-emerald-600 hover:bg-emerald-50 font-black text-xs px-3 cursor-pointer"
                                                                    onClick={async () => {
                                                                        setSelectedReceiptData({
                                                                            invoice_id: invoice.invoice_id,
                                                                            shipment_id: invoice.shipment_id,
                                                                            shipper_name: userProfile?.full_name || 'Shipper',
                                                                            amount: paidAmount,
                                                                            date: new Date().toISOString()
                                                                        });
                                                                        setTimeout(() => {
                                                                            generateReceiptPdf({
                                                                                invoice_id: invoice.invoice_id,
                                                                                shipment_id: invoice.shipment_id,
                                                                                shipper_name: userProfile?.full_name || 'Shipper',
                                                                                amount: Number(invoice.amount_paid),
                                                                                date: new Date().toISOString()
                                                                            }, receiptRef);
                                                                        }, 100);
                                                                    }}
                                                                >
                                                                    <Download size={14} className="ml-1" /> تحميل السند
                                                                </Button>
                                                            )}
                                                            <span className="text-slate-300 font-bold text-xs">-</span>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        )})}
                                    </tbody>
                                </table>
                            </div>

                            {selectedInvoiceIds.length > 0 && (
                                <div className="mt-8 flex flex-col md:flex-row items-center justify-between p-6 bg-blue-50 rounded-[2rem] border border-blue-100 gap-4">
                                    <div className="text-right">
                                        <p className="text-sm font-bold text-blue-600 mb-1">إجمالي الفواتير المختارة ({selectedInvoiceIds.length})</p>
                                        <h4 className="text-3xl font-black text-slate-900">
                                            {invoices
                                                .filter(inv => selectedInvoiceIds.includes(inv.invoice_id))
                                                .reduce((sum, inv) => sum + Number(inv.balance || (inv.total_amount - (inv.amount_paid || 0))), 0)
                                                .toLocaleString()
                                            } <span className="text-sm">ر.س</span>
                                        </h4>
                                    </div>
                                    <Button
                                        onClick={() => {
                                            const total = invoices
                                                .filter(inv => selectedInvoiceIds.includes(inv.invoice_id))
                                                .reduce((sum, inv) => sum + Number(inv.balance || (inv.total_amount - (inv.amount_paid || 0))), 0);
                                            setPaymentAmount(String(total));
                                            setPaymentReference(`PAY-${Math.random().toString(36).substring(2, 9).toUpperCase()}`);
                                            setIsPaymentModalOpen(true);
                                        }}
                                        className="h-14 px-10 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black shadow-xl shadow-blue-200"
                                    >
                                        إتمام السداد عبر حوالة بنكية
                                    </Button>
                                </div>
                            )}

                            <div className="mt-10 pt-6 border-t border-slate-100 space-y-3">
                                <div className="flex items-start gap-2 text-sm text-slate-500 font-bold">
                                    <span className="text-blue-600 font-black">•</span>
                                    <span>الشاحن لا يرى أي معلومات مالية تخص الناقلين أو أي شاحن آخر.</span>
                                </div>
                                <div className="flex items-start gap-2 text-sm text-slate-500 font-bold">
                                    <span className="text-blue-600 font-black">•</span>
                                    <span>الدفع يرسل إشعاراً للإدارة لتأكيد القبض.</span>
                                </div>
                            </div>
                        </Card>
                    </TabsContent>
                </Tabs>

            </div>

            {/* Upload Payment Modal */}
            <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
                <DialogContent className="sm:max-w-md bg-white rounded-[2rem] p-0 overflow-hidden border-none text-right shadow-2xl" dir="rtl">
                    <div className="bg-slate-50 p-6 border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200">
                                <CreditCard size={24} />
                            </div>
                            <div>
                                <DialogTitle className="text-xl font-black">إتمام السداد البنكي</DialogTitle>
                                <DialogDescription className="font-bold text-slate-500 mt-1">يرجى التحويل للحساب أدناه ورفع الإيصال</DialogDescription>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 space-y-6 bg-slate-50/50 backdrop-blur-sm overflow-y-auto max-h-[80vh] md:max-h-[70vh] custom-scrollbar">
                        {/* Bank Details Section */}
                        <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4 shadow-sm">
                            <h4 className="font-black text-slate-800 flex items-center gap-2 border-b pb-3 border-slate-50">
                                <Info size={18} className="text-blue-500" /> بيانات الحساب البنكي لشركة ساس
                            </h4>
                            <div className="grid grid-cols-1 gap-4 text-sm font-bold">
                                <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl">
                                    <span className="text-slate-500">اسم البنك:</span>
                                    <span className="text-slate-900">البنك الأهلي السعودي (SNB)</span>
                                </div>
                                <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl">
                                    <span className="text-slate-500">رقم الحساب:</span>
                                    <span className="text-slate-900 font-black tracking-widest">45200000821510</span>
                                </div>
                                <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl overflow-hidden">
                                    <span className="text-slate-500 shrink-0">IBAN:</span>
                                    <span className="text-slate-900 font-black text-[10px] md:text-sm tracking-tighter truncate ml-2">SA5510000045200000821510</span>
                                </div>
                                <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl text-amber-700">
                                    <p className="text-xs font-black mb-2">⚠️ هام جداً:</p>
                                    <p className="text-[11px] leading-relaxed">يرجى كتابة رقم المرجع أدناه في "وصف الحوالة" بتطبيقك البنكي لسهولة مطابقة الدفعة.</p>
                                    <div className="mt-3 flex items-center justify-between bg-white p-2 rounded-lg border border-amber-200">
                                        <span className="text-[10px] text-slate-400">رقم المرجع:</span>
                                        <span className="font-black text-blue-600 tracking-wider">{paymentReference || 'GENERAL'}</span>
                                    </div>
                                </div>

                                {/* QR Code Tip Section */}
                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-4">
                                    <div className="w-16 h-16 bg-white p-1 rounded-lg border flex items-center justify-center shadow-sm shrink-0">
                                        <img 
                                            src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=SA5510000045200000821510`} 
                                            alt="IBAN QR Code" 
                                            className="w-full h-full object-contain" 
                                        />
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-black text-slate-400 mb-1">مسح سريع للآيبان (IBAN QR)</p>
                                        <p className="text-[11px] text-slate-600 font-bold leading-tight">امسح الكود عبر تطبيقك البنكي لإضافة الآيبان مباشرة وتقليل أخطاء الإدخال.</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 p-3 bg-blue-50/50 rounded-xl border border-blue-100/50">
                                    <Info size={14} className="text-blue-500" />
                                    <p className="text-[10px] font-black text-blue-600">نصيحة للمطور: تم إضافة QR Code يحتوي على بيانات الحساب/الفاتورة.</p>
                                </div>
                            </div>
                        </div>

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
                            <Label className="text-sm font-black text-slate-700">ربط السداد بشحنة محددة *</Label>
                            <Select value={selectedLoadId} onValueChange={setSelectedLoadId}>
                                <SelectTrigger className="h-14 rounded-2xl border-slate-200 font-bold bg-white">
                                    <SelectValue placeholder="اختر الشحنة" />
                                </SelectTrigger>
                                <SelectContent className="bg-white rounded-xl border-slate-200 shadow-xl">
                                    {userLoads.filter(l => l.status === 'completed' || l.status === 'delivered' || l.status === 'in_progress').map((load) => (
                                        <SelectItem key={load.id} value={load.id} className="font-bold">
                                            شحنة #{load.id.substring(0, 8)} ({load.origin} ➔ {load.destination})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {selectedLoadId !== 'general' && loadBalances[selectedLoadId] && (
                                <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 mt-2">
                                    <div className="grid grid-cols-3 gap-2 text-center">
                                        <div>
                                            <p className="text-[10px] text-slate-400 font-bold mb-1">إجمالي الشحنة</p>
                                            <p className="font-black text-sm text-slate-800">{loadBalances[selectedLoadId].total} <span className="text-[8px]">ر.س</span></p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-slate-400 font-bold mb-1">المدفوع</p>
                                            <p className="font-black text-sm text-blue-600">
                                                {(Number(loadBalances[selectedLoadId]?.paid || 0) + Number(paymentAmount || 0)).toLocaleString()} <span className="text-[8px]">ر.س</span>
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-slate-400 font-bold mb-1">المتبقي</p>
                                            <p className="font-black text-sm text-rose-600">
                                                {Math.max(0, Number(loadBalances[selectedLoadId]?.total || 0) - (Number(loadBalances[selectedLoadId]?.paid || 0) + Number(paymentAmount || 0))).toLocaleString()} <span className="text-[8px]">ر.س</span>
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
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

                    <div className="p-4 md:p-6 border-t border-slate-100 flex flex-col sm:flex-row gap-3 bg-white">
                        <div className="flex gap-2 w-full">
                            <Button
                                onClick={handlePayDebt}
                                disabled={isSubmitting || !paymentAmount || !paymentImage}
                                className="flex-1 h-12 md:h-14 rounded-xl font-black bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20 text-sm md:text-base"
                            >
                                {isSubmitting ? <Loader2 size={18} className="animate-spin me-2" /> : <CheckCircle2 size={18} className="me-2" />}
                                إرسال الإثبات
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => setIsPaymentModalOpen(false)}
                                disabled={isSubmitting}
                                className="h-12 md:h-14 px-4 md:px-6 rounded-xl font-bold bg-white text-slate-600 border-slate-200 hover:bg-slate-50 text-sm md:text-base"
                            >
                                إلغاء
                            </Button>
                        </div>
                        <div className="flex gap-2 w-full">
                            <Button onClick={() => window.print()} variant="outline" className="flex-1 h-12 md:h-14 rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50 font-bold gap-1 text-xs md:text-sm">
                                <Printer size={16} /> طباعة
                            </Button>
                            <Button
                                onClick={handleResetAccount}
                                disabled={isResetting}
                                variant="outline"
                                className="flex-1 h-12 md:h-14 rounded-xl border-rose-100 text-rose-500 hover:bg-rose-50 font-bold gap-1 text-xs md:text-sm"
                            >
                                {isResetting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />} تصفية
                            </Button>
                        </div>
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
                                className="max-w-full rounded-2xl shadow-sm border border-slate-200 object-contain max-h-[60vh]"
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
                    <div className="p-6 space-y-4 overflow-y-auto max-h-[60vh] custom-scrollbar">
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

            {/* Hidden Templates for PDF Generation */}
            <ReceiptTemplate data={selectedReceiptData} printRef={receiptRef} />
        </AppLayout>
    );
}
