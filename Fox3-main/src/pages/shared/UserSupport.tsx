import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, MessageSquare, Clock, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function UserSupport() {
    const { userProfile } = useAuth();
    const [tickets, setTickets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showNewForm, setShowNewForm] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // New ticket form
    const [subject, setSubject] = useState('');
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState('medium');

    const fetchTickets = async () => {
        if (!userProfile?.id) return;
        try {
            const { data, error } = await supabase
                .from('support_tickets')
                .select('*')
                .eq('user_id', userProfile.id)
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
    }, [userProfile?.id]);

    const handleSubmitTicket = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!subject.trim() || !description.trim()) {
            toast.error('الرجاء إدخال عنوان ووصف التذكرة');
            return;
        }

        setSubmitting(true);
        try {
            const { error } = await supabase.from('support_tickets').insert({
                user_id: userProfile?.id,
                subject,
                message: description,
                priority,
                status: 'open'
            });

            if (error) throw error;

            toast.success('تم إرسال تذكرة الدعم الفني بنجاح');
            setShowNewForm(false);
            setSubject('');
            setDescription('');
            setPriority('medium');
            fetchTickets();
        } catch (e) {
            console.error(e);
            toast.error('حدث خطأ أثناء إرسال التذكرة');
        } finally {
            setSubmitting(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'open':
                return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-none">مفتوحة</Badge>;
            case 'in_progress':
                return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-none">قيد المعالجة</Badge>;
            case 'closed':
            case 'resolved':
                return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none">مغلقة</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    return (
        <AppLayout>
            <div className="space-y-6 max-w-5xl mx-auto pb-20">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                            <MessageSquare className="text-blue-600" size={32} /> الدعم الفني والمساعدة
                        </h1>
                        <p className="text-slate-500 font-bold mt-2">نحن هنا لمساعدتك. تتبع تذاكر الدعم الخاصة بك أو افتح تذكرة جديدة.</p>
                    </div>
                    <Button
                        onClick={() => setShowNewForm(!showNewForm)}
                        className="rounded-xl font-bold bg-blue-600 flex items-center gap-2"
                    >
                        <Plus size={18} /> تذكرة جديدة
                    </Button>
                </div>

                {showNewForm && (
                    <Card className="rounded-[2rem] border-blue-100 border-2 shadow-sm bg-blue-50/50">
                        <CardContent className="p-6 md:p-8">
                            <h2 className="text-xl font-black text-blue-900 mb-6">فتح تذكرة دعم صيانة أو استفسار</h2>
                            <form onSubmit={handleSubmitTicket} className="space-y-4">
                                <div>
                                    <label className="text-sm font-bold text-slate-700 mb-1 block">عنوان المشكلة أو الاستفسار</label>
                                    <Input
                                        value={subject}
                                        onChange={e => setSubject(e.target.value)}
                                        placeholder="مثال: مشكلة في سداد الدفعة، استفسار عن رحلة..."
                                        className="bg-white border-slate-200"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="text-sm font-bold text-slate-700 mb-1 block">الأولوية</label>
                                    <select
                                        title="أولوية التذكرة"
                                        value={priority}
                                        onChange={e => setPriority(e.target.value)}
                                        className="w-full h-10 px-3 rounded-md border border-slate-200 bg-white text-sm"
                                    >
                                        <option value="low">منخفضة</option>
                                        <option value="medium">متوسطة</option>
                                        <option value="high">عالية (عاجل طارئ)</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="text-sm font-bold text-slate-700 mb-1 block">تفاصيل المشكلة بدقة</label>
                                    <Textarea
                                        value={description}
                                        onChange={e => setDescription(e.target.value)}
                                        placeholder="اشرح مشكلتك بالتفصيل ليتمكن فريق الدعم من مساعدتك بأسرع وقت..."
                                        className="bg-white border-slate-200 min-h-[120px] resize-none"
                                        required
                                    />
                                </div>

                                <div className="flex justify-end gap-3 pt-4">
                                    <Button type="button" variant="ghost" onClick={() => setShowNewForm(false)} className="font-bold">
                                        إلغاء
                                    </Button>
                                    <Button type="submit" disabled={submitting} className="bg-blue-600 font-bold px-8">
                                        {submitting ? <Loader2 className="animate-spin" /> : 'إرسال التذكرة للإدارة'}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                )}

                {loading ? (
                    <div className="flex justify-center py-20">
                        <Loader2 className="animate-spin text-blue-600" size={48} />
                    </div>
                ) : tickets.length === 0 ? (
                    <Card className="rounded-[2rem] border-dashed border-2 bg-slate-50">
                        <CardContent className="flex flex-col items-center justify-center py-20 text-center">
                            <CheckCircle className="text-slate-300 mb-4" size={64} />
                            <h3 className="text-xl font-black text-slate-800">لا يوجد لديك تذاكر دعم سابقة</h3>
                            <p className="text-slate-500 font-bold mt-2">كل شيء يبدو على ما يرام. إذا واجهتك مشكلة، لا تتردد في مراسلتنا.</p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-4">
                        {tickets.map(ticket => (
                            <Card key={ticket.id} className="rounded-2xl border-slate-100 hover:shadow-md transition-shadow">
                                <CardContent className="p-6">
                                    <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                                        <div>
                                            <div className="flex items-center gap-3 mb-2">
                                                <h3 className="text-lg font-black text-slate-800">{ticket.subject}</h3>
                                                {getStatusBadge(ticket.status)}
                                                {ticket.priority === 'high' && <Badge variant="destructive" className="border-none">عاجل طارئ</Badge>}
                                            </div>
                                            <p className="text-slate-600 text-sm line-clamp-2">{ticket.description}</p>
                                        </div>

                                        <div className="flex items-center gap-2 text-slate-400 text-sm font-bold md:flex-col md:items-end md:gap-1 shrink-0">
                                            <Clock size={14} />
                                            <span dir="ltr">
                                                {new Date(ticket.created_at).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' })}
                                            </span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
