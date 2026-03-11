import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowUpRight, ArrowDownRight, FileText, Search, Download, AlertCircle, ExternalLink } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { cairoBase64 } from './cairo-base64';

interface Transaction {
    transaction_id: string;
    amount: number;
    type: 'credit' | 'debit';
    description: string;
    created_at: string;
    shipment_id?: string;
}

interface TransactionListProps {
    transactions: any[];
    loading?: boolean;
    onViewDetails?: (trx: any) => void;
}

const TransactionTable: React.FC<{
    data: any[],
    onViewDetails?: (t: any) => void,
    handleDispute: (e: any, t: any) => void
}> = ({ data, onViewDetails, handleDispute }) => (
    <div className="overflow-x-auto">
        <table className="w-full text-right border-collapse">
            <thead>
                <tr className="bg-slate-50/80 text-slate-400 text-[10px] md:text-[11px] uppercase font-black tracking-wider">
                    <th className="p-3 md:p-4 pr-6 md:pr-8">رقم العملية</th>
                    <th className="p-3 md:p-4 text-center">سحب / سداد (-)</th>
                    <th className="p-3 md:p-4 text-center">إيداع / إيراد (+)</th>
                    <th className="p-3 md:p-4 text-center">الرصيد</th>
                    <th className="p-4 text-left pl-8">التاريخ</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
                {data.map((t) => (
                    <tr
                        key={t.transaction_id || t.id}
                        onClick={() => onViewDetails?.(t)}
                        className="hover:bg-blue-50/50 transition-colors group cursor-pointer"
                    >
                        <td className="p-4 pr-8">
                            <code className="bg-slate-100 text-slate-600 px-2 py-1 rounded-lg text-[10px] font-bold">
                                {t.receipt_number || (t.transaction_id || t.id).substring(0, 8).toUpperCase()}
                            </code>
                            <p className="text-[10px] text-slate-400 font-bold mt-1 truncate max-w-[150px]">{t.description}</p>
                        </td>
                        <td className="p-4 text-center">
                            <span className={`font-black text-sm ${t.type === 'expense' || t.type === 'debit' ? 'text-rose-600' : 'text-slate-300'}`}>
                                {t.type === 'expense' || t.type === 'debit' ? t.amount.toLocaleString() : '--'}
                            </span>
                        </td>
                        <td className="p-4 text-center">
                            <span className={`font-black text-sm ${t.type === 'income' || t.type === 'credit' ? 'text-emerald-600' : 'text-slate-300'}`}>
                                {t.type === 'income' || t.type === 'credit' ? t.amount.toLocaleString() : '--'}
                            </span>
                        </td>
                        <td className="p-4 text-center">
                            <span className="font-black text-sm text-slate-700">
                                {Number(t.running_balance || 0).toLocaleString()}
                            </span>
                        </td>
                        <td className="p-4 text-left pl-8">
                            <div className="flex flex-col items-end">
                                <span className="font-bold text-slate-700 text-xs">
                                    {new Date(t.created_at || t.date).toLocaleDateString('ar-SA')}
                                </span>
                            </div>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

const TransactionList: React.FC<TransactionListProps> = ({ transactions, loading, onViewDetails }) => {
    const [search, setSearch] = React.useState('');
    const { userProfile } = useAuth();

    const filtered = transactions.filter(t =>
        t.description.toLowerCase().includes(search.toLowerCase()) ||
        t.transaction_id?.toLowerCase().includes(search.toLowerCase()) ||
        t.id?.toLowerCase().includes(search.toLowerCase())
    );

    const mainDisplayList = filtered.slice(0, 10);

    const handleExportExcel = () => {
        if (filtered.length === 0) {
            toast.error("لا توجد بيانات لتصديرها");
            return;
        }

        const worksheetData = filtered.map(trx => ({
            'التاريخ': new Date(trx.created_at).toLocaleDateString('ar-SA'),
            'رقم العملية': trx.transaction_id || trx.id,
            'نوع المعاملة': trx.type === 'debit' ? 'خصم (-)' : 'إيداع (+)',
            'الوصف': trx.description,
            'المبلغ (ر.س)': trx.amount
        }));

        const worksheet = XLSX.utils.json_to_sheet(worksheetData);

        // إعداد عرض الأعمدة (برمجياً)
        worksheet['!cols'] = [
            { wch: 15 }, // التاريخ
            { wch: 33 }, // رقم العملية (كما طلب المستخدم)
            { wch: 15 }, // نوع المعاملة
            { wch: 24 }, // الوصف (كما طلب المستخدم)
            { wch: 12 }, // المبلغ
        ];

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "المعاملات");
        XLSX.writeFile(workbook, `سجل_معاملات_شاحن_${new Date().toISOString().split('T')[0]}.xlsx`);
        toast.success("تم تصدير ملف Excel بنجاح بالأحجام المطلوبة");
    };

    const handleExportPDF = async () => {
        if (filtered.length === 0) {
            toast.error("لا توجد بيانات لتصديرها");
            return;
        }

        try {
            toast.loading("يتم الآن تجهيز كشف الحساب PDF...", { id: 'pdf-gen' });
            const doc = new jsPDF('p', 'pt', 'a4');

            // تم تضمين الخط كـ Base64 لضمان عمل التصدير حتى عند انقطاع الإنترنت
            // تم التأكد من ترميز الملف بشكل سليم لتجنب TypeError
            doc.addFileToVFS('Cairo-Regular.ttf', cairoBase64);
            doc.addFont('Cairo-Regular.ttf', 'Cairo', 'normal');
            doc.setFont('Cairo', 'normal');

            const tableColumn = ["المبلغ", "البيان / الوصف", "نوع العملية", "رقم المرجع", "تاريخ العملية"];
            const tableRows = filtered.map(trx => [
                `${trx.type === 'debit' ? '-' : '+'}${Number(trx.amount).toLocaleString()} ر.س`,
                trx.description || 'لا يوجد وصف',
                trx.type === 'debit' ? 'سحب / مصاريف' : 'إيداع / إيراد',
                (trx.transaction_id || trx.id || '').substring(0, 10).toUpperCase(),
                new Date(trx.created_at).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' })
            ]);

            autoTable(doc, {
                head: [tableColumn],
                body: tableRows,
                styles: { font: 'Cairo', fontStyle: 'normal', halign: 'right', fontSize: 10, cellPadding: 8 },
                headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], font: 'Cairo', fontStyle: 'normal', fontSize: 11 },
                columnStyles: {
                    0: { cellWidth: 80, halign: 'left' }, // المبلغ (English/Numbers often left-aligned even in RTL for readability)
                    1: { cellWidth: 'auto' },            // الوصف
                    2: { cellWidth: 80 },              // النوع
                    3: { cellWidth: 80 },              // رقم العملية
                    4: { cellWidth: 100 }              // التاريخ
                },
                margin: { top: 60 },
                didDrawPage: (data) => {
                    doc.setFont('Cairo', 'normal');
                    doc.setFontSize(16);
                    doc.setTextColor(15, 23, 42);
                    doc.text("كشف حساب المعاملات المالية - Fox Logistics", data.settings.margin.left, 40);
                }
            });

            doc.save(`كشف_حساب_${new Date().toISOString().split('T')[0]}.pdf`);
            toast.success("تم إصدار كشف الحساب PDF بنجاح", { id: 'pdf-gen' });
        } catch (error) {
            console.error("PDF generation error:", error);
            toast.error("فشل تصدير PDF، تأكد من اتصال الإنترنت لتحميل الخطوط", { id: 'pdf-gen' });
        }
    };

    const handleDispute = async (e: React.MouseEvent, trx: any) => {
        e.stopPropagation();
        if (!userProfile) {
            toast.error("يجب تسجيل الدخول لتقديم اعتراض");
            return;
        }

        const reason = window.prompt("تفاصيل الاعتراض على هذه العملية:");
        if (reason) {
            try {
                const { error } = await supabase.from('support_tickets').insert([{
                    user_id: userProfile.id,
                    subject: `اعتراض على عملية #${String(trx.transaction_id || trx.id).substring(0, 8)}`,
                    message: `تفاصيل الاعتراض: ${reason}\nقيمة العملية: ${trx.amount} ر.س\nتاريخ العملية: ${new Date(trx.created_at).toLocaleString('ar-SA')}`,
                    status: 'pending',
                    priority: 'high'
                }]);

                if (error) throw error;

                toast.success(`تم إرسال اعتراضك بنجاح. سنقوم بالمراجعة والتواصل معك قريباً.`);
            } catch (err) {
                console.error("Dispute error:", err);
                toast.error("فشل إرسال الاعتراض، يرجى المحاولة لاحقاً");
            }
        }
    };

    return (
        <Card className="rounded-[2rem] md:rounded-[2.5rem] shadow-xl border-none bg-white flex flex-col overflow-hidden">
            <CardHeader className="px-4 md:px-8 pt-6 md:pt-8 pb-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <CardTitle className="text-xl font-black text-slate-800 flex items-center gap-2">
                        <FileText className="text-blue-500" size={24} />
                        سجل المعاملات المالي
                    </CardTitle>
                    <div className="flex flex-col md:flex-row gap-3">
                        <div className="relative w-full md:w-64">
                            <Input
                                placeholder="البحث في المعاملات..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="h-10 pl-10 pr-4 bg-slate-50 border-none rounded-xl font-bold focus-visible:ring-1 ring-blue-500 transition-all"
                            />
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2">
                            <Button
                                variant="outline"
                                onClick={handleExportExcel}
                                className="bg-emerald-50 border-emerald-100 text-emerald-700 hover:bg-emerald-100 font-bold rounded-xl h-10 px-4 transition-all"
                            >
                                <Download size={16} className="ml-2" /> إكسل (Excel)
                            </Button>
                            <Button
                                variant="outline"
                                onClick={handleExportPDF}
                                className="bg-rose-50 border-rose-100 text-rose-700 hover:bg-rose-100 font-bold rounded-xl h-10 px-4 transition-all"
                            >
                                <FileText size={16} className="ml-2" /> كشف حساب (PDF)
                            </Button>
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="px-0 pb-0">
                {loading ? (
                    <div className="px-8 pb-8 space-y-3">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100 animate-pulse">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-slate-200 rounded-xl"></div>
                                    <div className="space-y-2">
                                        <div className="h-4 w-40 bg-slate-200 rounded"></div>
                                        <div className="h-3 w-28 bg-slate-200 rounded"></div>
                                    </div>
                                </div>
                                <div className="h-6 w-24 bg-slate-200 rounded"></div>
                            </div>
                        ))}
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="py-20 text-center text-slate-400 font-bold">لا يوجد سجل معاملات حالياً</div>
                ) : (
                    <>
                        <TransactionTable
                            data={mainDisplayList}
                            onViewDetails={onViewDetails}
                            handleDispute={handleDispute}
                        />

                        {filtered.length > 10 && (
                            <div className="p-4 border-t border-slate-50 flex justify-center bg-slate-50/30">
                                <Sheet>
                                    <SheetTrigger asChild>
                                        <Button variant="ghost" className="text-blue-600 font-bold text-sm hover:bg-blue-50">
                                            عرض السجل بالكامل ({filtered.length})
                                        </Button>
                                    </SheetTrigger>
                                    <SheetContent side="left" className="w-full sm:max-w-4xl p-0 border-none shadow-2xl overflow-hidden flex flex-col">
                                        <SheetHeader className="p-8 bg-slate-900 text-white">
                                            <SheetTitle className="text-2xl font-black text-white flex items-center justify-between">
                                                <span>سجل المعاملات الكامل</span>
                                                <Badge className="bg-primary text-white border-none px-4 py-1 rounded-xl">
                                                    {filtered.length} عملية
                                                </Badge>
                                            </SheetTitle>
                                        </SheetHeader>
                                        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-white">
                                            <TransactionTable
                                                data={filtered}
                                                onViewDetails={onViewDetails}
                                                handleDispute={handleDispute}
                                            />
                                        </div>
                                    </SheetContent>
                                </Sheet>
                            </div>
                        )}
                    </>
                )}
            </CardContent>
        </Card>
    );
};

export default TransactionList;
