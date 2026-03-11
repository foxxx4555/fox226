import { useState, useEffect } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Download, TrendingUp, DollarSign, CreditCard, ArrowUpRight, ArrowDownRight, FileText, CheckCircle2, Clock, Loader2, Pencil, Settings, History, ShieldCheck, Package } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { api } from '@/services/api';
import { supabase } from '@/integrations/supabase/client';
import { AdminStats } from '@/types';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useAuth } from '@/hooks/useAuth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { useRef } from 'react';
import { formatShortId } from '@/lib/formatters';
// بيانات تاريخية لتمثيل المخطط البياني (يمكن ربطها مستقبلاً بقاعدة البيانات)
const revenueData = [
    { name: '1 أكتوبر', revenue: 15400, expected: 12000 },
    { name: '5 أكتوبر', revenue: 18900, expected: 15000 },
    { name: '10 أكتوبر', revenue: 12800, expected: 14000 },
    { name: '15 أكتوبر', revenue: 24700, expected: 18000 },
    { name: '20 أكتوبر', revenue: 21000, expected: 20000 },
    { name: '25 أكتوبر', revenue: 28900, expected: 25000 },
    { name: '30 أكتوبر', revenue: 34500, expected: 28000 },
];

export default function AdminFinance() {
    const { userProfile } = useAuth();
    const [searchQuery, setSearchQuery] = useState('');
    const [transactions, setTransactions] = useState<any[]>([]);
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [chartData, setChartData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // New State for Withdrawals
    const [withdrawals, setWithdrawals] = useState<any[]>([]);
    const [selectedWithdrawal, setSelectedWithdrawal] = useState<any | null>(null);
    const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
    const [proofImage, setProofImage] = useState<File | null>(null);
    const [adminNotes, setAdminNotes] = useState('');
    const [processingWithdrawal, setProcessingWithdrawal] = useState(false);
    // New State for Shipper Payments
    const [shipperPayments, setShipperPayments] = useState<any[]>([]);
    const [selectedShipperPayment, setSelectedShipperPayment] = useState<any | null>(null);
    const [isApprovePaymentModalOpen, setIsApprovePaymentModalOpen] = useState(false);
    const [paymentAdminNotes, setPaymentAdminNotes] = useState('');
    const [processingPayment, setProcessingPayment] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // حالات تعديل المعاملات
    const [isEditTransactionModalOpen, setIsEditTransactionModalOpen] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState<any>(null);
    const [editForm, setEditForm] = useState({ amount: 0, type: '', status: '' });
    const [isUpdating, setIsUpdating] = useState(false);

    // New State for Integrated Features
    const [invoices, setInvoices] = useState<any[]>([]);
    const [auditLogs, setAuditLogs] = useState<any[]>([]);
    const [financialSettings, setFinancialSettings] = useState<any[]>([]);
    const [isSavingSetting, setIsSavingSetting] = useState(false);

    const [isApprovingSettlement, setIsApprovingSettlement] = useState(false);
    
    // Financial Ledger State
    const [financialLedger, setFinancialLedger] = useState<any[]>([]);
    const [carrierEarningsLedger, setCarrierEarningsLedger] = useState<any[]>([]);
    const [isAddingPayment, setIsAddingPayment] = useState(false);
    const [paymentForm, setPaymentForm] = useState({ shipmentId: '', amount: '', notes: '', method: 'bank_transfer' });
    const [manualPaymentImage, setManualPaymentImage] = useState<File | null>(null);
    const manualPaymentFileRef = useRef<HTMLInputElement>(null);

    // Payout Receipt details
    const [bankName, setBankName] = useState('');
    const [trxNumber, setTrxNumber] = useState('');

    // دالة إنشاء وإصدار تقرير الـ PDF باستخدام التقاط واجهة المستخدم
    const generatePDF = async () => {
        const input = document.getElementById('finance-report-content');
        if (!input) {
            toast.error("حدث خطأ أثناء تحديد محتوى التقرير");
            return;
        }

        try {
            toast.loading("يتم الآن تجهيز التقرير...", { id: 'pdf-toast' });

            // تحويل الـ div لصورة عشان نتفادى مشاكل الخط العربي
            const canvas = await html2canvas(input, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff'
            });
            const imgData = canvas.toDataURL('image/png');

            // نحسب أبعاد الـ PDF لتناسب الصورة
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

            // إضافة الصورة للـ PDF (التقرير بالكامل)
            pdf.addImage(imgData, 'PNG', 0, 10, pdfWidth, pdfHeight);
            pdf.save(`finance_report_${new Date().getTime()}.pdf`);

            toast.success("تم تشكيل وتنزيل التقرير المالي بنجاح", { id: 'pdf-toast' });
        } catch (error) {
            console.error("Error generating PDF:", error);
            toast.error("فشل تصدير التقرير", { id: 'pdf-toast' });
        }
    };

    const fetchFinanceData = async () => {
        try {
            const [trxData, statsData, chartRawData, withdrawalsData, shipperPaymentsData, invoicesData, auditLogsData, settingsData, ledgerData, carrierLedgerData] = await Promise.all([
                api.getAllTransactions(),
                api.getAdminStats(),
                api.getFinancialChartData(),
                api.getWithdrawalRequests(),
                api.getPendingShipperPayments(),
                api.getInvoices(),
                api.getAuditLogs(50),
                api.getFinancialSettings(),
                api.getFinancialLedger(),
                api.getCarrierEarningsLedger()
            ]);
            setTransactions(trxData || []);
            setStats(statsData);
            setChartData(chartRawData);
            setWithdrawals(withdrawalsData || []);
            setShipperPayments(shipperPaymentsData || []);
            setInvoices(invoicesData || []);
            setAuditLogs(auditLogsData || []);
            setFinancialSettings(settingsData || []);
            setFinancialLedger(ledgerData || []);
            setCarrierEarningsLedger(carrierLedgerData || []);
        } catch (error) {
            console.error("Error fetching finance data:", error);
            toast.error("فشل في تحميل البيانات المالية");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFinanceData();

        // مستمع الـ Realtime لإصدار صوت الـ Ka-ching للأرباح الجديدة
        const financeChannel = supabase
            .channel('finance-tracker')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'transactions',
                    filter: `type=eq.commission`
                },
                (payload) => {
                    if (!payload?.new) return;
                    // تشغيل الصوت
                    try {
                        const audio = new Audio('/kaching.mp3'); // يجب وضع ملف بهذا الاسم في مجلد public
                        audio.play();
                    } catch (e) {
                        console.log("Audio not supported or file missing");
                    }

                    toast.success('تم تسجيل إيرادات (عمولة) جديدة! 💰', {
                        description: `قيمة العمولة: ${payload.new.amount} ر.س`,
                        duration: 5000,
                    });
                    // تحديث البيانات لعرض المعاملة الجديدة فوراً
                    fetchFinanceData();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(financeChannel);
        };
    }, []);

    const filteredTransactions = transactions.filter(trx => {
        const userName = trx.profiles?.full_name || 'مستخدم غير معروف';
        return userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            trx.id.toLowerCase().includes(searchQuery.toLowerCase());
    });

    const pendingWithdrawals = withdrawals.filter(w => w.status === 'pending');
    const pendingShipperPayments = shipperPayments.filter(p => p.status === 'pending');

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
                proofUrl = await api.uploadImage(proofImage, 'receipts');
            }

            // Process the request with bank details (Phase 3)
            await api.completeWithdrawalRequest(selectedWithdrawal.id, bankName, trxNumber, proofUrl);

            toast.success("تم اعتماد الصرف واحتسابه في كشف حساب الناقل ✅");
            setIsApproveModalOpen(false);
            setProofImage(null);
            setBankName('');
            setTrxNumber('');
            setAdminNotes('');

            // Fresh data refresh
            fetchFinanceData();
        } catch (error) {
            console.error("Error processing withdrawal:", error);
            toast.error("حدث خطأ أثناء معالجة الصرف");
        } finally {
            setProcessingWithdrawal(false);
        }
    };

    const handleApproveSettlement = async (shipmentId: string) => {
        const row = carrierEarningsLedger.find(r => r.shipment_id === shipmentId);
        if (row && row.shipper_payment_status !== 'paid') {
            const confirm = window.confirm(`⚠️ تحذير: الشاحن لم يكمل سداد هذه الشحنة (الحالة: ${row.shipper_payment_status === 'unpaid' ? 'لم يدفع' : 'سداد جزئي'}). هل تريد اعتماد أرباح السواق على أي حال؟`);
            if (!confirm) return;
        }

        setIsApprovingSettlement(true);
        try {
            await api.approveShipmentEarnings(shipmentId);
            toast.success("تم اعتماد أرباح الناقل وتحويلها للرصيد المتاح 💰");
            fetchFinanceData();
        } catch (error) {
            toast.error("فشل اعتماد الأرباح");
        } finally {
            setIsApprovingSettlement(false);
        }
    };

    const handleRejectWithdrawal = async (requestId: number) => {
        if (!confirm("هل أنت متأكد من رفض طلب السحب هذا؟")) return;

        try {
            await api.processWithdrawalRequest(requestId.toString(), 'rejected', undefined, 'مرفوض من قبل الإدارة');
            toast.success("تم رفض طلب السحب");
            fetchFinanceData();
        } catch (error) {
            toast.error("حدث خطأ أثناء رفض الطلب");
        }
    };

    const openEditModal = (trx: any) => {
        setEditingTransaction(trx);
        setEditForm({
            amount: trx.amount,
            type: trx.transaction_type || trx.type,
            status: trx.status
        });
        setIsEditTransactionModalOpen(true);
    };

    const handleUpdateTransaction = async () => {
        if (!editingTransaction) return;

        setIsUpdating(true);
        try {
            const { error } = await (supabase as any)
                .from('financial_transactions')
                .update({
                    amount: editForm.amount,
                    transaction_type: editForm.type,
                    status: editForm.status
                })
                .eq('id', editingTransaction.id);

            if (error) throw error;

            toast.success("تم تحديث المعاملة بنجاح");
            setIsEditTransactionModalOpen(false);
            fetchFinanceData();
        } catch (error) {
            console.error("Error updating transaction:", error);
            toast.error("فشل في تحديث البيانات");
        } finally {
            setIsUpdating(false);
        }
    };

    const handleApproveShipperPayment = async () => {
        if (!selectedShipperPayment) return;

        setProcessingPayment(true);
        try {
            const payment = selectedShipperPayment;

            // 1. Approve the payment (updates wallet balance via RPC)
            await api.processShipperPayment(payment.id.toString(), 'approved', paymentAdminNotes);

            // 2. Generate a tax invoice record for this approved payment
            const invoiceNumber = `INV-${Date.now().toString().slice(-8)}`;
            void (supabase as any).from('invoices').insert([{
                shipment_id: payment.shipment_id,
                shipper_id: payment.shipper_id,
                amount: Number(payment.amount),
                total_amount: Number(payment.amount),
                payment_status: 'paid',
                created_at: new Date().toISOString()
            }]);

            // 3. Notify shipper with debt reduction info
            const shipperLedger = financialLedger.find(l => l.shipment_id === payment.shipment_id);
            const newRemaining = shipperLedger
                ? Math.max(0, Number(shipperLedger.remaining_amount) - Number(payment.amount))
                : null;

            api.createNotification(
                payment.shipper_id,
                `✅ تمت الموافقة على دفعتك ${Number(payment.amount).toLocaleString()} ر.س`,
                `تمت الموافقة على دفعتك لشحنة ${formatShortId(payment.shipment_id)}.${newRemaining !== null ? ` رصيدك المتبقي: ${newRemaining.toLocaleString()} ر.س.` : ''} رقم الفاتورة: ${invoiceNumber}`,
                'system'
            );

            // 4. Admin audit log
            await supabase.from('admin_logs' as any).insert([{
                admin_id: userProfile?.id,
                action: 'payment_approved',
                target_user_id: payment.shipper_id,
                details: JSON.stringify({
                    payment_id: payment.id,
                    entity_type: 'shipper_payment',
                    amount: Number(payment.amount),
                    shipment_id: payment.shipment_id,
                    invoice_number: invoiceNumber,
                    admin_name: userProfile?.full_name
                })
            }]).then(() => {}, () => {});

            toast.success("تم اعتماد الدفعة وإصدار الفاتورة الضريبية ✅");
            setIsApprovePaymentModalOpen(false);
            setPaymentAdminNotes('');
            fetchFinanceData();
        } catch (error) {
            console.error("Error processing shipper payment:", error);
            toast.error("حدث خطأ أثناء معالجة الاعتماد");
        } finally {
            setProcessingPayment(false);
        }
    };

    const handleRejectShipperPayment = async (paymentId: string | number) => {
        const adminReason = window.prompt("سبب الرفض (سيظهر للتاجر):", "الإيصال المرفق غير صالح أو غير واضح، يرجى إعادة الرفع.");
        if (adminReason === null) return;

        try {
            await api.processShipperPayment(paymentId.toString(), 'rejected', adminReason);
            toast.success("تم رفض إيصال السداد وإبلاغ التاجر");
            fetchFinanceData();
        } catch (error) {
            console.error("Error rejecting payment:", error);
            toast.error("حدث خطأ أثناء الرفض");
        }
    };

    const handleAddManualPayment = async () => {
        if (!paymentForm.shipmentId || !paymentForm.amount) {
            toast.error("يرجى اختيار الشحنة وإدخال المبلغ");
            return;
        }

        if (!manualPaymentImage) {
            toast.error("يرجى إرفاق صورة الوصل أو الإيصال (إلزامي)");
            return;
        }

        const confirmText = `
⚠️ تأكيد العملية المالية:
- الشحنة: ${formatShortId(paymentForm.shipmentId)}
- المبلغ: ${paymentForm.amount} ر.س
- الطريقة: ${paymentForm.method === 'cash' ? 'نقدي (كاش)' : paymentForm.method === 'bank_transfer' ? 'تحويل بنكي' : 'شيك'}
- الموظف المسؤول: ${userProfile?.full_name || 'Admin'}

هل أنت متأكد من استلام المبلغ؟ سيتم تسجيل البصمة الرقمية للعملية باسمك.
        `;

        if (!window.confirm(confirmText)) return;

        setIsAddingPayment(false);
        const loadingToast = toast.loading("يتم الآن تسجيل العملية وتدقيق البيانات...");

        try {
            // 1. Upload proof image
            const imageUrl = await api.uploadImage(manualPaymentImage, 'receipts');

            // 2. Insert payment with audit data (pending - needs second approval)
            const { data: newPayment, error: insertError } = await (supabase as any)
                .from('shipper_payments')
                .insert([{
                    shipment_id: paymentForm.shipmentId,
                    shipper_id: financialLedger.find(l => l.shipment_id === paymentForm.shipmentId)?.shipper_id,
                    amount: Number(paymentForm.amount),
                    status: 'pending',
                    proof_image_url: imageUrl,
                    payment_method: paymentForm.method,
                    processed_by: userProfile?.id,
                    shipper_notes: 'دفع يدوي: ' + paymentForm.notes,
                    admin_notes: `تمت الإضافة يدوياً بواسطة ${userProfile?.full_name}`
                }])
                .select()
                .single();

            if (insertError) throw insertError;

            // 3. Write admin audit log
            await supabase.from('admin_logs' as any).insert([{
                admin_id: userProfile?.id,
                action: 'manual_payment_recorded',
                target_user_id: financialLedger.find(l => l.shipment_id === paymentForm.shipmentId)?.shipper_id,
                details: JSON.stringify({
                    payment_id: newPayment.id,
                    entity_type: 'shipper_payment',
                    shipment_id: paymentForm.shipmentId,
                    amount: Number(paymentForm.amount),
                    method: paymentForm.method,
                    admin_name: userProfile?.full_name,
                    timestamp: new Date().toISOString()
                })
            }]); // non-blocking

            toast.success("تم تسجيل الدفعة بنجاح وهي بانتظار اعتماد المدير ✅", { id: loadingToast });
            setManualPaymentImage(null);
            setPaymentForm({ shipmentId: '', amount: '', notes: '', method: 'bank_transfer' });
            fetchFinanceData();

            // Notify Shipper - يظهر في سجل النشاط فوراً
            const shipperId = financialLedger.find(l => l.shipment_id === paymentForm.shipmentId)?.shipper_id;
            const methodLabel = paymentForm.method === 'cash' ? 'نقدي (كاش)' : paymentForm.method === 'check' ? 'شيك' : 'تحويل بنكي';
            if (shipperId) {
                api.createNotification(
                    shipperId, 
                    `💰 تم استلام دفعة ${Number(paymentForm.amount).toLocaleString()} ر.س`, 
                    `تم تسجيل استلام مبلغ ${Number(paymentForm.amount).toLocaleString()} ر.س عبر ${methodLabel} لشحنة رقم ${formatShortId(paymentForm.shipmentId)}. الدفعة قيد مراجعة المدير المالي للاعتماد النهائي.`, 
                    'system'
                );
            }
        } catch (error) {
            console.error("Error adding manual payment:", error);
            toast.error("فشل في تسجيل العملية، يرجى المحاولة لاحقاً", { id: loadingToast });
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'paid': return <Badge className="bg-emerald-100 text-emerald-600 border-none font-bold">🟢 تم الدفع</Badge>;
            case 'partial': return <Badge className="bg-blue-100 text-blue-600 border-none font-bold">🔵 سداد جزئي</Badge>;
            case 'pending_approval': return <Badge className="bg-amber-100 text-amber-600 border-none font-bold">🟡 بانتظار الاعتماد</Badge>;
            default: return <Badge className="bg-rose-100 text-rose-600 border-none font-bold">🔴 لم يتم السداد</Badge>;
        }
    };

    const getCarrierStatusBadge = (status: string) => {
        switch (status) {
            case 'paid': return <Badge className="bg-emerald-100 text-emerald-600 border-none font-bold">✅ تم الصرف</Badge>;
            case 'withdrawal_pending': return <Badge className="bg-blue-100 text-blue-600 border-none font-bold">🔵 قيد التحويل</Badge>;
            case 'available': return <Badge className="bg-emerald-50 text-emerald-500 border-none font-bold">🟢 متاح للسحب</Badge>;
            default: return <Badge className="bg-amber-100 text-amber-600 border-none font-bold">🟠 بانتظار الاعتماد</Badge>;
        }
    };

    const getShipperStatusBadge = (status: string) => {
        switch (status) {
            case 'paid': return <Badge className="bg-emerald-100 text-emerald-600 border-none font-bold text-[10px]">🟢 مدفوع</Badge>;
            case 'partial': return <Badge className="bg-blue-100 text-blue-600 border-none font-bold text-[10px]">🔵 جزئي</Badge>;
            case 'pending_approval': return <Badge className="bg-amber-100 text-amber-600 border-none font-bold text-[10px]">🟡 مراجعة</Badge>;
            default: return <Badge className="bg-rose-100 text-rose-600 border-none font-bold text-[10px]">🔴 لم يدفع</Badge>;
        }
    };

    const handleUpdateSetting = async (key: string, value: number) => {
        setIsSavingSetting(true);
        try {
            await api.updateFinancialSetting(key, value);
            toast.success("تم تحديث الإعداد بنجاح");

            // Log the action
            const oldSetting = financialSettings.find(s => s.setting_key === key);
            const settingsData = await api.getFinancialSettings();
            setFinancialSettings(settingsData || []);
            fetchFinanceData(); // Refresh logs and other related data
        } catch (error) {
            toast.error("فشل في حفظ الإعدادات");
        } finally {
            setIsSavingSetting(false);
        }
    };

    if (loading) {
        return (
            <AdminLayout>
                <div className="h-full flex items-center justify-center min-h-[60vh]">
                    <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <div className="space-y-8 max-w-7xl mx-auto pb-20">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                            <div className="p-2 bg-blue-100 rounded-xl text-blue-600">
                                <DollarSign size={28} />
                            </div>
                            العمليات المالية
                        </h1>
                        <p className="text-muted-foreground font-medium mt-2">متابعة الإيرادات، التحصيلات، والفواتير المستحقة</p>
                    </div>

                    <div className="flex gap-3">
                        <Button variant="outline" className="h-12 rounded-xl font-bold border-slate-200 text-slate-700 bg-white">
                            <FileText size={18} className="me-2 text-blue-500" />
                            إصدار سجل الفواتير
                        </Button>
                        <Button onClick={generatePDF} className="h-12 rounded-xl font-black bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20">
                            <Download size={18} className="me-2" />
                            تصدير التقرير المالي
                        </Button>
                    </div>
                </div>

                {/* إضافة الـ ID للقسم المراد تصويره كـ PDF */}
                <div id="finance-report-content" className="space-y-8 bg-slate-50 p-4 rounded-3xl">

                    <Tabs defaultValue="overview" className="w-full">
                        <TabsList className="flex flex-wrap md:grid md:grid-cols-3 lg:grid-cols-6 h-auto min-h-[3.5rem] bg-slate-100/80 backdrop-blur-sm rounded-2xl mb-8 p-1 gap-1">
                            <TabsTrigger value="overview" className="rounded-xl font-bold text-slate-600 data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm">المركز المالي</TabsTrigger>
                            <TabsTrigger value="withdrawals" className="rounded-xl font-bold text-slate-600 data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm">
                                طلبات السحب <Badge variant="secondary" className="ml-2 bg-rose-100 text-rose-600 border-none">{pendingWithdrawals.length}</Badge>
                            </TabsTrigger>
                            <TabsTrigger value="settlements" className="rounded-xl font-bold text-slate-600 data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm">
                                اعتماد الأرباح <Badge variant="secondary" className="ml-2 bg-amber-100 text-amber-600 border-none">{carrierEarningsLedger.filter(r => r.display_status === 'pending_approval').length}</Badge>
                            </TabsTrigger>
                            <TabsTrigger value="payments" className="rounded-xl font-bold text-slate-600 data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm">
                                إيصالات السداد <Badge variant="secondary" className="ml-2 bg-emerald-100 text-emerald-600 border-none">{pendingShipperPayments.length}</Badge>
                            </TabsTrigger>
                            <TabsTrigger value="invoices" className="rounded-xl font-bold text-slate-600 data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm">الفواتير</TabsTrigger>
                            <TabsTrigger value="settings" className="rounded-xl font-bold text-slate-600 data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm">الإعدادات</TabsTrigger>
                        </TabsList>

                        <TabsContent value="overview" className="space-y-8 mt-0 border-none p-0 outline-none">
                            {/* Financial KPI Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                <Card className="rounded-[1.5rem] md:rounded-[2rem] border-none shadow-xl bg-gradient-to-br from-blue-600 to-blue-800 text-white overflow-hidden relative">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                                    <CardContent className="p-8 relative z-10">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-bold text-blue-100 mb-2">إجمالي الإيرادات (الشهر الحالي)</p>
                                                <h3 className="text-4xl font-black tracking-tight">{stats?.totalCommissions?.toLocaleString() || 0} <span className="text-xl font-bold text-blue-200">ر.س</span></h3>
                                            </div>
                                            <div className="p-3 bg-white/20 rounded-2xl">
                                                <TrendingUp size={24} className="text-white" />
                                            </div>
                                        </div>
                                        <div className="mt-6 flex items-center gap-2 text-sm font-bold text-emerald-300">
                                            <ArrowUpRight size={16} />
                                            <span>يتم احتساب إيرادات المنصة بناءً على العمولات</span>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="rounded-[2rem] border-none shadow-xl bg-white">
                                    <CardContent className="p-8">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-bold text-slate-400 mb-2">إيصالات السداد بالانتظار</p>
                                                <h3 className="text-3xl font-black text-slate-900 tracking-tight">{pendingShipperPayments.length} <span className="text-lg font-bold text-slate-400">إيصال</span></h3>
                                            </div>
                                            <div className="p-3 bg-amber-50 rounded-2xl border border-amber-100">
                                                <Clock size={24} className="text-amber-500" />
                                            </div>
                                        </div>
                                        <div className="mt-6 flex items-center gap-2 text-sm font-bold text-amber-500 cursor-pointer hover:underline">
                                            <span>مراجعة إيصالات الشاحنين</span>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="rounded-[2rem] border-none shadow-xl bg-white">
                                    <CardContent className="p-8">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-bold text-slate-400 mb-2">مستحقات الناقلين (للصرف)</p>
                                                <h3 className="text-3xl font-black text-slate-900 tracking-tight">
                                                    {withdrawals.filter(w => w.status === 'pending').reduce((sum, w) => sum + Number(w.amount), 0).toLocaleString()} <span className="text-lg font-bold text-slate-400">ر.س</span>
                                                </h3>
                                            </div>
                                            <div className="p-3 bg-rose-50 rounded-2xl border border-rose-100">
                                                <CreditCard size={24} className="text-rose-500" />
                                            </div>
                                        </div>
                                        <div className="mt-6 flex items-center gap-2 text-sm font-bold text-rose-500">
                                            <span>{withdrawals.filter(w => w.status === 'pending').length} طلبات سحب بانتظار الاعتماد</span>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="rounded-[2rem] border-none shadow-xl bg-white">
                                    <CardContent className="p-8">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-bold text-slate-400 mb-2">صافي ربح المنصة (عمولات)</p>
                                                <h3 className="text-3xl font-black text-emerald-600 tracking-tight">
                                                    {carrierEarningsLedger.filter(l => l.settlement_status === 'settled').reduce((sum, l) => sum + Number(l.commission_amount), 0).toLocaleString()} <span className="text-lg font-bold text-slate-400">ر.س</span>
                                                </h3>
                                            </div>
                                            <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-100">
                                                <ShieldCheck size={24} className="text-emerald-500" />
                                            </div>
                                        </div>
                                        <div className="mt-6 flex items-center gap-2 text-sm font-bold text-emerald-600">
                                            <span>أرباح من {carrierEarningsLedger.filter(l => l.settlement_status === 'settled').length} شحنة معتمدة</span>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Charts & Tables Grid */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                                {/* Revenue Chart */}
                                <Card className="lg:col-span-2 rounded-[2.5rem] shadow-xl border-none p-2 bg-white">
                                    <CardHeader className="pb-2 px-6 pt-6">
                                        <CardTitle className="text-xl font-black text-slate-800">تحليل الإيرادات والتحصيلات</CardTitle>
                                        <CardDescription className="font-bold text-slate-400">مقارنة بين التحصيل الفعلي والمستهدف لشهر أكتوبر</CardDescription>
                                    </CardHeader>
                                    <CardContent className="h-[350px] w-full mt-4">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                <defs>
                                                    <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2} />
                                                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                                                    </linearGradient>
                                                    <linearGradient id="colorExpected" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.1} />
                                                        <stop offset="95%" stopColor="#94a3b8" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontWeight: 'bold', fontSize: 12 }} dy={10} />
                                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontWeight: 'bold', fontSize: 12 }} dx={-10} />
                                                <Tooltip contentStyle={{ borderRadius: '1.5rem', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }} />
                                                <Area type="monotone" dataKey="expected" stroke="#cbd5e1" strokeWidth={2} strokeDasharray="5 5" fillOpacity={1} fill="url(#colorExpected)" name="المستهدف" />
                                                <Area type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={4} fillOpacity={1} fill="url(#colorActual)" name="التحصيل الفعلي" />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </CardContent>
                                </Card>

                                {/* Recent Transactions Panel */}
                                <Card className="rounded-[2.5rem] shadow-xl border-none p-6 bg-white flex flex-col">
                                    <CardHeader className="px-2 pt-2 pb-4 border-b border-slate-50 flex flex-row items-center justify-between">
                                        <CardTitle className="text-xl font-black text-slate-800">سجل الحركات الأخير</CardTitle>
                                    </CardHeader>

                                    <div className="mt-4 mb-4 relative">
                                        <Input
                                            placeholder="ابحث برقم الحركة أو الاسم..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="h-12 pl-10 pr-4 bg-slate-50 border-none rounded-xl font-bold"
                                        />
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    </div>

                                    <CardContent className="p-0 flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar max-h-[350px]">
                                        {filteredTransactions.length === 0 ? (
                                            <div className="text-center py-10 opacity-50 font-bold">لا يوجد حركات لعرضها</div>
                                        ) : filteredTransactions.map((trx, index) => (
                                            <div key={index} className="group flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:border-blue-100 transition-all cursor-pointer">
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${trx.transaction_type === 'commission' ? 'bg-amber-100 text-amber-600' : trx.transaction_type === 'deposit' || trx.transaction_type === 'collection' ? 'bg-emerald-100 text-emerald-600' :
                                                        trx.transaction_type === 'withdrawal' || trx.transaction_type === 'payout' ? 'bg-rose-100 text-rose-600' : 'bg-slate-200 text-slate-600'
                                                        }`}>
                                                        {trx.transaction_type === 'commission' ? <DollarSign size={20} /> : trx.transaction_type === 'deposit' || trx.transaction_type === 'collection' ? <ArrowDownRight size={20} /> :
                                                            trx.transaction_type === 'withdrawal' || trx.transaction_type === 'payout' ? <ArrowUpRight size={20} /> : <FileText size={20} />}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-800 text-sm">{trx.profiles?.full_name || trx.wallet?.profiles?.full_name || 'مستخدم غير معروف'}</p>
                                                        <p className="text-xs text-slate-400 font-bold mt-1" dir="ltr">{trx.id?.substring(0, 10).toUpperCase() || 'TRX-NEW'} - {trx.transaction_type === 'commission' ? 'عمولة' : (trx.transaction_type || trx.type)}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <div className="text-left">
                                                        <p className={`font-black tracking-tight ${trx.amount > 0 ? 'text-emerald-600' : 'text-slate-800'}`} dir="ltr">
                                                            {trx.amount > 0 ? '+' : ''}{trx.amount?.toLocaleString()} ر.س
                                                        </p>
                                                        <div className="mt-1 flex justify-end gap-2 items-center">
                                                            {trx.status === 'completed' ? (
                                                                <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-none text-[10px] px-2 py-0">مكتمل</Badge>
                                                            ) : (
                                                                <Badge variant="outline" className="bg-amber-50 text-amber-600 border-none text-[10px] px-2 py-0">معلق</Badge>
                                                            )}
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    openEditModal(trx);
                                                                }}
                                                                className="h-7 w-7 rounded-full bg-white shadow-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 transition-all opacity-0 group-hover:opacity-100"
                                                            >
                                                                <Pencil size={12} />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </CardContent>

                                    <Button variant="ghost" className="w-full mt-4 text-blue-600 font-bold hover:bg-blue-50 h-10 rounded-xl">
                                        عرض كل المعاملات
                                    </Button>
                                </Card>
                            </div>
                        </TabsContent>

                        {/* Withdrawals Tab */}
                        <TabsContent value="withdrawals" className="space-y-6 mt-0 border-none p-0 outline-none">
                            <Card className="rounded-[2.5rem] shadow-xl border-none p-2 bg-white">
                                <CardHeader className="px-6 pt-6 pb-4 border-b border-slate-50">
                                    <CardTitle className="text-xl font-black text-slate-800 flex items-center gap-2">
                                        <CreditCard className="text-rose-500" /> مراجعة طلبات سحب الأرباح للناقلين
                                    </CardTitle>
                                    <CardDescription className="font-bold text-slate-500">
                                        يرجى تحويل المبالغ للحسابات البنكية الموضحة، ثم إرفاق إيصال التحويل لاعتماد العملية وتصفير الرصيد.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="p-6">
                                    {pendingWithdrawals.length === 0 ? (
                                        <div className="text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                                            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <CheckCircle2 size={40} className="text-slate-300" />
                                            </div>
                                            <h3 className="text-xl font-black text-slate-700 mb-2">لا توجد طلبات سحب معلقة</h3>
                                            <p className="text-slate-500 font-bold">تمت معالجة جميع المستحقات المالية للسائقين.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {pendingWithdrawals.map(request => (
                                                <div key={request.id} className="p-6 rounded-3xl bg-slate-50 border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 hover:shadow-md transition-shadow">

                                                    {/* Driver Info */}
                                                    <div className="flex items-start gap-4 flex-1">
                                                        <div className="w-14 h-14 rounded-2xl bg-white border shadow-sm flex items-center justify-center text-rose-500 flex-shrink-0">
                                                            <ArrowUpRight size={28} />
                                                        </div>
                                                        <div>
                                                            <h4 className="font-black text-lg text-slate-800">{request.profile?.full_name || 'سائق غير معروف'}</h4>
                                                            <p className="text-sm font-bold text-slate-500 mb-3">{request.profile?.phone}</p>

                                                            {/* Bank Details Box */}
                                                            <div className="p-4 bg-white rounded-2xl border border-slate-200">
                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm font-bold">
                                                                    <div>
                                                                        <span className="text-slate-400 block text-xs uppercase mb-1">البنك</span>
                                                                        <span className="text-slate-800">{request.profile?.bank_name || 'غير مسجل'}</span>
                                                                    </div>
                                                                    <div>
                                                                        <span className="text-slate-400 block text-xs uppercase mb-1">صاحب الحساب</span>
                                                                        <span className="text-slate-800">{request.profile?.account_name || 'غير مسجل'}</span>
                                                                    </div>
                                                                    <div className="md:col-span-2 space-y-2">
                                                                        <div className="flex justify-between items-center bg-slate-50 p-2 rounded-lg border">
                                                                            <span className="text-slate-400 text-xs">رقم الحساب</span>
                                                                            <span className="text-slate-800 tracking-wider" dir="ltr">{request.profile?.account_number || '-'}</span>
                                                                        </div>
                                                                        <div className="flex justify-between items-center bg-slate-50 p-2 rounded-lg border">
                                                                            <span className="text-slate-400 text-xs">IBAN</span>
                                                                            <span className="text-slate-800 tracking-wider text-xs" dir="ltr">{request.profile?.iban || '-'}</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Action Box */}
                                                    <div className="bg-white p-5 rounded-3xl border shadow-sm text-center md:text-right min-w-[250px] space-y-4">
                                                        <div>
                                                            <p className="text-sm font-bold text-slate-500 mb-1">المبلغ المطلوب</p>
                                                            <h3 className="text-4xl font-black text-slate-900 tracking-tight">{Number(request.amount).toLocaleString()} <span className="text-lg text-slate-500">ر.س</span></h3>
                                                            <div className="mt-2 text-xs font-bold text-slate-400 flex items-center justify-center md:justify-end gap-1">
                                                                <Clock size={12} /> {(new Date(request.created_at)).toLocaleDateString('ar-SA')}
                                                            </div>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <Button
                                                                variant="outline"
                                                                onClick={() => handleRejectWithdrawal(request.id)}
                                                                className="flex-1 rounded-xl font-bold bg-rose-50 text-rose-600 border-none hover:bg-rose-100"
                                                            >
                                                                رفض
                                                            </Button>
                                                            <Button
                                                                onClick={() => {
                                                                    setSelectedWithdrawal(request);
                                                                    setIsApproveModalOpen(true);
                                                                }}
                                                                className="flex-[2] rounded-xl font-black bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20"
                                                            >
                                                                اعتماد ورفع الإيصال
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Earnings Approval Tab (Phase 1) */}
                        <TabsContent value="settlements" className="space-y-6 mt-0 border-none p-0 outline-none">
                            <Card className="rounded-[2.5rem] shadow-xl border-none p-2 bg-white">
                                <CardHeader className="px-6 pt-6 pb-4 border-b border-slate-50 flex flex-row justify-between items-center">
                                    <div>
                                        <CardTitle className="text-xl font-black text-slate-800 flex items-center gap-2">
                                            <TrendingUp className="text-amber-500" /> دفتر صرف الناقلين (Carrier Ledger)
                                        </CardTitle>
                                        <CardDescription className="font-bold text-slate-500">
                                            متابعة أرباح السائقين، العمولات المستقطعة، وحالة تسوية الشحنات المكتملة.
                                        </CardDescription>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-right border-collapse">
                                            <thead>
                                                <tr className="bg-slate-50 border-b border-slate-100">
                                                    <th className="p-4 font-black text-slate-400 text-sm">رقم الشحنة</th>
                                                    <th className="p-4 font-black text-slate-400 text-sm">الناقل</th>
                                                    <th className="p-4 font-black text-slate-400 text-sm">مبلغ الشحنة</th>
                                                    <th className="p-4 font-black text-slate-400 text-sm">المستحق (نور)</th>
                                                    <th className="p-4 font-black text-slate-400 text-sm">سداد الشاحن</th>
                                                    <th className="p-4 font-black text-slate-400 text-sm">حالة الصرف</th>
                                                    <th className="p-4 font-black text-slate-400 text-sm">الإجراءات</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {carrierEarningsLedger.map((row) => (
                                                    <tr key={row.shipment_id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                                        <td className="p-4 font-bold text-blue-600">SH-{row.shipment_id.substring(0, 8).toUpperCase()}</td>
                                                        <td className="p-4 font-bold text-slate-700">{row.carrier_name}</td>
                                                        <td className="p-4 font-black">{Number(row.total_amount).toLocaleString()} ر.س</td>
                                                        <td className="p-4 font-bold text-emerald-600">{Number(row.net_amount).toLocaleString()} ر.س</td>
                                                        <td className="p-4">{getShipperStatusBadge(row.shipper_payment_status)}</td>
                                                        <td className="p-4">{getCarrierStatusBadge(row.display_status)}</td>
                                                        <td className="p-4">
                                                            {row.display_status === 'pending_approval' ? (
                                                                <Button 
                                                                    size="sm" 
                                                                    className="bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg"
                                                                    onClick={() => handleApproveSettlement(row.shipment_id)}
                                                                >
                                                                    اعتماد الربح
                                                                </Button>
                                                            ) : row.display_status === 'available' ? (
                                                                <Button 
                                                                    size="sm" 
                                                                    variant="outline" 
                                                                    className="text-emerald-600 border-emerald-200 hover:bg-emerald-50 font-bold"
                                                                    disabled
                                                                >
                                                                    متاح للسحب
                                                                </Button>
                                                            ) : row.display_status === 'withdrawal_pending' ? (
                                                                <Button 
                                                                    size="sm" 
                                                                    className="bg-blue-600 text-white font-bold rounded-lg"
                                                                    onClick={() => {
                                                                        const req = withdrawals.find(w => w.user_id === row.carrier_id && w.status === 'pending');
                                                                        if (req) {
                                                                            setSelectedWithdrawal(req);
                                                                            setIsApproveModalOpen(true);
                                                                        }
                                                                    }}
                                                                >
                                                                    صرف الآن
                                                                </Button>
                                                            ) : (
                                                                <Button size="sm" variant="ghost" className="text-slate-400 font-bold" disabled>إتمام الصرف</Button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    <div className="p-6 border-t border-slate-100">
                                        <h4 className="font-black text-slate-800 mb-4 flex items-center gap-2">
                                            <TrendingUp size={18} className="text-amber-500" /> أرباح بانتظار الاعتماد ({carrierEarningsLedger.filter(r => r.display_status === 'pending_approval').length})
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {carrierEarningsLedger.filter(r => r.display_status === 'pending_approval').map(row => (
                                                <div key={row.shipment_id} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col gap-3">
                                                    <div className="flex justify-between items-start">
                                                        <span className="font-black text-slate-800">{row.carrier_name}</span>
                                                        <Badge className="bg-amber-100 text-amber-600 border-none text-[10px]">بانتظار المراجعة</Badge>
                                                    </div>
                                                    <div className="flex justify-between items-center text-sm font-bold">
                                                        <span className="text-slate-400">المستحق:</span>
                                                        <span className="text-emerald-600 font-black">{Number(row.net_amount).toLocaleString()} ر.س</span>
                                                    </div>
                                                    <div className="flex justify-between items-center text-sm font-bold">
                                                        <span className="text-slate-400">سداد الشاحن:</span>
                                                        {getShipperStatusBadge(row.shipper_payment_status)}
                                                    </div>
                                                    <Button 
                                                        size="sm" 
                                                        className={`w-full font-black rounded-xl ${row.shipper_payment_status !== 'paid' ? 'bg-slate-200 text-slate-400' : 'bg-amber-500 hover:bg-amber-600 text-white'}`}
                                                        onClick={() => handleApproveSettlement(row.shipment_id)}
                                                    >
                                                        اعتماد وصرف للمحفظة
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Shipper Payments Tab */}
                        <TabsContent value="payments" className="space-y-6 mt-0 border-none p-0 outline-none">
                            <Card className="rounded-[2.5rem] shadow-xl border-none p-2 bg-white">
                                <CardHeader className="px-6 pt-6 pb-4 border-b border-slate-50 flex flex-row justify-between items-center">
                                    <div>
                                        <CardTitle className="text-xl font-black text-slate-800 flex items-center gap-2">
                                            <FileText className="text-emerald-500" /> دفتر الحسابات المالي (Financial Ledger)
                                        </CardTitle>
                                        <CardDescription className="font-bold text-slate-500">
                                            متابعة حالة مديونيات الشحنات، المدفوعات الجزئية، والمبالغ المتبقية لكل شحنة.
                                        </CardDescription>
                                    </div>
                                    <Button 
                                        onClick={() => setIsAddingPayment(true)}
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl"
                                    >
                                        إضافة دفعة يدوية
                                    </Button>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-right border-collapse">
                                            <thead>
                                                <tr className="bg-slate-50 border-b border-slate-100">
                                                    <th className="p-4 font-black text-slate-400 text-sm">رقم الشحنة</th>
                                                    <th className="p-4 font-black text-slate-400 text-sm">الشاحن</th>
                                                    <th className="p-4 font-black text-slate-400 text-sm">القيمة</th>
                                                    <th className="p-4 font-black text-slate-400 text-sm">المسدد</th>
                                                    <th className="p-4 font-black text-slate-400 text-sm">المتبقي</th>
                                                    <th className="p-4 font-black text-slate-400 text-sm">الحالة</th>
                                                    <th className="p-4 font-black text-slate-400 text-sm">الإجراءات</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {financialLedger.map((row) => (
                                                    <tr key={row.shipment_id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                                        <td className="p-4 font-bold text-blue-600">SH-{row.shipment_id.substring(0, 8).toUpperCase()}</td>
                                                        <td className="p-4 font-bold text-slate-700">{row.shipper_name}</td>
                                                        <td className="p-4 font-black">{Number(row.total_amount).toLocaleString()} ر.س</td>
                                                        <td className="p-4 font-bold text-emerald-600">{Number(row.paid_amount).toLocaleString()} ر.س</td>
                                                        <td className="p-4 font-bold text-rose-600">{Number(row.remaining_amount).toLocaleString()} ر.س</td>
                                                        <td className="p-4">{getStatusBadge(row.financial_status)}</td>
                                                        <td className="p-4">
                                                            <Button 
                                                                size="sm" 
                                                                variant="ghost" 
                                                                onClick={() => {
                                                                    setManualPaymentImage(null);
                                                                    setPaymentForm({ shipmentId: row.shipment_id, amount: '', notes: '', method: 'bank_transfer' });
                                                                    setIsAddingPayment(true);
                                                                }}
                                                                className="text-blue-600 hover:bg-blue-50 font-bold"
                                                            >
                                                                {row.financial_status === 'pending_approval' ? 'مراجعة' : 'إضافة دفعة'}
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* التنبيهات المعلقة (الإيصالات) */}
                                    <div className="p-6 border-t border-slate-100">
                                        <h4 className="font-black text-slate-800 mb-4 flex items-center gap-2">
                                            <Clock size={18} className="text-amber-500" /> إيصالات بانتظار المراجعة ({pendingShipperPayments.length})
                                        </h4>
                                        <div className="space-y-4">
                                            {pendingShipperPayments.map(payment => (
                                                <div key={payment.id} className="p-4 rounded-2xl bg-amber-50/50 border border-amber-100 flex justify-between items-center">
                                                    <div className="flex items-center gap-4">
                                                        <div className="p-2 bg-white rounded-xl shadow-sm"><FileText size={20} className="text-amber-500" /></div>
                                                        <div>
                                                            <p className="font-bold text-slate-800">{payment.shipper?.full_name}</p>
                                                            <p className="text-xs font-bold text-slate-500">مبلغ: {payment.amount} ر.س | شحنة: #{payment.shipment_id?.substring(0,8)}</p>
                                                            {payment.auditor?.full_name && (
                                                                <p className="text-xs font-bold text-blue-500 mt-0.5">🛡️ سجله: {payment.auditor.full_name} | {payment.payment_method === 'cash' ? 'نقدي' : payment.payment_method === 'check' ? 'شيك' : 'تحويل'}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        {payment.proof_image_url && <Button size="sm" variant="ghost" className="text-blue-600 font-bold" onClick={() => window.open(payment.proof_image_url, '_blank')}>عرض</Button>}
                                                        <Button size="sm" className="bg-emerald-600 text-white font-bold rounded-lg" onClick={() => {
                                                            setSelectedShipperPayment(payment);
                                                            setIsApprovePaymentModalOpen(true);
                                                        }}>اعتماد</Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Invoices Tab */}
                        <TabsContent value="invoices" className="space-y-6 mt-0 border-none p-0 outline-none text-right">
                            <Card className="rounded-[2.5rem] shadow-xl border-none bg-white overflow-hidden">
                                <CardHeader className="px-8 pt-8 pb-4 border-b border-slate-50">
                                    <div className="flex justify-between items-center">
                                        <CardTitle className="text-2xl font-black text-slate-800 flex items-center gap-3">
                                            <div className="p-2 bg-blue-100 rounded-xl text-blue-600">
                                                <FileText size={24} />
                                            </div>
                                            سجل الفواتير الصادرة
                                        </CardTitle>
                                        <Button variant="outline" className="rounded-xl border-blue-200 text-blue-600 font-bold">
                                            <Download size={18} className="me-2" /> تصدير الكل
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-right border-collapse">
                                            <thead>
                                                <tr className="bg-slate-50 border-b border-slate-100">
                                                    <th className="px-6 py-4 font-black text-slate-500 text-sm">رقم الشحنة</th>
                                                    <th className="px-6 py-4 font-black text-slate-500 text-sm">الشاحن</th>
                                                    <th className="px-6 py-4 font-black text-slate-500 text-sm">المبلغ لم يتم سداده</th>
                                                    <th className="px-6 py-4 font-black text-slate-500 text-sm">المبلغ تم سداده</th>
                                                    <th className="px-6 py-4 font-black text-slate-500 text-sm">قيمة الشحنة</th>
                                                    <th className="px-6 py-4 font-black text-slate-500 text-sm text-center">الحالة</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50">
                                                {invoices.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={6} className="px-6 py-20 text-center text-slate-400 font-bold">لا توجد فواتير صادرة حالياً</td>
                                                    </tr>
                                                ) : invoices.map((invoice) => {
                                                    const unpaidAmount = Number(invoice.balance || (invoice.total_amount - (invoice.amount_paid || 0)));
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
                                                    } else if (Number(invoice.amount_paid) > 0) {
                                                        statusText = 'سداد جزئي';
                                                        rowStyle = 'bg-blue-50/10 hover:bg-blue-50/40 transition-colors';
                                                        statusBadgeStyle = 'bg-blue-500 text-white font-black px-4 py-1.5 rounded-full text-xs shadow-sm w-full inline-block min-w-[120px]';
                                                    } else {
                                                        statusText = 'المبلغ لم يتم سداده';
                                                        rowStyle = 'bg-rose-50/10 hover:bg-rose-50/40 transition-colors';
                                                        statusBadgeStyle = 'bg-rose-500 text-white font-black px-4 py-1.5 rounded-full text-xs shadow-sm w-full inline-block min-w-[120px]';
                                                    }

                                                    return (
                                                    <tr key={invoice.invoice_id} className={`border-b border-slate-100/50 ${rowStyle}`}>
                                                        <td className="px-6 py-4 font-black text-slate-700">
                                                            <a href={`/admin/loads?search=${invoice.shipment_id || ''}`} target="_blank" rel="noreferrer" className="hover:text-blue-600 transition-colors block">
                                                                {invoice.shipment_id ? formatShortId(invoice.shipment_id, 'SH') : formatShortId(invoice.invoice_id, 'INV')}
                                                            </a>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className="font-bold text-slate-800 tracking-tight block">{invoice.shipper?.full_name}</span>
                                                            <span className="block text-xs text-slate-400 font-bold">{invoice.shipper?.phone}</span>
                                                        </td>
                                                        <td className="px-6 py-4 font-black text-rose-600">{unpaidAmount.toLocaleString()} ر.س</td>
                                                        <td className="px-6 py-4 font-black text-slate-900">{Number(invoice.amount_paid || 0).toLocaleString()} ر.س</td>
                                                        <td className="px-6 py-4 font-black text-slate-900">{Number(invoice.total_amount).toLocaleString()} ر.س</td>
                                                        <td className="px-6 py-4 text-center align-middle">
                                                            <div className={statusBadgeStyle}>
                                                                {statusText}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )})}
                                            </tbody>
                                        </table>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Settings Tab */}
                        <TabsContent value="settings" className="space-y-8 mt-0 border-none p-0 outline-none text-right">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                <div className="lg:col-span-1 space-y-6">
                                    <Card className="rounded-[2.5rem] shadow-xl border-none bg-white p-6">
                                        <CardHeader className="p-0 mb-6">
                                            <CardTitle className="text-xl font-black text-slate-800 flex items-center gap-3">
                                                <Settings className="text-blue-600" /> إعدادات النظام المالي
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="p-0 space-y-6">
                                            {financialSettings.map((setting) => (
                                                <div key={setting.id} className="space-y-3">
                                                    <Label className="font-black text-slate-600">{setting.description || setting.setting_key}</Label>
                                                    <div className="flex gap-2">
                                                        <div className="relative flex-1">
                                                            <Input
                                                                type="number"
                                                                defaultValue={setting.setting_value}
                                                                className="h-12 rounded-xl bg-slate-50 border-slate-200 font-black pl-10"
                                                                id={`setting-${setting.setting_key}`}
                                                            />
                                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-slate-400">%</span>
                                                        </div>
                                                        <Button
                                                            onClick={() => {
                                                                const val = (document.getElementById(`setting-${setting.setting_key}`) as HTMLInputElement).value;
                                                                handleUpdateSetting(setting.setting_key, Number(val));
                                                            }}
                                                            disabled={isSavingSetting}
                                                            className="h-12 rounded-xl bg-blue-600 hover:bg-blue-700 font-bold"
                                                        >
                                                            حفظ
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}

                                            <div className="pt-6 border-t border-slate-100">
                                                <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex items-start gap-3">
                                                    <ShieldCheck className="text-blue-600 shrink-0 mt-1" size={20} />
                                                    <p className="text-sm font-bold text-blue-800 leading-relaxed">
                                                        تعديل القيم يؤثر على الشحنات المستقبلية فقط. العمليات الحالية تحتفظ بالنسب القديمة لضمان دقة السجلات.
                                                    </p>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>

                                <div className="lg:col-span-2">
                                    <Card className="rounded-[2.5rem] shadow-xl border-none bg-white overflow-hidden">
                                        <CardHeader className="px-8 pt-8 pb-4 border-b border-slate-50">
                                            <CardTitle className="text-xl font-black text-slate-800 flex items-center gap-3">
                                                <History className="text-slate-500" /> سجل مراجعة العمليات (Audit Logs)
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="p-0">
                                            <div className="overflow-y-auto max-h-[500px] custom-scrollbar">
                                                <div className="divide-y divide-slate-50">
                                                    {auditLogs.length === 0 ? (
                                                        <div className="p-20 text-center text-slate-400 font-bold">لا توجد سجلات حالياً</div>
                                                    ) : auditLogs.map((log) => (
                                                        <div key={log.id} className="p-6 hover:bg-slate-50/50 transition-colors">
                                                            <div className="flex items-center justify-between mb-2">
                                                                <Badge className="bg-slate-100 text-slate-600 border-none font-bold uppercase tracking-wider text-[10px]">
                                                                    {log.action}
                                                                </Badge>
                                                                <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                                                                    <Clock size={12} /> {new Date(log.created_at).toLocaleString('ar-SA')}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-3 mt-3">
                                                                <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-black text-xs">
                                                                    {log.user?.full_name?.charAt(0) || 'A'}
                                                                </div>
                                                                <div>
                                                                    <p className="text-sm font-bold text-slate-800">
                                                                        <span className="text-blue-600 font-black">{log.user?.full_name || 'مسؤول'}</span>
                                                                        {" قام بـ "}
                                                                        <span className="text-slate-600">{log.action === 'update_setting' ? 'تحديث إعدادات النظام' : log.action}</span>
                                                                    </p>
                                                                    {log.new_values && (
                                                                        <p className="text-[10px] font-mono text-slate-400 mt-1" dir="ltr">
                                                                            {JSON.stringify(log.new_values)}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>

            {/* Modal: Process Withdrawal / Upload Proof */}
            <Dialog open={isApproveModalOpen} onOpenChange={setIsApproveModalOpen}>
                <DialogContent className="sm:max-w-md bg-white rounded-[2rem] p-0 overflow-hidden border-none text-right" dir="rtl">
                    <div className="bg-slate-50 p-6 border-b border-slate-100 flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center">
                            <CreditCard size={24} />
                        </div>
                        <div>
                            <DialogTitle className="text-xl font-black">تأكيد تحويل مستحقات</DialogTitle>
                            <DialogDescription className="font-bold text-slate-500 mt-1">المبلغ: {Number(selectedWithdrawal?.amount).toLocaleString()} ر.س للناقل {selectedWithdrawal?.profile?.full_name}</DialogDescription>
                        </div>
                    </div>

                    <div className="p-6 space-y-6">
                        <div className="space-y-4">
                            <Label className="font-black text-slate-700">إيصال التحويل البنكي (مطلوب)</Label>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-3">
                                <Label className="font-black text-slate-700">المبلغ</Label>
                                <div className="h-12 flex items-center px-4 bg-slate-100 rounded-xl font-black text-slate-900 border border-slate-200">
                                    {selectedWithdrawal?.amount?.toLocaleString()} ر.س
                                </div>
                            </div>
                            <div className="space-y-3">
                                <Label className="font-black text-slate-700 text-right block">اسم البنك المحول منه</Label>
                                <Input
                                    value={bankName}
                                    onChange={(e) => setBankName(e.target.value)}
                                    className="h-12 rounded-xl bg-slate-50 border-slate-200 font-bold"
                                    placeholder="مثل: الراجحي، الأهلي..."
                                />
                            </div>
                        </div>

                        <div className="space-y-3">
                            <Label className="font-black text-slate-700 text-right block">رقم العملية البنكية (Reference/TRX)</Label>
                            <Input
                                value={trxNumber}
                                onChange={(e) => setTrxNumber(e.target.value)}
                                className="h-12 rounded-xl bg-slate-50 border-slate-200 font-bold tracking-wider"
                                placeholder="أدخل رقم الحوالة أو المرجع البنكي"
                            />
                        </div>

                        <div className="space-y-3">
                            <Label className="font-black text-slate-700">إرفاق إيصال التحويل (اختياري)</Label>
                            <div
                                className={`w-full h-32 rounded-2xl border-2 border-dashed ${proofImage ? 'border-emerald-300 bg-emerald-50' : 'border-slate-300 bg-slate-50 hover:bg-slate-100'} flex flex-col items-center justify-center cursor-pointer transition-colors relative overflow-hidden`}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    onChange={(e) => {
                                        if (e.target.files && e.target.files[0]) {
                                            setProofImage(e.target.files[0]);
                                        }
                                    }}
                                    accept="image/*,.pdf"
                                />

                                {proofImage ? (
                                    <>
                                        <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-0"></div>
                                        <div className="relative z-10 flex flex-col items-center gap-2">
                                            <CheckCircle2 size={32} className="text-emerald-500" />
                                            <span className="font-black text-xs text-emerald-700">{proofImage.name}</span>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <ArrowUpRight size={20} className="text-slate-400 mb-2" />
                                        <span className="font-black text-sm text-slate-600">اضغط لرفع الإيصال</span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="bg-slate-50 p-6 border-t border-slate-100 sm:justify-start gap-3">
                        <Button
                            onClick={handleApproveWithdrawal}
                            disabled={!proofImage || processingWithdrawal}
                            className="flex-1 h-14 rounded-2xl font-black text-lg bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-500/20"
                        >
                            {processingWithdrawal ? <Loader2 className="animate-spin text-white" /> : 'تأكيد الحوالة وتصفير الرصيد'}
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setIsApproveModalOpen(false);
                                setProofImage(null);
                            }}
                            className="h-14 rounded-2xl font-bold bg-white text-slate-600 mx-0 border-slate-200"
                        >
                            إلغاء
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* نافذة تعديل معاملة مالية */}
            <Dialog open={isEditTransactionModalOpen} onOpenChange={setIsEditTransactionModalOpen}>
                <DialogContent className="sm:max-w-md bg-white rounded-[2rem] p-0 overflow-hidden border-none text-right" dir="rtl">
                    <div className="bg-slate-50 p-6 border-b border-slate-100 flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center">
                            <FileText size={24} />
                        </div>
                        <div>
                            <DialogTitle className="text-xl font-black">تعديل تفاصيل المعاملة</DialogTitle>
                            <DialogDescription className="font-bold text-slate-500 mt-1">تعديل بيانات الحركة رقم: {editingTransaction?.id?.substring(0, 8).toUpperCase()}</DialogDescription>
                        </div>
                    </div>

                    <div className="p-6 space-y-4">
                        <div className="space-y-2 text-right">
                            <Label className="font-black text-slate-700">المبلغ (ر.س)</Label>
                            <Input
                                type="number"
                                value={editForm.amount}
                                onChange={(e) => setEditForm({ ...editForm, amount: Number(e.target.value) })}
                                className="h-12 rounded-xl bg-slate-50 border-slate-200 font-bold text-right"
                            />
                        </div>

                        <div className="space-y-2 text-right">
                            <Label className="font-black text-slate-700">نوع المعاملة</Label>
                            <select
                                value={editForm.type}
                                onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}
                                className="w-full h-12 rounded-xl bg-slate-50 border border-slate-200 font-bold px-4 outline-none focus:ring-2 ring-blue-500/20 text-right"
                            >
                                <option value="commission">عمولة (إيراد)</option>
                                <option value="deposit">إيداع (شحن محفظة)</option>
                                <option value="withdrawal">سحب (أرباح ناقل)</option>
                                <option value="collection">تحصيل (سداد مديونية)</option>
                                <option value="debt">مديونية شحنة</option>
                                <option value="settlement">تسوية </option>
                            </select>
                        </div>

                        <div className="space-y-2 text-right">
                            <Label className="font-black text-slate-700">حالة المعاملة</Label>
                            <select
                                value={editForm.status}
                                onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                                className="w-full h-12 rounded-xl bg-slate-50 border border-slate-200 font-bold px-4 outline-none focus:ring-2 ring-blue-500/20 text-right"
                            >
                                <option value="completed">مكتمل (Completed)</option>
                                <option value="pending">معلق (Pending)</option>
                                <option value="failed">فاشل (Failed)</option>
                            </select>
                        </div>
                    </div>

                    <DialogFooter className="bg-slate-50 p-6 border-t border-slate-100 sm:justify-start gap-3">
                        <Button
                            onClick={handleUpdateTransaction}
                            disabled={isUpdating}
                            className="flex-1 h-14 rounded-2xl font-black text-lg bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-500/20 text-white"
                        >
                            {isUpdating ? <Loader2 className="animate-spin" /> : 'حفظ التعديلات'}
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => setIsEditTransactionModalOpen(false)}
                            className="h-14 rounded-2xl font-bold bg-white text-slate-600 border-slate-200"
                        >
                            إلغاء
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal: Process Shipper Payment (Approve) */}
            <Dialog open={isApprovePaymentModalOpen} onOpenChange={setIsApprovePaymentModalOpen}>
                <DialogContent className="sm:max-w-md bg-white rounded-[2rem] p-0 overflow-hidden border-none text-right" dir="rtl">
                    <div className="bg-slate-50 p-6 border-b border-slate-100 flex items-center gap-4">
                        <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center">
                            <CheckCircle2 size={24} />
                        </div>
                        <div>
                            <DialogTitle className="text-xl font-black">تأكيد حوالة سداد مديونية</DialogTitle>
                            <DialogDescription className="font-bold text-slate-500 mt-1">المبلغ: {Number(selectedShipperPayment?.amount).toLocaleString()} ر.س من التاجر {selectedShipperPayment?.shipper?.full_name}</DialogDescription>
                        </div>
                    </div>

                    <div className="p-6 space-y-6">
                        <div className="p-4 bg-emerald-50 text-emerald-700 rounded-2xl font-bold text-sm">
                            بمجرد الاعتماد، سيتم إضافة هذا المبلغ إلى محفظة التاجر لسداد مديونيته المتأخرة. هل راجعت الحساب البنكي للتطبيق للتأكد من وصول الحوالة؟
                        </div>

                        <div className="space-y-3">
                            <Label className="font-black text-slate-700">ملاحظات الإدارة (اختياري)</Label>
                            <Input
                                value={paymentAdminNotes}
                                onChange={(e) => setPaymentAdminNotes(e.target.value)}
                                className="h-12 rounded-xl bg-slate-50 border-slate-200 font-bold px-4"
                                placeholder="رقم العملية المرجعي، تفاصيل الاعتماد..."
                            />
                        </div>
                    </div>

                    <DialogFooter className="bg-slate-50 p-6 border-t border-slate-100 sm:justify-start gap-3">
                        <Button
                            onClick={handleApproveShipperPayment}
                            disabled={processingPayment}
                            className="flex-1 h-14 rounded-2xl font-black text-lg bg-emerald-600 hover:bg-emerald-700 shadow-xl shadow-emerald-500/20"
                        >
                            {processingPayment ? <Loader2 className="animate-spin text-white" /> : 'اعتماد وتحديث الرصيد'}
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setIsApprovePaymentModalOpen(false);
                            }}
                            className="h-14 rounded-2xl font-bold bg-white text-slate-600 mx-0 border-slate-200"
                        >
                            إلغاء
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            {/* Modal: Add Manual Payment */}
            <Dialog open={isAddingPayment} onOpenChange={setIsAddingPayment}>
                <DialogContent className="sm:max-w-md bg-white rounded-[2rem] p-0 overflow-hidden border-none text-right" dir="rtl">
                    <div className="bg-slate-50 p-6 border-b border-slate-100 flex items-center gap-4">
                        <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center">
                            <DollarSign size={24} />
                        </div>
                        <div>
                            <DialogTitle className="text-xl font-black">إضافة دفعة سداد يدوية</DialogTitle>
                            <DialogDescription className="font-bold text-slate-500 mt-1">تسجيل تحصيل مبلغ نقداً أو بتحويل بنكي مباشر للشحنة</DialogDescription>
                        </div>
                    </div>

                    <div className="p-6 space-y-4">
                        <div className="space-y-2">
                            <Label className="font-black text-slate-700">رقم الشحنة (تلقائي)</Label>
                            <div className="h-12 flex items-center px-4 bg-slate-100 rounded-xl font-black text-slate-900 border border-slate-200">
                                {paymentForm.shipmentId ? `SH-${paymentForm.shipmentId.substring(0, 8).toUpperCase()}` : 'يرجى الاختيار من الجدول'}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="font-black text-slate-700">المبلغ المحصل (ر.س)</Label>
                            <Input
                                type="number"
                                value={paymentForm.amount}
                                onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                                className="h-12 rounded-xl bg-slate-50 border-slate-200 font-bold"
                                placeholder="أدخل المبلغ المسدد"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="font-black text-slate-700">طريقة التحصيل</Label>
                                <select 
                                    value={paymentForm.method}
                                    onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })}
                                    className="w-full h-12 px-4 rounded-xl bg-slate-50 border border-slate-200 font-bold focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
                                >
                                    <option value="bank_transfer">تحويل بنكي</option>
                                    <option value="cash">نقدي (كاش)</option>
                                    <option value="check">شيك</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label className="font-black text-slate-700">إرفاق إيصال (إلزامي)</Label>
                                <div 
                                    onClick={() => manualPaymentFileRef.current?.click()}
                                    className={`h-12 border-2 border-dashed rounded-xl flex items-center justify-center cursor-pointer transition-all ${manualPaymentImage ? 'border-emerald-500 bg-emerald-50 text-emerald-600' : 'border-slate-200 bg-slate-50 text-slate-400 hover:border-blue-400'}`}
                                >
                                    {manualPaymentImage ? <CheckCircle2 size={20} /> : <FileText size={20} />}
                                    <span className="mr-2 text-xs font-bold">{manualPaymentImage ? 'تم اختيار الملف' : 'رفع صورة الوصل'}</span>
                                    <input 
                                        type="file" 
                                        ref={manualPaymentFileRef}
                                        onChange={(e) => setManualPaymentImage(e.target.files?.[0] || null)}
                                        className="hidden" 
                                        accept="image/*"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="font-black text-slate-700">ملاحظات إضافية</Label>
                            <Input
                                value={paymentForm.notes}
                                onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                                className="h-12 rounded-xl bg-slate-50 border-slate-200 font-bold"
                                placeholder="مثال: رقم الحوالة، اسم المودع..."
                            />
                        </div>
                    </div>

                    <DialogFooter className="bg-slate-50 p-6 border-t border-slate-100 sm:justify-start gap-3">
                        <Button
                            onClick={handleAddManualPayment}
                            disabled={!manualPaymentImage || !paymentForm.amount || !paymentForm.shipmentId}
                            className={`flex-1 h-14 rounded-2xl font-black text-lg shadow-xl text-white transition-all ${
                                manualPaymentImage && paymentForm.amount && paymentForm.shipmentId
                                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20' 
                                    : 'bg-slate-300 cursor-not-allowed shadow-none'
                            }`}
                        >
                            {!manualPaymentImage ? '⚠️ إرفاق الوصل أولاً' : 'تسجيل العمليـة'}
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => setIsAddingPayment(false)}
                            className="h-14 rounded-2xl font-bold bg-white text-slate-600 border-slate-200"
                        >
                            تجاهل
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AdminLayout>
    );
}
