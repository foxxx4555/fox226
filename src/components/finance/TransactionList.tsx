import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowUpRight, ArrowDownRight, FileText, Search, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface Transaction {
    transaction_id: string;
    amount: number;
    type: 'credit' | 'debit';
    description: string;
    created_at: string;
    shipment_id?: string;
}

interface TransactionListProps {
    transactions: Transaction[];
    loading?: boolean;
}

const TransactionList: React.FC<TransactionListProps> = ({ transactions, loading }) => {
    const [search, setSearch] = React.useState('');

    const filtered = transactions.filter(t =>
        t.description.toLowerCase().includes(search.toLowerCase()) ||
        t.transaction_id.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <Card className="rounded-[2.5rem] shadow-xl border-none bg-white flex flex-col overflow-hidden">
            <CardHeader className="px-8 pt-8 pb-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <CardTitle className="text-xl font-black text-slate-800 flex items-center gap-2">
                        <FileText className="text-blue-500" size={24} />
                        سجل المعاملات المالي
                    </CardTitle>
                    <div className="relative w-full md:w-64">
                        <Input
                            placeholder="البحث في المعاملات..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="h-10 pl-10 pr-4 bg-slate-50 border-none rounded-xl font-bold"
                        />
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    </div>
                </div>
            </CardHeader>
            <CardContent className="px-8 pb-8">
                {loading ? (
                    <div className="py-20 text-center text-slate-400 font-bold">جاري تحميل المعاملات...</div>
                ) : filtered.length === 0 ? (
                    <div className="py-20 text-center text-slate-400 font-bold">لا يوجد سجل معاملات حالياً</div>
                ) : (
                    <div className="space-y-3">
                        {filtered.map((trx) => (
                            <div
                                key={trx.transaction_id}
                                className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:border-blue-100 transition-all group"
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
                                <div className="text-left">
                                    <p className={`font-black tracking-tight text-lg ${trx.type === 'credit' ? 'text-emerald-600' : 'text-slate-900'
                                        }`} dir="ltr">
                                        {trx.type === 'credit' ? '+' : '-'}{trx.amount.toLocaleString()} <span className="text-xs">ر.س</span>
                                    </p>
                                    {trx.shipment_id && (
                                        <Badge variant="outline" className="mt-1 bg-white border-slate-100 text-slate-400 text-[10px] px-2 py-0">
                                            شحنة #{trx.shipment_id.substring(0, 8)}
                                        </Badge>
                                    )}
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
