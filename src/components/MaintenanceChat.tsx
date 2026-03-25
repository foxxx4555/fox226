import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, User, Bot, Loader2, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { toast } from 'sonner';

interface Message {
    id: string;
    sender_id: string;
    message: string;
    created_at: string;
    profiles?: { full_name: string };
}

export default function MaintenanceChat({ requestId, currentUserId, status }: { requestId: string, currentUserId: string, status?: string }) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const scrollRef = useRef<HTMLDivElement>(null);

    const fetchMessages = async () => {
        setLoading(true);
        console.log(`🔍 MaintenanceChat: Fetching messages for request: ${requestId}`);
        try {
            // محاولة الجلب مع الربط الصريح لجلب اسم المرسل
            let { data, error } = await supabase
                .from('maintenance_messages' as any)
                .select('*, profiles!sender_id(full_name)') // استخدام ! لتحديد العمود يدوياً لتجنب غموض العلاقات
                .eq('request_id', requestId)
                .order('created_at', { ascending: true });

            // إذا فشل الربط بسبب نقص علاقة مفتاح خارجي (PGRST200)
            if (error && (error as any).code === 'PGRST200') {
                console.warn("⚠️ MaintenanceChat: Foreign key missing, fetching raw messages...");
                const fallback = await supabase
                    .from('maintenance_messages' as any)
                    .select('*')
                    .eq('request_id', requestId)
                    .order('created_at', { ascending: true });
                data = fallback.data;
                error = fallback.error;
            }

            if (error) {
                console.error("❌ MaintenanceChat: Error fetching messages:", error);
            } else {
                console.log(`✅ MaintenanceChat: Successfully fetched ${data?.length || 0} messages`);
                setMessages(data as any || []);
            }
        } catch (err) {
            console.error("❌ MaintenanceChat: Catch-all error fetching messages:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMessages();

        const channel = supabase
            .channel(`chat-${requestId}`)
            .on('postgres_changes' as any,
                { event: 'INSERT', schema: 'public', table: 'maintenance_messages', filter: `request_id=eq.${requestId}` },
                (payload: any) => {
                    setMessages(prev => [...prev, payload.new as Message]);
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [requestId]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        const { error } = await supabase
            .from('maintenance_messages' as any)
            .insert({
                request_id: requestId,
                sender_id: currentUserId,
                message: newMessage.trim()
            } as any);

        if (!error) setNewMessage('');
    };

    const handleDeleteMessages = async () => {
        if (!confirm("هل أنت متأكد من إنهاء المحادثة ومسح كافة الرسائل؟ لا يمكن التراجع عن هذا الإجراء.")) return;
        
        const { error } = await supabase
            .from('maintenance_messages' as any)
            .delete()
            .eq('request_id', requestId);

        if (error) {
            toast.error("فشل مسح المحادثة");
        } else {
            setMessages([]);
            toast.success("تم إغلاق المحادثة ومسح السجل");
        }
    };

    return (
        <div className="flex flex-col h-[500px] bg-slate-50 rounded-[2rem] overflow-hidden border border-slate-100 shadow-inner">
            <div className="p-4 bg-white border-b flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <h3 className="font-black text-slate-800 flex items-center gap-2">
                        <Send size={18} className="text-blue-500" /> المحادثة الفورية
                    </h3>
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={handleDeleteMessages}
                        className="text-rose-500 hover:bg-rose-50 hover:text-rose-600 h-8 rounded-lg px-2 gap-1 font-bold text-[10px]"
                    >
                        <Trash2 size={12} /> إغلاق المحادثة ومسح السجل
                    </Button>
                </div>
                <span className="hidden sm:inline text-[10px] font-bold text-slate-400">نظام تواصل مباشر</span>
            </div>

            <ScrollArea className="flex-1 p-6" ref={scrollRef}>
                <div className="space-y-4">
                    {loading ? (
                        <div className="flex justify-center p-10"><Loader2 className="animate-spin text-blue-500" /></div>
                    ) : messages.length === 0 ? (
                        <div className="text-center py-10 opacity-40 text-sm font-bold">
                            {status === 'resolved' ? 'المحادثة مغلقة نظراً لانتهاء الطلب' : 'لا توجد رسائل بعد.. ابدأ المحادثة'}
                        </div>
                    ) : (
                        messages.map((msg) => {
                            const isMe = msg.sender_id === currentUserId;
                            return (
                                <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                    <div className={`max-w-[80%] p-4 rounded-2xl text-sm font-medium shadow-sm ${isMe ? 'bg-blue-600 text-white rounded-tl-none' : 'bg-white text-slate-800 rounded-tr-none'
                                        }`}>
                                        {msg.message}
                                    </div>
                                    <span className="text-[9px] font-bold text-slate-400 mt-1 px-1">
                                        {format(new Date(msg.created_at), 'p', { locale: ar })}
                                    </span>
                                </div>
                            );
                        })
                    )}
                </div>
            </ScrollArea>

            {status !== 'resolved' ? (
                <form onSubmit={handleSendMessage} className="p-4 bg-white border-t flex gap-2">
                    <Input
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="اكتب رسالتك هنا..."
                        className="rounded-xl bg-slate-50 border-none font-medium h-12"
                    />
                    <Button type="submit" size="icon" className="h-12 w-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shrink-0">
                        <Send size={20} />
                    </Button>
                </form>
            ) : (
                <div className="p-4 bg-slate-100 border-t text-center text-slate-500 font-bold text-xs">
                    🔒 تم إغلاق هذه المحادثة من قبل الإدارة لانتهاء الإصلاح.
                </div>
            )}
        </div>
    );
}
