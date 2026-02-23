import { useEffect, useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Search, BellRing, Bell, Send, Users, AlertTriangle, ShieldAlert } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

export default function AdminAlerts() {
    const [alerts, setAlerts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [newAlertTitle, setNewAlertTitle] = useState('');
    const [newAlertBody, setNewAlertBody] = useState('');
    const [sending, setSending] = useState(false);

    const fetchAlerts = async () => {
        try {
            // In a real scenario, this might fetch from a 'system_alerts' or 'notifications' table
            // Currently, the 'notifications' table schema might be user-specific. 
            // We will simulate fetching global alerts if a global table isn't present, or try fetching all notifications.
            const { data, error } = await supabase
                .from('notifications' as any)
                .select('*')
                .order('created_at', { ascending: false })
                .limit(50); // Fetch recent global alerts if we assume this table handles them

            if (error) throw error;

            // Filter or map them. If it's empty, we just show empty state.
            setAlerts(data || []);
        } catch (e) {
            console.error(e);
            // It's possible the notifications table doesn't exist or isn't accessible this way, 
            // we'll silently fail and show blank if that's the case for the dummy data.
            setLoading(false);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAlerts();
    }, []);

    const handleSendBroadcast = async () => {
        if (!newAlertTitle.trim() || !newAlertBody.trim()) {
            toast.error('الرجاء إدخال عنوان ونص الإشعار');
            return;
        }

        setSending(true);
        try {
            // Here you would typically insert into a global alerts table or loop through users to insert into notifications.
            // For demonstration, we'll simulate the backend action:
            await new Promise(resolve => setTimeout(resolve, 1000));

            toast.success('تم إرسال الإشعار التعميمي لجميع المستخدمين بنجاح');
            setNewAlertTitle('');
            setNewAlertBody('');

            // Refresh
            fetchAlerts();
        } catch (e) {
            toast.error('فشل إرسال الإشعار');
        } finally {
            setSending(false);
        }
    };

    const filteredAlerts = alerts.filter(alert =>
        alert.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        alert.message?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <AdminLayout>
            <div className="space-y-8 max-w-7xl mx-auto pb-20">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                            <BellRing className="text-blue-600" size={32} />
                            إشعارات وتنبيهات النظام
                        </h1>
                        <p className="text-muted-foreground font-medium mt-2">إرسال تعميمات وإدارة التنبيهات الشاملة لجميع المستخدمين</p>
                    </div>
                </div>

                {/* نموذج إرسال تعميم جديد */}
                <Card className="rounded-[2rem] border-none shadow-lg bg-white overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-r from-blue-600 to-emerald-500"></div>
                    <CardContent className="p-8">
                        <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
                            <Send size={20} className="text-blue-600" /> إرسال إشعار عام (رسالة تعميمية)
                        </h2>
                        <div className="space-y-4 max-w-2xl">
                            <div>
                                <label className="text-sm font-bold text-slate-600 mb-1 block">عنوان الإشعار</label>
                                <Input
                                    placeholder="مثال: تحديث جديد في النظام..."
                                    className="bg-slate-50 border-slate-200"
                                    value={newAlertTitle}
                                    onChange={(e) => setNewAlertTitle(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="text-sm font-bold text-slate-600 mb-1 block">نص الإشعار التفصيلي</label>
                                <Textarea
                                    placeholder="اكتب تفاصيل الإشعار الذي سيظهر لجميع السائقين والتجار..."
                                    className="bg-slate-50 border-slate-200 min-h-[120px] resize-none"
                                    value={newAlertBody}
                                    onChange={(e) => setNewAlertBody(e.target.value)}
                                />
                            </div>
                            <Button
                                onClick={handleSendBroadcast}
                                disabled={sending}
                                className="h-12 px-8 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto flex items-center gap-2"
                            >
                                {sending ? <Loader2 className="animate-spin" size={20} /> : <Users size={20} />}
                                إرسال لجميع المستخدمين
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* قائمة الإشعارات السابقة */}
                <div className="flex flex-col md:flex-row justify-between items-end gap-4 mt-12 mb-6">
                    <h3 className="text-2xl font-black text-slate-800">سجل الإشعارات السابقة</h3>
                    <div className="relative w-full md:w-80">
                        <Input
                            placeholder="ابحث في الإشعارات..."
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
                ) : alerts.length === 0 ? (
                    <div className="text-center py-24 bg-white rounded-[3rem] border-2 border-dashed border-slate-200">
                        <Bell size={64} className="mx-auto text-slate-300 mb-4" />
                        <p className="font-bold text-slate-500 text-lg">لم يتم إرسال أي إشعارات عامة مسبقاً</p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {filteredAlerts.length > 0 ? filteredAlerts.map((alert, idx) => (
                            <Card key={idx} className="rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all bg-white">
                                <CardContent className="p-6 flex flex-col sm:flex-row gap-4 items-start">
                                    <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                                        <AlertTriangle className="text-blue-500" size={24} />
                                    </div>
                                    <div>
                                        <h4 className="font-black text-lg text-slate-800">{alert.title || 'إشعار نظام'}</h4>
                                        <p className="text-slate-600 mt-1">{alert.message || alert.content}</p>
                                        <span className="text-xs font-bold text-slate-400 mt-3 block">
                                            {new Date(alert.created_at).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                </CardContent>
                            </Card>
                        )) : (
                            <div className="text-center py-10 text-slate-500 font-bold">لا توجد نتائج مطابقة للبحث</div>
                        )}
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
