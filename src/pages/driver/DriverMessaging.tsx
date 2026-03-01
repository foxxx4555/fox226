import { useState, useEffect, useRef } from 'react';
import AppLayout from '@/components/AppLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { Send, User, Search, Phone, MessageSquare, Loader2 } from 'lucide-react';
import { api } from '@/services/api';
import { supabase } from '@/integrations/supabase/client';
import { useLocation } from 'react-router-dom';
import { toast } from 'sonner';

export default function DriverMessaging() {
    const { userProfile } = useAuth();
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const shipperIdFromUrl = queryParams.get('shipperId');

    const [contacts, setContacts] = useState<any[]>([]);
    const [activeChat, setActiveChat] = useState<any>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    const fetchContacts = async () => {
        if (!userProfile?.id) return;
        const convData = await api.getConversations(userProfile.id);
        const activeData = await api.getChatContacts(userProfile.id, 'driver');

        const mergedContacts = [...(convData || [])];
        activeData?.forEach((contact: any) => {
            if (!mergedContacts.find(c => c.id === contact.id)) {
                mergedContacts.push({
                    id: contact.id,
                    name: contact.full_name,
                    phone: contact.phone,
                    lastMessage: 'متاح للمحادثة (التاجر)',
                    time: ''
                });
            }
        });

        let initialContacts = mergedContacts;
        setContacts(initialContacts);

        // لو جاي من صفحة الشحنات ومعاه Shipper ID
        if (shipperIdFromUrl && !activeChat) {
            const existingContact = initialContacts.find((c: any) => c.id === shipperIdFromUrl);
            if (existingContact) {
                setActiveChat(existingContact);
            } else {
                // لو مفيش محادثة سابقة، نجيب بياناته ونفتحه
                const { data: profile } = await supabase.from('profiles').select('*').eq('id', shipperIdFromUrl).maybeSingle();
                if (profile) {
                    const newContact = {
                        id: profile.id,
                        name: profile.full_name,
                        phone: profile.phone,
                        lastMessage: '',
                        time: ''
                    };
                    setActiveChat(newContact);
                    setContacts(prev => [newContact, ...prev]);
                }
            }
        }
        setLoading(false);
    };

    const fetchMessages = async (otherId: string) => {
        if (!userProfile?.id) return;
        const data = await api.getMessages(userProfile.id, otherId);
        setMessages(data || []);
        setTimeout(() => scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight), 100);
    };

    useEffect(() => {
        fetchContacts();

        // اشتراك للحصول على الرسائل الجديدة لحظياً
        const channel = supabase.channel('realtime-messages')
            .on('postgres_changes' as any, { event: 'INSERT', table: 'messages', schema: 'public' }, (payload: any) => {
                const newMsg = payload.new;
                if (
                    (newMsg.sender_id === userProfile?.id && newMsg.receiver_id === activeChat?.id) ||
                    (newMsg.sender_id === activeChat?.id && newMsg.receiver_id === userProfile?.id)
                ) {
                    setMessages(prev => [...prev, newMsg]);
                    setTimeout(() => scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight), 100);
                }
                fetchContacts(); // لتحديث الرسالة الأخيرة في قائمة جهات الاتصال
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [userProfile?.id, activeChat?.id]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!message.trim() || !activeChat || !userProfile?.id) return;

        setSending(true);
        try {
            await api.sendMessage(userProfile.id, activeChat.id, message);
            setMessage('');
        } catch (err) {
            toast.error("فشل إرسال الرسالة");
        } finally {
            setSending(false);
        }
    };

    return (
        <AppLayout>
            <div className="max-w-6xl mx-auto h-[calc(100vh-140px)] flex flex-col">
                <div className="flex items-center gap-4 mb-6 shrink-0">
                    <div className="p-3 bg-blue-600/10 rounded-2xl text-blue-600"><MessageSquare size={32} /></div>
                    <div>
                        <h1 className="text-4xl font-black tracking-tight text-slate-800">المراسلات</h1>
                        <p className="text-muted-foreground font-medium mt-1">تواصل مباشرة مع أصحاب الشحنات</p>
                    </div>
                </div>

                <Card className="rounded-[2.5rem] border-none shadow-2xl bg-white flex-1 overflow-hidden flex min-h-0">
                    {/* Contacts Sidebar */}
                    <div className="w-1/3 border-l border-slate-100 bg-slate-50 flex flex-col min-w-[280px]">
                        <div className="p-6 border-b border-slate-200">
                            <div className="relative">
                                <Input className="h-12 bg-white border-none rounded-xl font-bold pr-12 text-sm shadow-sm" placeholder="ابحث في المحادثات..." />
                                <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            {loading ? (
                                <div className="flex justify-center p-10"><Loader2 className="animate-spin text-slate-300" /></div>
                            ) : contacts.length === 0 ? (
                                <div className="p-10 text-center text-slate-400 font-bold text-sm">لا توجد محادثات</div>
                            ) : contacts.map(contact => (
                                <div
                                    key={contact.id}
                                    onClick={() => { setActiveChat(contact); fetchMessages(contact.id); }}
                                    className={`p-5 flex items-center gap-4 cursor-pointer transition-colors border-b border-slate-100 ${activeChat?.id === contact.id ? 'bg-white border-l-4 border-l-blue-600' : 'hover:bg-slate-100/50 border-l-4 border-l-transparent'}`}
                                >
                                    <div className="relative">
                                        <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center text-slate-500 font-black uppercase">{contact.name.charAt(0)}</div>
                                    </div>
                                    <div className="flex-1 overflow-hidden">
                                        <div className="flex justify-between items-center mb-1">
                                            <h3 className="font-black text-slate-800 truncate">{contact.name}</h3>
                                            <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap">{contact.time}</span>
                                        </div>
                                        <p className="text-xs font-bold text-slate-500 truncate">{contact.lastMessage}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Chat Area */}
                    <div className="w-2/3 flex flex-col bg-white overflow-hidden">
                        {activeChat ? (
                            <>
                                <div className="h-24 border-b border-slate-100 flex items-center justify-between px-8 bg-white/50 backdrop-blur-md z-10 shrink-0">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-blue-600/10 text-blue-600 rounded-full flex items-center justify-center font-black uppercase">{activeChat.name.charAt(0)}</div>
                                        <div>
                                            <h3 className="font-black text-slate-800 text-lg">{activeChat.name}</h3>
                                            <p className="text-xs font-bold text-emerald-500">نشط الآن</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button variant="outline" size="icon" onClick={() => window.location.href = `tel:${activeChat.phone}`} className="h-10 w-10 rounded-full border-slate-200 text-slate-600 hover:bg-slate-100">
                                            <Phone size={18} />
                                        </Button>
                                    </div>
                                </div>

                                <div className="flex-1 p-8 overflow-y-auto space-y-6 bg-slate-50" ref={scrollRef}>
                                    <div className="text-center"><span className="text-[10px] font-bold bg-slate-200 text-slate-500 px-3 py-1 rounded-full text-center">بداية المحادثة</span></div>
                                    {messages.map((msg, index) => (
                                        <div key={index} className={`flex ${msg.sender_id === userProfile?.id ? 'justify-start mr-auto' : 'justify-end ml-auto'} max-w-[80%]`}>
                                            <div className={`p-5 rounded-[2rem] shadow-sm ${msg.sender_id === userProfile?.id
                                                ? 'bg-blue-600 text-white rounded-tr-none'
                                                : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none'}`}>
                                                <p className="font-bold text-sm leading-relaxed">{msg.text}</p>
                                                <span className="text-[9px] block mt-2 opacity-70">
                                                    {new Date(msg.created_at).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="p-6 bg-white border-t border-slate-100 shrink-0">
                                    <form onSubmit={handleSendMessage} className="flex gap-3">
                                        <Input
                                            value={message}
                                            onChange={(e) => setMessage(e.target.value)}
                                            disabled={sending}
                                            placeholder="اكتب رسالتك للمعلّم هنا..."
                                            className="flex-1 h-14 rounded-2xl bg-slate-50 border-none font-bold px-6 shadow-inner focus-visible:ring-blue-500"
                                        />
                                        <Button
                                            type="submit"
                                            disabled={sending || !message.trim()}
                                            className="h-14 w-14 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white shadow-xl shadow-blue-600/20 shrink-0 transition-transform active:scale-95"
                                        >
                                            {sending ? <Loader2 className="animate-spin" size={20} /> : <Send className="rotate-180" size={20} />}
                                        </Button>
                                    </form>
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 space-y-4">
                                <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center shadow-inner">
                                    <MessageSquare size={40} className="text-slate-300" />
                                </div>
                                <div className="text-center">
                                    <h3 className="font-black text-xl text-slate-500">صندوق الرسائل</h3>
                                    <p className="text-xs font-bold text-slate-400 mt-2 italic">اختر محادثة من القائمة الجانبية لبدء التواصل</p>
                                </div>
                            </div>
                        )}
                    </div>
                </Card>
            </div>
        </AppLayout>
    );
}
