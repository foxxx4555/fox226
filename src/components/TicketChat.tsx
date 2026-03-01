import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Loader2, User as UserIcon, Shield, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';

interface Message {
    id: string;
    ticket_id: string;
    sender_id: string;
    message: string;
    created_at: string;
}

interface TicketChatProps {
    ticketId: string;
    isClosed?: boolean;
}

export default function TicketChat({ ticketId, isClosed = false }: TicketChatProps) {
    const { userProfile } = useAuth();
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // التمرير التلقائي لأسفل الشات
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (!ticketId || !userProfile?.id) return;

        // جلب الرسائل السابقة
        const fetchMessages = async () => {
            try {
                const { data, error } = await supabase.from('ticket_messages' as any)
                    .select('*')
                    .eq('ticket_id', ticketId)
                    .order('created_at', { ascending: true });

                if (error) {
                    // إذا كان الجدول غير موجود، لن يتعطل التطبيق بل سيظهر فارغاً مبدئياً ريثما يضيفه المستخدم
                    if (error.code !== '42P01') throw error;
                } else {
                    setMessages((data as unknown as Message[]) || []);
                }
            } catch (err) {
                console.error('Error fetching messages:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchMessages();

        // تفعيل الاستماع اللحظي للرسائل الجديدة
        const channel = supabase
            .channel(`ticket-chat-${ticketId}`)
            .on('postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'ticket_messages', filter: `ticket_id=eq.${ticketId}` },
                (payload) => {
                    const newMsg = payload.new as Message;
                    // لا تضف الرسالة إذا كنا نحن من أرسلها (لأننا أضفناها محلياً بالفعل لتسريع الاستجابة UI)
                    setMessages(prev => {
                        if (prev.find(m => m.id === newMsg.id)) return prev;
                        return [...prev, newMsg];
                    });

                    // تشغيل صوت خفيف عند استلام رسالة من الطرف الآخر
                    if (newMsg.sender_id !== userProfile?.id) {
                        try {
                            new Audio('/notification.mp3').play().catch(() => { });
                        } catch (e) { }
                    }
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [ticketId, userProfile?.id]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || isClosed) return;

        setSending(true);
        const tempMsg = newMessage.trim();
        setNewMessage(''); // لتفريغ الحقل فوراً للمستخدم

        try {
            const { error } = await supabase.from('ticket_messages' as any).insert({
                ticket_id: ticketId,
                sender_id: userProfile?.id,
                message: tempMsg
            });

            if (error) {
                if (error.code === '42P01') toast.error('لم يتم إنشاء جدول الرسائل بعد في قاعدة البيانات');
                else toast.error('فشل إرسال الرسالة');
                setNewMessage(tempMsg); // استعادة الرسالة في حال الفشل
            }
        } catch (err) {
            toast.error('حدث خطأ غير متوقع');
            setNewMessage(tempMsg);
        } finally {
            setSending(false);
        }
    };

    if (loading) {
        return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-slate-300" /></div>;
    }

    // لتحديد هل المرسل هو الآدمن أم لا نحتاج لفحص الدور (لتبسيط الأمر الديمو هنا نعتبر أن المرسل لو لم يكن صاحب التذكرة فهو دعم فني، لكن نعتمد على userProfile.user_roles)
    const isAdmin = (senderId: string) => {
        // إذا كان التطبيق يعرض للمشرف، فالرسائل التي أرسلها المشرف هي بـ ids مختلفة عن صاحب التذكرة
        return senderId === userProfile?.id && userProfile?.user_roles?.some(r => ['super_admin', 'support'].includes(r.role));
    };

    return (
        <div className="flex flex-col bg-slate-50/50 rounded-3xl border border-slate-100 overflow-hidden h-[500px]" dir="rtl">
            {/* منطقة عرض الرسائل */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 opacity-50">
                        <MessageSquare size={48} className="mb-2" />
                        <p className="font-bold">لا توجد رسائل سابقة. ابدأ المحادثة الآن!</p>
                    </div>
                ) : (
                    messages.map((msg, idx) => {
                        const isMe = msg.sender_id === userProfile?.id;

                        return (
                            <div key={idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-full`}>
                                <div className="flex items-end gap-2 max-w-[85%]">
                                    {!isMe && (
                                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                                            {/* أيقونة دعم فني لرسائل الإدارة */}
                                            <Shield size={14} className="text-blue-600" />
                                        </div>
                                    )}
                                    <div className={`
                                        p-4 rounded-3xl text-sm md:text-base font-bold leading-relaxed break-words shadow-sm
                                        ${isMe
                                            ? 'bg-blue-600 text-white rounded-br-sm'
                                            : 'bg-white border border-slate-100 text-slate-700 rounded-bl-sm'}
                                    `}>
                                        {msg.message}
                                    </div>
                                    {isMe && (
                                        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
                                            <UserIcon size={14} className="text-slate-500" />
                                        </div>
                                    )}
                                </div>
                                <span className="text-[10px] text-slate-400 font-mono mt-1 px-10">
                                    {new Date(msg.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* منطقة الإدخال */}
            <div className="p-3 bg-white border-t border-slate-100">
                {isClosed ? (
                    <div className="text-center py-3 text-emerald-600 font-bold text-sm bg-emerald-50 rounded-2xl">
                        لا يمكن إرسال رسائل جديدة لأن هذه التذكرة مغلقة ✅
                    </div>
                ) : (
                    <form onSubmit={handleSendMessage} className="flex gap-2 relative">
                        <Input
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="اكتب رسالتك للمستخدم هنا..."
                            className="bg-slate-50 border-none h-14 rounded-2xl pr-4 pl-16 text-md font-bold focus-visible:ring-1 focus-visible:ring-blue-500"
                            disabled={sending}
                        />
                        <Button
                            type="submit"
                            disabled={sending || !newMessage.trim()}
                            size="icon"
                            className="absolute left-2 top-2 bottom-2 h-10 w-10 rounded-xl bg-blue-600 hover:bg-blue-700"
                        >
                            {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} className="mr-1" />}
                        </Button>
                    </form>
                )}
            </div>
        </div>
    );
}
