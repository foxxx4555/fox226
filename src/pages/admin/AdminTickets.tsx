import { useEffect, useState } from 'react';
import AdminLayout from '@/components/AdminLayout'; // غيرناها لـ AdminLayout لتوحيد التصميم
import { supabase } from '@/integrations/supabase/client';
import {
  Loader2, MessageSquare, Ticket, Clock,
  CheckCircle2, ShieldAlert, User, Calendar, Search, Filter
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

export default function AdminTickets() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // 1. جلب التذاكر مع بيانات المستخدمين لحظياً
  const fetchTickets = async () => {
    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .select(`*, user:profiles(full_name, phone, status)`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTickets(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();

    // استماع لحظي (Real-time) لو تذكرة جديدة اتفتحت تظهر للأدمن فورا
    const channel = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets' }, () => {
        fetchTickets();
        new Audio('/new_ticket_alert.mp3').play().catch(() => { }); // تنبيه صوتي
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      open: 'bg-amber-100 text-amber-600 border-amber-200',
      in_progress: 'bg-blue-100 text-blue-600 border-blue-200',
      resolved: 'bg-emerald-100 text-emerald-600 border-emerald-200',
      closed: 'bg-slate-100 text-slate-500 border-slate-200',
    };
    const labels: Record<string, string> = {
      open: 'جديدة', in_progress: 'قيد العمل', resolved: 'تم الحل', closed: 'مغلقة'
    };
    return <Badge className={`${colors[status]} border font-black px-4`}>{labels[status] || status}</Badge>;
  };

  return (
    <AdminLayout>
      <div className="space-y-8 max-w-6xl mx-auto pb-20 px-4">

        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <h1 className="text-4xl font-black text-slate-900 flex items-center gap-4">
              <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-xl">
                <Ticket size={32} />
              </div>
              إدارة بلاغات الدعم الفني
            </h1>
            <p className="text-slate-400 font-bold mt-2 mr-16">تابع شكاوي المستخدمين وطلبات التوثيق العاجلة</p>
          </motion.div>

          <div className="relative w-full md:w-80">
            <Input
              placeholder="ابحث برقم التذكرة أو الموضوع..."
              className="h-14 rounded-2xl bg-white border-none shadow-sm font-bold pr-12"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-600" size={48} /></div>
        ) : (
          <div className="grid gap-6">
            <AnimatePresence>
              {tickets.map((ticket, idx) => (
                <motion.div
                  key={ticket.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                >
                  <Card className="rounded-[2.5rem] border-none shadow-md hover:shadow-xl transition-all bg-white overflow-hidden group">
                    <CardContent className="p-8">
                      <div className="flex flex-col lg:flex-row justify-between items-start gap-8">

                        <div className="flex-1 space-y-4">
                          <div className="flex flex-wrap items-center gap-3">
                            {getStatusBadge(ticket.status)}
                            {ticket.user?.status !== 'active' && (
                              <Badge className="bg-rose-50 text-rose-600 border-rose-100 border font-black animate-pulse">
                                <ShieldAlert size={14} className="me-1" /> طلب توثيق هوية
                              </Badge>
                            )}
                            <span className="text-xs font-bold text-slate-300 font-mono">#{ticket.id.substring(0, 8)}</span>
                          </div>

                          <h3 className="text-2xl font-black text-slate-800 group-hover:text-blue-600 transition-colors">
                            {ticket.subject}
                          </h3>
                          <p className="text-slate-500 font-bold leading-relaxed">
                            {ticket.message || "لا يوجد وصف إضافي للتذكرة."}
                          </p>

                          <div className="flex flex-wrap gap-6 pt-4 border-t border-slate-50">
                            <div className="flex items-center gap-2 text-slate-400 font-bold text-sm">
                              <User size={16} className="text-blue-500" /> {ticket.user?.full_name || 'مستخدم مجهول'}
                            </div>
                            <div className="flex items-center gap-2 text-slate-400 font-bold text-sm">
                              <Calendar size={16} className="text-amber-500" /> {new Date(ticket.created_at).toLocaleDateString('ar-SA')}
                            </div>
                          </div>
                        </div>

                        <div className="flex lg:flex-col gap-3 w-full lg:w-48">
                          <Button className="h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 font-black text-lg shadow-lg shadow-blue-500/20">
                            فتح المحادثة
                          </Button>
                          <Button variant="outline" className="h-14 rounded-2xl border-slate-100 font-bold hover:bg-emerald-50 hover:text-emerald-600 transition-all">
                            إغلاق التذكرة
                          </Button>
                        </div>

                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
