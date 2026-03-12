import { useState, useEffect, useMemo, useRef } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Search, Download, TrendingUp, DollarSign, CreditCard,
    ArrowUpRight, ArrowDownRight, FileText, CheckCircle2,
    Clock, Loader2, Pencil, History, ShieldCheck,
    Calendar, Calculator, Printer, RotateCcw, ExternalLink
} from 'lucide-react';
import { api } from '@/services/api';
import { AdminStats } from '@/types';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { motion } from 'framer-motion';
import { ShipmentLink } from '@/components/utils/ShipmentLink';

export default function AdminFinance() {
    const { userProfile } = useAuth();
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    // Data States
    const [transactions, setTransactions] = useState<any[]>([]);
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [chartData, setChartData] = useState<any[]>([]);
    const [withdrawals, setWithdrawals] = useState<any[]>([]);
    const [shipperPayments, setShipperPayments] = useState<any[]>([]);
    const [carrierEarningsLedger, setCarrierEarningsLedger] = useState<any[]>([]);

    // Modals State
    const [selectedWithdrawal, setSelectedWithdrawal] = useState<any | null>(null);
    const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
    const [bankName, setBankName] = useState('');
    const [trxNumber, setTrxNumber] = useState('');
    const [proofImage, setProofImage] = useState<File | null>(null);
    const [processingWithdrawal, setProcessingWithdrawal] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [selectedShipperPayment, setSelectedShipperPayment] = useState<any | null>(null);
    const [isApprovePaymentModalOpen, setIsApprovePaymentModalOpen] = useState(false);
    const [paymentAdminNotes, setPaymentAdminNotes] = useState('');
    const [processingPayment, setProcessingPayment] = useState(false);
    const [isApprovingSettlement, setIsApprovingSettlement] = useState(false);

    const fetchFinanceData = async () => {
        try {
            setLoading(true);
            const [trxData, statsData, chartRawData, withdrawalsData, shipperPaymentsData, carrierLedgerData] = await Promise.all([
                api.getAllTransactions(),
                api.getAdminStats(),
                api.getFinancialChartData(),
                api.getWithdrawalRequests(),
                api.getPendingShipperPayments(),
                api.getCarrierEarningsLedger()
            ]);

            // --- إصلاح منطق كشف الحساب (Ledger Logic) ---
            const sortedTrx = (trxData || []).sort((a: any, b: any) =>
                new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            );

            let cumulativeBalance = 0;
            const ledgerMapped = sortedTrx.map((t: any) => {
                const amount = Number(t.amount);

                // الإيراد (Income): أي مبالغ تدخل الصندوق (+)
                // تشمل: عمولة المنصة، الإيداعات، وتحصيل دفعات الشحنات من الشاحنين
                const isIncome = ['commission', 'deposit', 'collection', 'payment'].includes(t.transaction_type) || 
                                 t.description?.includes('رسوم شحنة') || 
                                 t.description?.includes('تحصيل');

                if (isIncome) {
                    cumulativeBalance += amount;
                } else {
                    cumulativeBalance -= amount;
                }

                return {
                    ...t,
                    isIncome,
                    amount: Math.abs(amount), // عرض القيمة المطلقة في خانة الإيراد/المصروف
                    running_balance: cumulativeBalance,
                };
            }).reverse();

            setTransactions(ledgerMapped);
            setStats(statsData);
            setChartData(chartRawData);
            setWithdrawals(withdrawalsData || []);
            setShipperPayments(shipperPaymentsData || []);
            setCarrierEarningsLedger(carrierLedgerData || []);
        } catch (error) {
            console.error("Finance Data Error:", error);
            toast.error("فشل تحميل البيانات المالية");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchFinanceData(); }, []);

    const handleApproveWithdrawal = async () => {
        if (!selectedWithdrawal) return;
        if (!bankName || !trxNumber) {
            toast.error("يرجى إدخال اسم البنك ورقم العملية (TRX)");
            return;
        }

        setProcessingWithdrawal(true);
        try {
            let proofUrl = undefined;
            if (proofImage) {
                proofUrl = await api.uploadImage(proofImage, 'RECEIPTS');
            }

            await api.completeWithdrawalRequest(selectedWithdrawal.id, bankName, trxNumber, proofUrl);
            toast.success("تم اعتماد الحوالة بنجاح ✅");
            setIsApproveModalOpen(false);
            setProofImage(null);
            setBankName('');
            setTrxNumber('');
            fetchFinanceData();
        } catch (error) {
            toast.error("فشل معالجة طلب السحب");
        } finally {
            setProcessingWithdrawal(false);
        }
    };

    const handleApproveSettlement = async (shipmentId: string) => {
        setIsApprovingSettlement(true);
        try {
            await api.approveShipmentEarnings(shipmentId);
            toast.success("تم اعتماد أرباح الناقل وتحويلها للمحفظة 💰");
            fetchFinanceData();
        } catch (error) {
            toast.error("فشل اعتماد الأرباح (تأكد من عدم تكرار العملية)");
        } finally {
            setIsApprovingSettlement(false);
        }
    };

    const handleMasterReset = async () => {
        if (!window.confirm("تحذير حرج: سيؤدي هذا الإجراء إلى مسح كافة الشحنات، العمليات المالية، والتحصيلات وتصفير أرصدة المحافظ بالكامل. لا يمكن التراجع عن هذا الإجراء. هل أنت متأكد؟")) return;
        
        setLoading(true);
        try {
            await api.masterReset();
            toast.success("تم تصفية النظام بالكامل بنجاح 🧹");
            fetchFinanceData();
        } catch (error) {
            console.error(error);
            toast.error("حدث خطأ أثناء تصفية النظام");
        } finally {
            setLoading(false);
        }
    };

    const handleApproveShipperPayment = async () => {
        if (!selectedShipperPayment) return;
        setProcessingPayment(true);
        try {
            await api.processShipperPayment(selectedShipperPayment.id.toString(), 'approved', paymentAdminNotes);
            toast.success("تم اعتماد الدفعة بنجاح ✅");
            setIsApprovePaymentModalOpen(false);
            fetchFinanceData();
        } catch (error) {
            toast.error("فشل اعتماد الدفعة");
        } finally {
            setProcessingPayment(false);
        }
    };

    const filteredLedger = useMemo(() => {
        return transactions.filter(t => {
            const matchesSearch = (t.profiles?.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (t.shipment_id?.includes(searchQuery) || false);
            const matchesDateFrom = dateFrom ? new Date(t.created_at) >= new Date(dateFrom) : true;
            const matchesDateTo = dateTo ? new Date(t.created_at) <= new Date(dateTo) : true;
            return matchesSearch && matchesDateFrom && matchesDateTo;
        });
    }, [transactions, searchQuery, dateFrom, dateTo]);

    if (loading) return <AdminLayout><div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /></div></AdminLayout>;

    return (
        <AdminLayout>
            <div className="space-y-8 max-w-7xl mx-auto pb-20 p-4" dir="rtl">

                {/* Header */}
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-right">
                    <div className="flex items-center gap-5">
                        <div className="w-16 h-16 bg-slate-900 text-white rounded-[2rem] flex items-center justify-center shadow-2xl">
                            <Calculator size={32} />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-slate-900">دفتر الأستاذ العام</h1>
                            <p className="text-slate-500 font-bold">مراقبة السيولة، العمولات، وصافي أرباح المنصة</p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <Button 
                            variant="outline" 
                            className="h-12 rounded-2xl font-bold border-rose-200 text-rose-600 hover:bg-rose-50" 
                            onClick={handleMasterReset}
                        >
                            <RotateCcw size={18} className="ml-2" /> تصفية الحساب العام
                        </Button>
                        <Button variant="outline" className="h-12 rounded-2xl font-bold border-slate-200" onClick={() => window.print()}>
                            <Printer size={18} className="ml-2" /> طباعة التقارير
                        </Button>
                        <Button className="h-12 rounded-2xl bg-blue-600 hover:bg-blue-700 font-bold px-6 text-white shadow-lg">
                            <Download size={18} className="ml-2" /> تصدير Excel
                        </Button>
                    </div>
                </motion.div>

                {/* KPI Cards Summary */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    <Card className="rounded-[2rem] p-6 border-none shadow-xl bg-gradient-to-br from-blue-600 to-blue-800 text-white">
                        <p className="text-blue-100 font-bold text-xs uppercase mb-1">صافي أرباح المنصة</p>
                        <h3 className="text-3xl font-black">{(stats?.totalCommissions || 0).toLocaleString()} <span className="text-sm">ر.س</span></h3>
                        <div className="mt-4 flex items-center text-[10px] text-blue-200 font-bold bg-white/10 w-fit px-3 py-1 rounded-full">
                            <TrendingUp size={12} className="ml-1" /> صافي العمولات
                        </div>
                    </Card>

                    <Card className="rounded-[2rem] p-6 border-none shadow-sm bg-white border-r-4 border-emerald-500">
                        <p className="text-slate-400 font-bold text-xs uppercase mb-1">إجمالي التحصيلات (إيراد)</p>
                        <h3 className="text-2xl font-black text-slate-900">
                            {transactions.filter(t => t.isIncome).reduce((sum, t) => sum + t.amount, 0).toLocaleString()} <span className="text-sm font-bold text-slate-400">ر.س</span>
                        </h3>
                        <Badge className="mt-2 bg-emerald-50 text-emerald-600 border-none font-bold">داخل للمنصة (+)</Badge>
                    </Card>

                    <Card className="rounded-[2rem] p-6 border-none shadow-sm bg-white border-r-4 border-rose-500">
                        <p className="text-slate-400 font-bold text-xs uppercase mb-1">إجمالي المصروفات</p>
                        <h3 className="text-2xl font-black text-slate-900">
                            {transactions.filter(t => !t.isIncome).reduce((sum, t) => sum + t.amount, 0).toLocaleString()} <span className="text-sm font-bold text-slate-400">ر.س</span>
                        </h3>
                        <Badge className="mt-2 bg-rose-50 text-rose-600 border-none font-bold">خارج من المنصة (-)</Badge>
                    </Card>

                    <Card className="rounded-[2rem] p-6 border-none shadow-sm bg-white border-r-4 border-amber-500">
                        <p className="text-slate-400 font-bold text-xs uppercase mb-1">سحوبات معلقة</p>
                        <h3 className="text-2xl font-black text-slate-900">{withdrawals.filter(w => w.status === 'pending').length} <span className="text-sm font-bold text-slate-400">طلب</span></h3>
                        <p className="text-xs text-amber-600 font-bold mt-2">قيد المراجعة</p>
                    </Card>

                    <Card className="rounded-[2rem] p-6 border-none shadow-sm bg-white border-r-4 border-blue-500">
                        <p className="text-slate-400 font-bold text-xs uppercase mb-1">إيصالات الشاحنين</p>
                        <h3 className="text-2xl font-black text-slate-900">
                            {shipperPayments.length} <span className="text-sm font-bold text-slate-400">إيصال</span>
                        </h3>
                        <p className="text-xs text-blue-600 font-bold mt-2">
                             {shipperPayments.filter(p => p.status === 'pending').length} قيد المراجعة
                        </p>
                    </Card>
                </div>

                {/* Filters */}
                <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 grid grid-cols-1 md:grid-cols-4 gap-3 items-center">
                    <div className="relative md:col-span-2">
                        <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <Input
                            placeholder="البحث برقم الشحنة أو اسم العميل..."
                            className="h-11 pr-11 border-none bg-slate-50 rounded-xl font-bold text-right"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-11 bg-slate-50 border-none rounded-xl font-bold text-xs" />
                    <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-11 bg-slate-50 border-none rounded-xl font-bold text-xs" />
                </div>

                <Tabs defaultValue="ledger" className="w-full text-right">
                    <TabsList className="grid w-full grid-cols-4 h-16 bg-white p-2 rounded-[1.5rem] mb-8 shadow-sm border">
                        <TabsTrigger value="ledger" className="rounded-xl font-black data-[state=active]:bg-slate-900 data-[state=active]:text-white">كشف الحساب العام</TabsTrigger>
                        <TabsTrigger value="withdrawals" className="rounded-xl font-black">طلبات السحب</TabsTrigger>
                        <TabsTrigger value="shipper_payments" className="rounded-xl font-black">إيصالات الشاحنين</TabsTrigger>
                        <TabsTrigger value="carrier_settlements" className="rounded-xl font-black">تسويات الناقلين</TabsTrigger>
                    </TabsList>

                    {/* Master Ledger */}
                    <TabsContent value="ledger">
                        <Card className="rounded-[2.5rem] border-none shadow-2xl bg-white overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-right border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-100">
                                            <th className="px-6 py-5 font-black text-slate-500 text-sm">التاريخ / الشحنة</th>
                                            <th className="px-6 py-5 font-black text-slate-500 text-sm">المستفيد</th>
                                            <th className="px-6 py-5 font-black text-slate-500 text-sm">نوع العملية</th>
                                            <th className="px-6 py-5 font-black text-emerald-600 text-sm text-center">إيراد (+)</th>
                                            <th className="px-6 py-5 font-black text-rose-600 text-sm text-center">مصروف (-)</th>
                                            <th className="px-6 py-5 font-black text-slate-900 text-sm text-center">رصيد الصندوق</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {filteredLedger.map((trx, index) => (
                                            <tr key={trx.id || index} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-6 py-5">
                                                    <p className="font-bold text-slate-700 text-sm">{new Date(trx.created_at).toLocaleDateString('ar-SA')}</p>
                                                    {trx.shipment_id && (
                                                        <ShipmentLink id={trx.shipment_id} className="mt-1" />
                                                    )}
                                                </td>
                                                <td className="px-6 py-5">
                                                    <div className="font-bold text-slate-800">
                                                        {trx.wallet?.profiles?.full_name || 'النظام'}
                                                    </div>
                                                    <div className="text-[10px] text-slate-400 font-bold uppercase">
                                                        {trx.wallet?.user_type === 'carrier' || trx.wallet?.profiles?.role === 'driver' || trx.description?.includes('أرباح') ? 'ناقل (مستفيد)' : 
                                                         trx.wallet?.user_type === 'shipper' || trx.wallet?.profiles?.role === 'shipper' || trx.description?.includes('رسوم') || trx.description?.includes('تحصيل') ? 'شاحن (دافع)' : 
                                                         'إدارة'}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <div className="flex items-center gap-2">
                                                        <div className={`w-2 h-2 rounded-full ${trx.isIncome ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                                                        <span className="font-bold text-slate-600 text-xs">
                                                            {trx.transaction_type === 'commission' ? 'عمولة منصة' :
                                                                trx.transaction_type === 'withdrawal' ? 'صرف مستحقات ناقل' :
                                                                    trx.transaction_type === 'collection' ? 'تحصيل دفعة شاحن' : trx.description}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5 text-center font-black text-emerald-600">
                                                    {trx.isIncome ? `+${trx.amount.toLocaleString()}` : '—'}
                                                </td>
                                                <td className="px-6 py-5 text-center font-black text-rose-600">
                                                    {!trx.isIncome ? `-${trx.amount.toLocaleString()}` : '—'}
                                                </td>
                                                <td className="px-6 py-5 text-center">
                                                    <span className="font-black text-slate-900 text-sm">{trx.running_balance.toLocaleString()} ر.س</span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    </TabsContent>

                    {/* طلبات السحب */}
                    <TabsContent value="withdrawals">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {withdrawals.filter(w => w.status === 'pending').map((request, index) => (
                                <Card key={request.id || index} className="rounded-[2rem] p-6 border-none shadow-xl bg-white">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl"><DollarSign /></div>
                                        <Badge className="bg-amber-100 text-amber-700 border-none font-bold">بانتظار التحويل</Badge>
                                    </div>
                                    <h4 className="font-black text-lg text-slate-800">{request.profile?.full_name}</h4>
                                    <p className="text-xs text-slate-400 font-bold mb-4">IBAN: {request.profile?.iban || 'غير مسجل'}</p>
                                    <div className="bg-slate-50 p-4 rounded-2xl mb-6">
                                        <p className="text-[10px] font-bold text-slate-400 text-right uppercase">المبلغ المطلوب</p>
                                        <h3 className="text-3xl font-black text-slate-900 text-right">{Number(request.amount).toLocaleString()} <span className="text-sm">ر.س</span></h3>
                                    </div>
                                    <Button
                                        className="w-full h-12 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold"
                                        onClick={() => { setSelectedWithdrawal(request); setIsApproveModalOpen(true); }}
                                    >
                                        تحويل الآن <ArrowUpRight className="mr-2" size={16} />
                                    </Button>
                                </Card>
                            ))}
                        </div>
                    </TabsContent>

                    {/* إيصالات الشاحنين */}
                    <TabsContent value="shipper_payments">
                        <Card className="rounded-[2.5rem] border-none shadow-2xl bg-white overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-right border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-100">
                                            <th className="px-6 py-5 font-black text-slate-500 text-sm">التاريخ</th>
                                            <th className="px-6 py-5 font-black text-slate-500 text-sm">الشاحن</th>
                                            <th className="px-6 py-5 font-black text-slate-500 text-sm text-center">المبلغ</th>
                                            <th className="px-6 py-5 font-black text-blue-600 text-sm text-center">الرصيد المتاح</th>
                                            <th className="px-6 py-5 font-black text-rose-600 text-sm text-center">المتبقي (المديونية)</th>
                                            <th className="px-6 py-5 font-black text-slate-500 text-sm text-center">الحالة</th>
                                            <th className="px-6 py-5 font-black text-slate-500 text-sm text-center">الإجراء</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {shipperPayments.map((p, idx) => (
                                            <tr key={p.id || idx} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-6 py-5">
                                                    <p className="font-bold text-slate-700 text-sm">{new Date(p.created_at).toLocaleDateString('ar-SA')}</p>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <div className="font-bold text-slate-800">{p.shipper?.full_name}</div>
                                                    <div className="text-xs text-slate-400 font-bold">{p.shipper?.phone}</div>
                                                </td>
                                                <td className="px-6 py-5 text-center font-black text-slate-900">
                                                    {Number(p.amount).toLocaleString()} ر.س
                                                </td>
                                                <td className="px-6 py-5 text-center font-black text-blue-600">
                                                    {Number(p.shipper_balance || 0).toLocaleString()} ر.س
                                                </td>
                                                <td className="px-6 py-5 text-center font-black text-rose-600">
                                                    {Number(p.remaining_debt || 0).toLocaleString()} ر.س
                                                </td>
                                                <td className="px-6 py-5 text-center">
                                                    <Badge className={`rounded-lg px-3 py-1 font-black ${
                                                        p.status === 'approved' ? 'bg-emerald-50 text-emerald-600' :
                                                        p.status === 'rejected' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'
                                                    }`}>
                                                        {p.status === 'approved' ? 'مقبول' : p.status === 'rejected' ? 'مرفوض' : 'قيد المراجعة'}
                                                    </Badge>
                                                </td>
                                                <td className="px-6 py-5 text-center">
                                                    <div className="flex justify-center gap-2">
                                                        {(p.proof_url || p.proof_image_url) && (
                                                            <Button 
                                                                variant="ghost" 
                                                                size="icon" 
                                                                className="rounded-full bg-blue-50 text-blue-600" 
                                                                onClick={() => window.open(p.proof_url || p.proof_image_url, '_blank')}
                                                                title="عرض الإيصال"
                                                            >
                                                                <FileText size={16} />
                                                            </Button>
                                                        )}
                                                        {p.status === 'pending' && (
                                                            <Button variant="ghost" size="icon" className="rounded-full bg-emerald-50 text-emerald-600" onClick={() => { setSelectedShipperPayment(p); setIsApprovePaymentModalOpen(true); }}>
                                                                <CheckCircle2 size={16} />
                                                            </Button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    </TabsContent>

                    {/* تسويات الناقلين (إصلاح مشكلة التكرار) */}
                    <TabsContent value="carrier_settlements">
                        <Card className="rounded-[2.5rem] p-2 shadow-xl border-none bg-white">
                            <div className="overflow-x-auto">
                                <table className="w-full text-right">
                                    <thead>
                                        <tr className="bg-slate-50 text-slate-400 text-xs font-black border-b">
                                            <th className="p-4">الشحنة</th>
                                            <th className="p-4">الناقل</th>
                                            <th className="p-4 text-center">إجمالي الشحنة</th>
                                            <th className="p-4 text-center text-rose-500">العمولة (10%)</th>
                                            <th className="p-4 text-center text-emerald-600">صافي الناقل</th>
                                            <th className="p-4 text-center">الإجراء</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {carrierEarningsLedger.map((row, index) => (
                                            <tr key={row.shipment_id || index} className="border-b hover:bg-slate-50">
                                                <td className="p-4 font-black text-xs">
                                                    <ShipmentLink id={row.shipment_id} />
                                                </td>
                                                <td className="p-4 font-bold text-sm">{row.carrier_name}</td>
                                                <td className="p-4 text-center font-bold">{Number(row.total_amount).toLocaleString()} ر.س</td>
                                                <td className="p-4 text-center font-black text-rose-600">{Number(row.commission_amount).toLocaleString()} ر.س</td>
                                                <td className="p-4 text-center font-black text-emerald-600">{Number(row.net_amount).toLocaleString()} ر.س</td>
                                                <td className="p-4 text-center">
                                                    {row.display_status === 'pending_approval' ? (
                                                        <Button
                                                            size="sm"
                                                            className="bg-amber-500 text-white rounded-lg font-bold hover:bg-amber-600"
                                                            onClick={() => handleApproveSettlement(row.shipment_id)}
                                                            disabled={isApprovingSettlement}
                                                        >
                                                            {isApprovingSettlement ? <Loader2 size={14} className="animate-spin" /> : 'اعتماد وترحيل'}
                                                        </Button>
                                                    ) : (
                                                        <Badge className="bg-emerald-50 text-emerald-600 border-none font-bold">مرحّلة للمحفظة ✅</Badge>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>

            {/* Modals - Same logic but with RTL and improved UI */}
            <Dialog open={isApproveModalOpen} onOpenChange={setIsApproveModalOpen}>
                <DialogContent className="sm:max-w-md bg-white rounded-[2rem] p-0 overflow-hidden border-none text-right" dir="rtl">
                    <div className="bg-slate-50 p-6 border-b flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center"><CreditCard /></div>
                        <div>
                            <DialogTitle className="text-xl font-black">تأكيد تحويل بنكي</DialogTitle>
                            <DialogDescription className="font-bold">سيتم صرف {selectedWithdrawal?.amount} ر.س للناقل</DialogDescription>
                        </div>
                    </div>
                    <div className="p-6 space-y-4 text-right">
                        <div className="space-y-2">
                            <Label className="font-black text-slate-700">البنك المحول منه</Label>
                            <Input value={bankName} onChange={e => setBankName(e.target.value)} className="h-12 rounded-xl bg-slate-50 font-bold" placeholder="مثلاً: بنك الراجحي" />
                        </div>
                        <div className="space-y-2">
                            <Label className="font-black text-slate-700">رقم المرجع (TRX)</Label>
                            <Input value={trxNumber} onChange={e => setTrxNumber(e.target.value)} className="h-12 rounded-xl bg-slate-50 font-bold" placeholder="أدخل رقم الحوالة" />
                        </div>
                    </div>
                    <DialogFooter className="bg-slate-50 p-6 flex-row-reverse gap-3">
                        <Button onClick={handleApproveWithdrawal} disabled={processingWithdrawal} className="flex-1 h-12 rounded-xl bg-blue-600 text-white font-black">تأكيد الصرف</Button>
                        <Button variant="outline" onClick={() => setIsApproveModalOpen(false)} className="h-12 rounded-xl font-bold">إلغاء</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal: اعتماد دفعة شاحن */}
            <Dialog open={isApprovePaymentModalOpen} onOpenChange={setIsApprovePaymentModalOpen}>
                <DialogContent className="sm:max-w-md bg-white rounded-[2rem] p-0 overflow-hidden border-none text-right" dir="rtl">
                    <div className="bg-slate-50 p-6 border-b flex items-center gap-4">
                        <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center"><ShieldCheck /></div>
                        <div>
                            <DialogTitle className="text-xl font-black">اعتماد إيصال سداد</DialogTitle>
                            <DialogDescription className="font-bold">سيتم إضافة {Number(selectedShipperPayment?.amount).toLocaleString()} ر.س لمحفظة الشاحن</DialogDescription>
                        </div>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="space-y-2">
                            <Label className="font-black text-slate-700">ملاحظات الإدارة (اختياري)</Label>
                            <Input
                                value={paymentAdminNotes}
                                onChange={e => setPaymentAdminNotes(e.target.value)}
                                className="h-20 rounded-xl bg-slate-50 font-bold"
                                placeholder="..."
                            />
                        </div>
                        {selectedShipperPayment?.proof_url && (
                            <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                                <p className="text-xs font-black text-blue-700 mb-2">رابط الإيصال المرفوع:</p>
                                <a href={selectedShipperPayment.proof_url} target="_blank" className="text-xs text-blue-600 underline break-all font-bold">
                                    {selectedShipperPayment.proof_url}
                                </a>
                            </div>
                        )}
                    </div>
                    <DialogFooter className="bg-slate-50 p-6 flex-row-reverse gap-3">
                        <Button onClick={handleApproveShipperPayment} disabled={processingPayment} className="flex-1 h-12 rounded-xl bg-emerald-600 text-white font-black">
                            {processingPayment ? <Loader2 size={18} className="animate-spin" /> : 'اعتماد الدفعة ماليًا'}
                        </Button>
                        <Button variant="outline" onClick={() => setIsApprovePaymentModalOpen(false)} className="h-12 rounded-xl font-bold">إلغاء</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </AdminLayout>
    );
}