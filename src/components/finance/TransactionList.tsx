import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowUpRight, ArrowDownRight, FileText, Search, Download, AlertCircle, ExternalLink } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

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

const TransactionList: React.FC<TransactionListProps> = ({ transactions, loading, onViewDetails }) => {
    const [search, setSearch] = React.useState('');

    const filtered = transactions.filter(t =>
        t.description.toLowerCase().includes(search.toLowerCase()) ||
        t.transaction_id?.toLowerCase().includes(search.toLowerCase()) ||
        t.id?.toLowerCase().includes(search.toLowerCase())
    );

    const handleExportCSV = () => {
        if (filtered.length === 0) {
            toast.error("لا توجد بيانات لتصديرها");
            return;
        }

        const headers = ['رقم العملية', 'تاريخ', 'القيمة', 'النوع', 'الوصف'];
        const csvData = filtered.map(trx =>
            `${trx.transaction_id || trx.id},${new Date(trx.created_at).toLocaleDateString('ar-SA')},${trx.amount},${trx.type === 'credit' ? 'إيداع' : 'خصم'},"${trx.description?.replace(/"/g, '""') || ''}"`
        );

        // Use BOM to fix Arabic text in Excel
        const csvContent = ['\uFEFF' + headers.join(','), ...csvData].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `معاملات_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("تم تصدير كشف الحساب بنجاح");
    };

    const { userProfile } = useAuth();

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
        <Card className="rounded-[2.5rem] shadow-xl border-none bg-white flex flex-col overflow-hidden">
            <CardHeader className="px-8 pt-8 pb-4">
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
                        <Button
                            variant="outline"
                            onClick={handleExportCSV}
                            className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-blue-600 font-bold rounded-xl h-10 w-full md:w-auto"
                        >
                            <Download size={16} className="ml-2" /> تصدير (Excel)
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="px-8 pb-8">
                {loading ? (
                    <div className="space-y-3">
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
                    <div className="space-y-3">
                        {filtered.map((trx) => (
                            <div
                                key={trx.transaction_id || trx.id}
                                onClick={() => onViewDetails?.(trx)}
                                className={`flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100 transition-all group ${onViewDetails ? 'cursor-pointer hover:border-blue-200 hover:bg-blue-50/30' : ''}`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${trx.type === 'credit' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
                                        }`}>
                                        {trx.type === 'credit' ? <ArrowDownRight size={20} /> : <ArrowUpRight size={20} />}
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-800 text-sm group-hover:text-blue-600 transition-colors">
                                            {trx.description}
                                        </p>
                                        <p className="text-xs text-slate-400 font-bold mt-1">
                                            {new Date(trx.created_at).toLocaleDateString('ar-SA')} - {new Date(trx.created_at).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-left flex flex-col items-end gap-2">
                                    <p className={`font-black tracking-tight text-lg ${trx.type === 'credit' ? 'text-emerald-600' : 'text-slate-900'
                                        }`} dir="ltr">
                                        {trx.type === 'credit' ? '+' : '-'}{trx.amount.toLocaleString()} <span className="text-xs">ر.س</span>
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={(e) => handleDispute(e, trx)}
                                            className="h-6 px-2 text-[10px] text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md font-bold transition-colors opacity-0 group-hover:opacity-100"
                                            title="الاعتراض على هذه العملية"
                                        >
                                            <AlertCircle size={12} className="ml-1" /> اعتراض
                                        </Button>

                                        {trx.shipment_id && (
                                            <Badge
                                                variant="outline"
                                                className="bg-white border-slate-200 text-slate-500 text-[10px] px-2 py-0 cursor-pointer hover:bg-slate-50 hover:text-blue-600 transition-colors"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    window.open(`/loads/${trx.shipment_id}`, '_blank');
                                                }}
                                            >
                                                شحنة #{trx.shipment_id.substring(0, 8)} <ExternalLink size={10} className="mr-1 inline-block" />
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default TransactionList;
