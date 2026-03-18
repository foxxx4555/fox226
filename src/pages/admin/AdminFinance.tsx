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
    Calendar, Calculator, Printer, RotateCcw, ExternalLink,
    FileSpreadsheet
} from 'lucide-react';
import { api } from '@/services/api';
import { exportToExcel } from '@/lib/exportUtils';
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
    const [processingShipmentId, setProcessingShipmentId] = useState<string | null>(null);

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

    const handleProcessWithdrawal = async (status: 'approved' | 'rejected') => {
        if (!selectedWithdrawal) return;
        
        if (status === 'approved' && (!bankName || !trxNumber || !proofImage)) {
            toast.error("يرجى إدخال اسم البنك، رقم العملية، ورفع إيصال التحويل");
            return;
        }

        if (status === 'rejected' && !trxNumber) { // Using trxNumber field for rejection reason to avoid adding more state
            toast.error("يرجى كتابة سبب الرفض في خانة 'رقم العملية/السبب'");
            return;
        }

        setProcessingWithdrawal(true);
        try {
            let proofUrl = undefined;
            if (proofImage && status === 'approved') {
                proofUrl = await api.uploadImage(proofImage, 'RECEIPTS');
            }

            // Using unified processWithdrawalRequest
            await api.processWithdrawalRequest(
                selectedWithdrawal.id, 
                status, 
                proofUrl, 
                status === 'approved' ? `${bankName} - ${trxNumber}` : trxNumber
            );

            toast.success(status === 'approved' ? "تم اعتماد الحوالة بنجاح ✅" : "تم رفض الطلب وإرجاع المبلغ للمحفظة");
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
        setProcessingShipmentId(shipmentId);
        try {
            await api.approveShipmentEarnings(shipmentId);
            toast.success("تم اعتماد أرباح الناقل وتحويلها للمحفظة 💰");
            fetchFinanceData();
        } catch (error) {
            toast.error("فشل اعتماد الأرباح (تأكد من عدم تكرار العملية)");
        } finally {
            setIsApprovingSettlement(false);
            setProcessingShipmentId(null);
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

    const handleProcessShipperPayment = async (status: 'approved' | 'rejected') => {
        if (!selectedShipperPayment) return;
        
        if (status === 'rejected' && !paymentAdminNotes) {
            toast.error("يرجى كتابة سبب الرفض في خانة الملاحظات");
            return;
        }

        setProcessingPayment(true);
        try {
            await api.processShipperPayment(selectedShipperPayment.id.toString(), status, paymentAdminNotes);
            toast.success(status === 'approved' ? "تم اعتماد الدفعة بنجاح ✅" : "تم رفض الدفعة وإبلاغ الشاحن");
            setIsApprovePaymentModalOpen(false);
            setPaymentAdminNotes('');
            fetchFinanceData();
        } catch (error) {
            toast.error("فشل معالجة الدفعة");
        } finally {
            setProcessingPayment(false);
        }
    };

    const handleExportData = () => {
        if (filteredLedger.length === 0) {
            toast.error("لا توجد بيانات لتصديرها");
            return;
        }

        const exportData = filteredLedger.map(t => ({
            'التاريخ': new Date(t.created_at).toLocaleDateString('ar-SA'),
            'المستفيد': t.wallet?.profiles?.full_name || 'النظام',
            'نوع العملية': t.transaction_type === 'commission' ? 'عمولة منصة' :
                           t.transaction_type === 'withdrawal' ? 'صرف مستحقات ناقل' :
                           t.transaction_type === 'collection' ? 'تحصيل دفعة شاحن' : t.description,
            'المبلغ': t.amount,
            'الاتجاه': t.isIncome ? 'إيداع (+)' : 'سحب (-)',
            'رصيد الصندوق': t.running_balance
        }));

        // Set column widths to 10 as requested (wch: 12 approx 10 chars with some padding)
        const colWidths = [
            { wch: 12 }, // التاريخ
            { wch: 20 }, // المستفيد
            { wch: 25 }, // نوع العملية
            { wch: 10 }, // المبلغ
            { wch: 12 }, // الاتجاه
            { wch: 15 }  // رصيد الصندوق
        ];

        exportToExcel(exportData, `سجل_الدفتر_العام_${new Date().toISOString().split('T')[0]}`, 'كشف الحساب', colWidths);
        toast.success("تم تصدير البيانات بنجاح");
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
            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    #printable-ledger, #printable-ledger * {
                        visibility: visible;
                    }
                    #printable-ledger {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                        display: block !important;
                    }
                    .no-print {
                        display: none !important;
                    }
                    @page {
                        size: landscape;
                        margin: 1cm;
                    }
                    table {
                        width: 100% !important;
                        border: 1px solid #e2e8f0 !important;
                    }
                    th, td {
                        padding: 8px !important;
                        font-size: 10pt !important;
                    }
                    .text-emerald-600 { color: #059669 !important; }
                    .text-rose-600 { color: #e11d48 !important; }
                }
            ` }} />
            <div className="space-y-8 max-w-7xl mx-auto pb-20 p-4" dir="rtl">

                {/* Header */}
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 text-right">
                    <div className="flex items-center gap-4 md:gap-5">
                        <div className="w-12 h-12 md:w-16 md:h-16 bg-slate-900 text-white rounded-2xl md:rounded-[2rem] flex items-center justify-center shadow-2xl shrink-0">
                            <Calculator size={24} className="md:w-8 md:h-8" />
                        </div>
                        <div>
                            <h1 className="text-xl md:text-3xl font-black text-slate-900">دفتر الأستاذ العام</h1>
                            <p className="text-slate-500 font-bold text-xs md:text-base">موائمة السيولة، العمولات، وصافي الأرباح</p>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2 md:gap-3 w-full md:w-auto no-print">
                        <Button 
                            variant="outline" 
                            className="h-10 md:h-12 rounded-xl md:rounded-2xl font-bold border-rose-200 text-rose-600 hover:bg-rose-50 text-xs flex-1 md:flex-none" 
                            onClick={handleMasterReset}
                        >
                            <RotateCcw size={16} className="md:ml-2" /> تصفية الحساب
                        </Button>
                        <Button variant="outline" className="h-10 md:h-12 rounded-xl md:rounded-2xl font-bold border-slate-200 text-xs flex-1 md:flex-none" onClick={() => window.print()}>
                            <Printer size={16} className="md:ml-2" /> طباعة
                        </Button>
                        <Button 
                            className="h-10 md:h-12 rounded-xl md:rounded-2xl bg-blue-600 hover:bg-blue-700 font-bold px-4 md:px-6 text-white shadow-lg text-xs flex-1 md:flex-none"
                            onClick={handleExportData}
                        >
                            <Download size={16} className="md:ml-2" /> تصدير
                        </Button>
                    </div>
                </motion.div>

                {/* KPI Cards Summary */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
                    <Card className="col-span-2 md:col-span-1 border-none bg-gradient-to-br from-blue-600 to-blue-800 text-white overflow-hidden flex flex-col justify-center min-h-[140px] relative px-6 rounded-3xl md:rounded-[2rem] shadow-xl">
                        <div className="relative z-10">
                            <p className="text-blue-100 font-bold text-[10px] md:text-xs uppercase mb-1">صافي أرباح المنصة</p>
                            <h3 className="text-2xl md:text-3xl font-black">{(stats?.totalCommissions || 0).toLocaleString()} <span className="text-sm">ر.س</span></h3>
                            <div className="mt-2 md:mt-4 flex items-center text-[8px] md:text-[10px] text-blue-200 font-bold bg-white/10 w-fit px-3 py-1 rounded-full">
                                <TrendingUp size={12} className="ml-1" /> صافي العمولات
                            </div>
                        </div>
                        <div className="absolute -right-4 -bottom-4 opacity-10 rotate-12"><DollarSign size={100} /></div>
                    </Card>
 
                    <Card className="rounded-3xl md:rounded-[2rem] p-4 md:p-6 border-none shadow-sm bg-white border-r-4 border-emerald-500 flex flex-col justify-center min-h-[140px]">
                        <p className="text-slate-400 font-bold text-[10px] md:text-xs uppercase mb-1">التحصيلات</p>
                        <h3 className="text-xl md:text-2xl font-black text-slate-900 leading-none">
                            {transactions.filter(t => t.isIncome).reduce((sum, t) => sum + t.amount, 0).toLocaleString()} <span className="text-[10px] md:text-sm font-bold text-slate-400">ر.س</span>
                        </h3>
                        <Badge className="mt-2 text-[8px] md:text-[10px] bg-emerald-50 text-emerald-600 border-none font-bold w-fit">إيراد (+)</Badge>
                    </Card>
 
                    <Card className="rounded-3xl md:rounded-[2rem] p-4 md:p-6 border-none shadow-sm bg-white border-r-4 border-rose-500 flex flex-col justify-center min-h-[140px]">
                        <p className="text-slate-400 font-bold text-[10px] md:text-xs uppercase mb-1">المصروفات</p>
                        <h3 className="text-xl md:text-2xl font-black text-slate-900 leading-none">
                            {transactions.filter(t => !t.isIncome).reduce((sum, t) => sum + t.amount, 0).toLocaleString()} <span className="text-[10px] md:text-sm font-bold text-slate-400">ر.س</span>
                        </h3>
                        <Badge className="mt-2 text-[8px] md:text-[10px] bg-rose-50 text-rose-600 border-none font-bold w-fit">مصروف (-)</Badge>
                    </Card>
 
                    <Card className="rounded-3xl md:rounded-[2rem] p-4 md:p-6 border-none shadow-sm bg-white border-r-4 border-amber-500 flex flex-col justify-center min-h-[140px]">
                        <p className="text-slate-400 font-bold text-[10px] md:text-xs uppercase mb-1">سحوبات معلقة</p>
                        <h3 className="text-xl md:text-2xl font-black text-slate-900 leading-none">{withdrawals.filter(w => w.status === 'pending').length} <span className="text-[10px] md:text-sm font-bold text-slate-400">طلب</span></h3>
                        <p className="text-[10px] text-amber-600 font-bold mt-2">قيد المراجعة</p>
                    </Card>
 
                    <Card className="rounded-3xl md:rounded-[2rem] p-4 md:p-6 border-none shadow-sm bg-white border-r-4 border-blue-500 flex flex-col justify-center min-h-[140px]">
                        <p className="text-slate-400 font-bold text-[10px] md:text-xs uppercase mb-1">إيصالات الشاحنين</p>
                        <h3 className="text-xl md:text-2xl font-black text-slate-900 leading-none">
                            {shipperPayments.length} <span className="text-[10px] md:text-sm font-bold text-slate-400">إيصال</span>
                        </h3>
                        <p className="text-[10px] text-blue-600 font-bold mt-2">
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

                <Tabs defaultValue="ledger" className="w-full text-right" dir="rtl">
                    <TabsList className="flex md:grid w-full grid-cols-4 h-14 md:h-16 bg-white p-1.5 md:p-2 rounded-2xl md:rounded-[1.5rem] mb-8 shadow-sm border overflow-x-auto no-scrollbar justify-start md:justify-center">
                        <TabsTrigger value="ledger" className="rounded-xl font-black data-[state=active]:bg-slate-900 data-[state=active]:text-white whitespace-nowrap px-4 text-xs md:text-sm">كشف الحساب</TabsTrigger>
                        <TabsTrigger value="shipper_payments" className="rounded-xl font-black whitespace-nowrap px-4 text-xs md:text-sm">إيصالات الشاحنين</TabsTrigger>
                        <TabsTrigger value="withdrawals" className="rounded-xl font-black whitespace-nowrap px-4 text-xs md:text-sm">طلبات السحب</TabsTrigger>
                        <TabsTrigger value="carrier_settlements" className="rounded-xl font-black whitespace-nowrap px-4 text-xs md:text-sm">تسويات الناقلين</TabsTrigger>
                    </TabsList>

                    {/* Master Ledger */}
                    <TabsContent value="ledger" id="printable-ledger">
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
                                        onClick={() => { 
                                            setSelectedWithdrawal(request); 
                                            setBankName(request.profile?.bank_name || '');
                                            setIsApproveModalOpen(true); 
                                        }}
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
                                            <th className="px-6 py-5 font-black text-blue-600 text-sm italic">رقم المرجع</th>
                                            <th className="px-6 py-5 font-black text-slate-500 text-sm text-center">المبلغ</th>
                                             <th className="px-6 py-5 font-black text-blue-600 text-sm text-center">الرصيد الحالي</th>
                                            <th className="px-6 py-5 font-black text-rose-600 text-sm text-center">المتبقي (المديونية)</th>
                                            <th className="px-6 py-5 font-black text-slate-500 text-sm text-center">الفواتير</th>
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
                                                <td className="px-6 py-5 font-black text-blue-600 text-xs tracking-widest">
                                                    {p.reference_number || '—'}
                                                </td>
                                                <td className="px-6 py-5 text-center font-black text-slate-900">
                                                    {Number(p.amount).toLocaleString()} ر.س
                                                </td>
                                                <td className={`px-6 py-5 text-center font-black ${Number(p.shipper_balance || 0) < 0 ? 'text-rose-600' : 'text-blue-600'}`}>
                                                    {Number(p.shipper_balance || 0).toLocaleString()} ر.س
                                                </td>
                                                <td className="px-6 py-5 text-center font-black text-rose-600">
                                                    {Number(p.remaining_debt || 0).toLocaleString()} ر.س
                                                </td>
                                                <td className="px-6 py-5 text-center">
                                                    {p.invoice_ids && p.invoice_ids.length > 0 ? (
                                                        <div className="flex flex-wrap gap-1 justify-center max-w-[150px]">
                                                            {p.invoice_ids.map((id: string) => (
                                                                <Badge key={id} variant="outline" className="text-[9px] px-1 py-0 font-bold bg-slate-50">
                                                                    #{id.substring(0, 5)}
                                                                </Badge>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-slate-400 font-bold">عام / شحنة واحدة</span>
                                                    )}
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
                                            <th className="p-4">التاريخ</th>
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
                                                <td className="p-4 font-bold text-xs">{new Date(row.recorded_at).toLocaleDateString('ar-SA')}</td>
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
                                                            disabled={isApprovingSettlement && processingShipmentId === row.shipment_id}
                                                        >
                                                            {isApprovingSettlement && processingShipmentId === row.shipment_id ? (
                                                                <><Loader2 size={14} className="animate-spin ml-2" /> جاري الترحيل...</>
                                                            ) : 'اعتماد وترحيل'}
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
                <DialogContent className="sm:max-w-xl bg-white rounded-[2.5rem] p-0 overflow-hidden border-none text-right shadow-2xl" dir="rtl">
                    <div className="bg-slate-900 p-6 md:p-8 text-white relative">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
                        <div className="flex items-center gap-5 relative z-10">
                            <div className="w-16 h-16 bg-white/10 text-white rounded-[1.5rem] flex items-center justify-center backdrop-blur-md border border-white/20">
                                <CreditCard size={32} />
                            </div>
                            <div>
                                <DialogTitle className="text-2xl font-black mb-1">تأكيد التحويل البنكي</DialogTitle>
                                <DialogDescription className="text-white/60 font-bold text-lg">
                                    سيتم صرف <span className="text-emerald-400 font-black">{Number(selectedWithdrawal?.amount).toLocaleString()} ر.س</span> للناقل
                                </DialogDescription>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 md:p-8 space-y-6 md:space-y-8 max-h-[75vh] overflow-y-auto custom-scrollbar">
                        {/* Driver Bank Info Section */}
                        <div className="space-y-4">
                            <h4 className="font-black text-slate-900 flex items-center gap-2 text-sm md:text-base">
                                <div className="w-2 h-5 md:h-6 bg-blue-500 rounded-full"></div>
                                بيانات الحساب البنكي الخاصة بالناقل
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                                <div className="bg-slate-50 p-3 md:p-4 rounded-xl md:rounded-2xl border border-slate-100">
                                    <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase mb-0.5 md:mb-1">اسم البنك</p>
                                    <p className="font-black text-slate-800 text-sm md:text-base">{selectedWithdrawal?.profile?.bank_name || '—'}</p>
                                </div>
                                <div className="bg-slate-50 p-3 md:p-4 rounded-xl md:rounded-2xl border border-slate-100">
                                    <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase mb-0.5 md:mb-1">اسم صاحب الحساب</p>
                                    <p className="font-black text-slate-800 text-sm md:text-base">{selectedWithdrawal?.profile?.account_name || '—'}</p>
                                </div>
                                <div className="bg-slate-50 p-3 md:p-4 rounded-xl md:rounded-2xl border border-slate-100">
                                    <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase mb-0.5 md:mb-1">رقم الحساب</p>
                                    <p className="font-black text-slate-800 text-sm md:text-base">{selectedWithdrawal?.profile?.account_number || '—'}</p>
                                </div>
                                <div className="bg-slate-50 p-3 md:p-4 rounded-xl md:rounded-2xl border border-slate-100">
                                    <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase mb-0.5 md:mb-1">رقم الآيبان (IBAN)</p>
                                    <p className="font-black text-slate-800 text-xs md:text-sm tracking-tighter">{selectedWithdrawal?.profile?.iban || '—'}</p>
                                </div>
                            </div>
                        </div>

                        {/* Payment Details Form */}
                        <div className="space-y-5 md:space-y-6 pt-4 border-t border-slate-100">
                            <h4 className="font-black text-slate-900 flex items-center gap-2 text-sm md:text-base">
                                <div className="w-2 h-5 md:h-6 bg-emerald-500 rounded-full"></div>
                                تفاصيل الحوالة الصادرة
                            </h4>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                                <div className="space-y-1.5 md:space-y-2">
                                    <Label className="font-black text-slate-700 pr-1 text-xs md:text-sm">البنك المحول منه</Label>
                                    <Input 
                                        value={bankName} 
                                        onChange={e => setBankName(e.target.value)} 
                                        className="h-12 md:h-14 rounded-xl md:rounded-2xl bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white transition-all font-bold pr-4 md:pr-5 text-sm" 
                                        placeholder="مثلاً: بنك الراجحي" 
                                    />
                                </div>
                                <div className="space-y-1.5 md:space-y-2">
                                    <Label className="font-black text-slate-700 pr-1 text-xs md:text-sm">رقم المرجع (TRX)</Label>
                                    <Input 
                                        value={trxNumber} 
                                        onChange={e => setTrxNumber(e.target.value)} 
                                        className="h-12 md:h-14 rounded-xl md:rounded-2xl bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white transition-all font-bold pr-4 md:pr-5 text-sm" 
                                        placeholder="أدخل رقم الحوالة" 
                                    />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <Label className="font-black text-slate-700 pr-1 text-xs md:text-sm flex items-center justify-between">
                                    إرفاق إيصال التحويل (إجباري)
                                    {!proofImage && <span className="text-[10px] text-rose-500 font-black animate-pulse">يرجى رفع الإيصال للمتابعة</span>}
                                </Label>
                                <div className="relative group">
                                    <input
                                        type="file"
                                        id="payout-receipt"
                                        className="hidden"
                                        accept="image/*"
                                        onChange={(e) => setProofImage(e.target.files?.[0] || null)}
                                    />
                                    <label
                                        htmlFor="payout-receipt"
                                        className={`flex flex-col items-center justify-center w-full h-28 md:h-32 border-2 border-dashed rounded-2xl md:rounded-[2rem] transition-all cursor-pointer ${
                                            proofImage 
                                            ? 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100/50' 
                                            : 'bg-slate-50 border-slate-200 hover:bg-slate-100 hover:border-blue-300'
                                        }`}
                                    >
                                        {proofImage ? (
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 md:w-12 md:h-12 bg-emerald-100 text-emerald-600 rounded-lg md:rounded-xl flex items-center justify-center">
                                                    <FileText size={20} className="md:w-6 md:h-6" />
                                                </div>
                                                <div>
                                                    <p className="font-black text-slate-800 text-xs md:text-sm max-w-[150px] md:max-w-none truncate">{proofImage.name}</p>
                                                    <p className="text-[9px] md:text-[10px] text-emerald-600 font-bold">تم الرفع بنجاح ✅ (انقر للتغيير)</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="p-2 md:p-3 bg-blue-50 text-blue-500 rounded-xl md:rounded-2xl mb-1 md:mb-2 group-hover:scale-110 transition-transform">
                                                    <ArrowUpRight size={18} className="md:w-5 md:h-5" />
                                                </div>
                                                <p className="font-black text-slate-500 text-xs md:text-sm">اضغط لرفع صورة الإيصال</p>
                                                <p className="text-[9px] md:text-[10px] text-slate-300 font-bold mt-0.5 md:mt-1">PNG, JPG حتى 5MB</p>
                                            </>
                                        )}
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="bg-slate-50 p-4 md:p-6 flex flex-col sm:flex-row gap-3 md:gap-4 border-t border-slate-100" dir="rtl">
                        <Button 
                            onClick={() => handleProcessWithdrawal('approved')} 
                            disabled={processingWithdrawal || !bankName || !trxNumber || !proofImage} 
                            className={`flex-1 h-12 md:h-14 rounded-xl md:rounded-2xl font-black text-base md:text-lg transition-all shadow-lg ${
                                !proofImage ? 'bg-slate-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-100'
                            }`}
                        >
                            {processingWithdrawal ? (
                                <><Loader2 className="animate-spin ml-2" size={18} /> جاري المعالجة...</>
                            ) : !proofImage ? 'يرجى رفع الإيصال' : 'تأكيد الحوالة'}
                        </Button>
                        <Button 
                            variant="outline"
                            onClick={() => handleProcessWithdrawal('rejected')}
                            disabled={processingWithdrawal}
                            className="flex-1 h-12 md:h-14 rounded-xl md:rounded-2xl border-2 border-rose-200 text-rose-600 font-black hover:bg-rose-50 transition-all text-sm md:text-base"
                        >
                            {processingWithdrawal ? <Loader2 className="animate-spin ml-2" /> : 'رفض طلب السحب'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal: مراجعة واعتماد دفعة شاحن (Review Modal) */}
            <Dialog open={isApprovePaymentModalOpen} onOpenChange={setIsApprovePaymentModalOpen}>
                <DialogContent className="sm:max-w-xl bg-white rounded-[2.5rem] p-0 overflow-hidden border-none text-right shadow-2xl" dir="rtl">
                    <div className="bg-slate-900 p-6 md:p-8 text-white relative">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
                        <div className="flex items-center gap-5 relative z-10">
                            <div className="w-16 h-16 bg-white/10 text-white rounded-[1.5rem] flex items-center justify-center backdrop-blur-md border border-white/20">
                                <ShieldCheck size={32} />
                            </div>
                            <div>
                                <DialogTitle className="text-2xl font-black mb-1">نافذة المراجعة (Review Modal)</DialogTitle>
                                <DialogDescription className="text-white/60 font-bold">يرجى التأكد من مطابقة بيانات الحوالة قبل الاعتماد</DialogDescription>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 md:p-8 space-y-4 md:space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                            <div className="bg-slate-50 p-3 md:p-4 rounded-xl md:rounded-2xl border border-slate-100">
                                <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase mb-0.5 md:mb-1">رقم المرجع</p>
                                <p className="font-black text-blue-600 text-base md:text-lg tracking-widest">{selectedShipperPayment?.reference_number || '—'}</p>
                            </div>
                            <div className="bg-slate-50 p-3 md:p-4 rounded-xl md:rounded-2xl border border-slate-100">
                                <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase mb-0.5 md:mb-1">اسم العميل</p>
                                <p className="font-black text-slate-800 text-sm md:text-base">{selectedShipperPayment?.shipper?.full_name || '—'}</p>
                            </div>
                            <div className="bg-slate-50 p-3 md:p-4 rounded-xl md:rounded-2xl border border-slate-100">
                                <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase mb-0.5 md:mb-1">القيمة المطلوبة</p>
                                <p className="font-black text-slate-800 text-base md:text-lg">{Number(selectedShipperPayment?.amount).toLocaleString()} ر.س</p>
                            </div>
                            <div className="bg-slate-50 p-3 md:p-4 rounded-xl md:rounded-2xl border border-slate-100">
                                <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase mb-0.5 md:mb-1">تاريخ الرفع</p>
                                <p className="font-black text-slate-800 text-xs md:text-sm">
                                    {selectedShipperPayment?.created_at ? new Date(selectedShipperPayment.created_at).toLocaleString('ar-SA') : '—'}
                                </p>
                            </div>
                        </div>

                        {/* Receipt Preview */}
                        <div className="space-y-3">
                            <Label className="font-black text-slate-700 text-sm md:text-base">مرفق الإيصال (قابلة للتكبير)</Label>
                            <div className="relative group rounded-3xl overflow-hidden border-2 border-slate-100 aspect-video bg-slate-50 flex items-center justify-center">
                                {(selectedShipperPayment?.proof_image_url || selectedShipperPayment?.proof_url) ? (
                                    <button 
                                        onClick={() => window.open(selectedShipperPayment.proof_image_url || selectedShipperPayment.proof_url, '_blank')}
                                        className="w-full h-full p-0 border-none bg-transparent cursor-zoom-in"
                                    >
                                        <img 
                                            src={selectedShipperPayment.proof_image_url || selectedShipperPayment.proof_url} 
                                            alt="Receipt Proof" 
                                            className="w-full h-full object-contain hover:scale-105 transition-transform duration-500" 
                                        />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <div className="bg-white/20 backdrop-blur-md p-3 rounded-full text-white">
                                                <Search size={24} />
                                            </div>
                                        </div>
                                    </button>
                                ) : (
                                    <p className="text-slate-400 font-bold">لا يوجد إيصال مرفوع</p>
                                )}
                            </div>
                        </div>

                        {/* Rejection/Notes Reason */}
                        <div className="space-y-3 mt-4 md:mt-6">
                            <Label className="font-black text-slate-700 text-sm md:text-base">ملاحظات الإدارة / سبب الرفض</Label>
                            <Input
                                value={paymentAdminNotes}
                                onChange={e => setPaymentAdminNotes(e.target.value)}
                                className="h-12 md:h-14 rounded-xl md:rounded-2xl bg-slate-50 font-bold focus:ring-blue-500 border-slate-200 text-sm"
                                placeholder="اكتب السبب هنا في حال الرفض"
                            />
                        </div>
                    </div>

                    <DialogFooter className="bg-slate-50 p-4 md:p-6 flex flex-col sm:flex-row gap-3 md:gap-4 border-t border-slate-100" dir="rtl">
                        <Button 
                            onClick={() => handleProcessShipperPayment('approved')}
                            disabled={processingPayment}
                            className="flex-1 h-12 md:h-14 rounded-xl md:rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-base md:text-lg shadow-xl shadow-emerald-100"
                        >
                            {processingPayment ? <Loader2 className="animate-spin ml-2" /> : <><CheckCircle2 size={20} className="ml-2" /> تأكيد الاستلام</>}
                        </Button>
                        <Button 
                            variant="outline"
                            onClick={() => handleProcessShipperPayment('rejected')}
                            disabled={processingPayment}
                            className="flex-1 h-12 md:h-14 rounded-xl md:rounded-2xl border-2 border-rose-200 text-rose-600 hover:bg-rose-50 font-black text-base md:text-lg"
                        >
                            {processingPayment ? <Loader2 className="animate-spin ml-2" /> : <><RotateCcw className="ml-2" size={18} /> رفض الطلب</>}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </AdminLayout>
    );
}