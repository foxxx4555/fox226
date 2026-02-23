import { useEffect, useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Search, MessageSquare, AlertCircle, CheckCircle2, Clock, Ticket } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function AdminSupport() {
    const [tickets, setTickets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    const fetchTickets = async () => {
        try {
            const { data, error } = await supabase
                .from('support_tickets')
                .select(`
          *,
          user:profiles!support_tickets_user_id_fkey(full_name, phone)
        `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setTickets(data || []);
        } catch (e) {
            console.error(e);
            toast.error('حدث خطأ أثناء جلب تذاكر الدعم');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTickets();
    }, []);

    const handleUpdateStatus = async (ticketId: string, newStatus: string) => {
        try {
            const { error } = await supabase
                .from('support_tickets')
                .update({ status: newStatus, updated_at: new Date().toISOString() })
                .eq('id', ticketId);

            if (error) throw error;

            toast.success('تم تحديث حالة التذكرة بنجاح');
            fetchTickets();
        } catch (e) {
            toast.error('فشل تحديث التذكرة');
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'open':
                return <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">مفتوحة</Badge>;
            case 'in_progress':
                return <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">قيد المعالجة</Badge>;
            case 'resolved':
            case 'closed':
                return <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50">مغلقة</Badge>;
            default:
                return <Badge variant="outline" className="text-slate-600 border-slate-200 bg-slate-50">{status}</Badge>;
        }
    };

    const filteredTickets = tickets.filter(ticket =>
        ticket.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <AdminLayout>
            <div className="space-y-8 max-w-7xl mx-auto pb-20">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                            <MessageSquare className="text-blue-600" size={32} />
                            مركز الدعم والبلاغات
                        </h1>
                        <p className="text-muted-foreground font-medium mt-2">إدارة ومتابعة طلبات الدعم الخاصة بالسائقين والتجار</p>
                    </div>

                    <div className="relative w-full md:w-96">
                        <Input
                            placeholder="ابحث برقم التذكرة أو المحتوى..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="h-12 pl-12 pr-4 bg-white border-slate-200 rounded-xl font-bold shadow-sm w-full"
                        />
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <Loader2 className="animate-spin text-blue-600" size={48} />
                    </div>
                ) : filteredTickets.length === 0 ? (
                    <div className="text-center py-24 bg-white rounded-[3rem] border-2 border-dashed border-slate-200">
                        <Ticket size={64} className="mx-auto text-slate-300 mb-4" />
                        <p className="font-bold text-slate-500 text-lg">لا توجد أي تذاكر دعم حالياً</p>
                    </div>
                ) : (
                    <div className="grid gap-6">
                        {filteredTickets.map(ticket => (
                            <Card key={ticket.id} className="rounded-[2rem] border-none shadow-md hover:shadow-xl transition-all bg-white overflow-hidden">
                                <div className="p-6 border-b border-slate-50 flex flex-col md:flex-row justify-between gap-4">
                                    <div className="w-full">
                                        <div className="flex items-center gap-3 mb-3">
                                            {getStatusBadge(ticket.status)}
                                            <Badge variant="secondary" className="bg-slate-100 text-slate-600">
                                                {ticket.priority === 'high' ? 'أولوية عالية' : ticket.priority === 'low' ? 'أولوية منخفضة' : 'أولوية متوسطة'}
                                            </Badge>
                                            <span className="text-xs font-black text-slate-400">#{ticket.id?.substring(0, 8)}</span>
                                            <span className="text-xs font-bold text-slate-400 mr-auto">{new Date(ticket.created_at).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                        <h3 className="text-xl font-black text-slate-800 mb-2">{ticket.subject}</h3>
                                        <p className="text-slate-600 leading-relaxed text-sm">{ticket.description}</p>
                                    </div>
                                </div>

                                <div className="p-6 bg-slate-50 flex flex-col md:flex-row items-center justify-between gap-6">
                                    <div className="flex items-center gap-4 w-full md:w-auto">
                                        <div className="w-12 h-12 rounded-xl bg-slate-200 text-slate-500 flex items-center justify-center font-bold text-lg">
                                            ؟
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black tracking-wider text-slate-400 mb-1">صاحب التذكرة</p>
                                            <p className="font-bold text-slate-800 text-sm">{ticket.user?.full_name || 'مستخدم غير معروف'}</p>
                                            <p className="font-bold text-slate-500 text-xs" dir="ltr">{ticket.user?.phone || 'لا يوجد رقم'}</p>
                                        </div>
                                    </div>

                                    <div className="flex gap-2 w-full md:w-auto">
                                        {ticket.status !== 'in_progress' && ticket.status !== 'closed' && ticket.status !== 'resolved' && (
                                            <Button
                                                onClick={() => handleUpdateStatus(ticket.id, 'in_progress')}
                                                className="h-10 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white"
                                            >
                                                بدء المعالجة
                                            </Button>
                                        )}
                                        {ticket.status !== 'closed' && ticket.status !== 'resolved' && (
                                            <Button
                                                onClick={() => handleUpdateStatus(ticket.id, 'closed')}
                                                variant="outline"
                                                className="h-10 rounded-xl font-bold border-slate-200 text-slate-600 hover:bg-slate-100/50 hover:text-emerald-600"
                                            >
                                                إغلاق التذكرة
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
