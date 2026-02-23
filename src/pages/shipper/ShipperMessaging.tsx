import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/services/api'; // استيراد الـ API
import { supabase } from '@/integrations/supabase/client';
import { Send, User, Search, Phone, MessageSquare } from 'lucide-react';

export default function ShipperMessaging() {
    const { user } = useAuth(); // الحصول على المستخدم الحالي
    const [contacts, setContacts] = useState<any[]>([]);
    const [activeChat, setActiveChat] = useState<any>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [messageText, setMessageText] = useState('');
    const [loading, setLoading] = useState(true);

    // 1. جلب قائمة المحادثات عند فتح الصفحة
    useEffect(() => {
        if (user) {
            api.getConversations(user.id).then(data => {
                setContacts(data);
                setLoading(false);
            });
        }
    }, [user]);

    // 2. جلب الرسائل عند اختيار شخص معين + الاشتراك في التحديثات الحية
    useEffect(() => {
        if (!user || !activeChat) return;

        // جلب الرسائل القديمة
        api.getMessages(user.id, activeChat.id).then(setMessages);

        // الاشتراك في الرسائل الجديدة (Real-time)
        const channel = supabase
            .channel('realtime_messages')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages'
            }, (payload) => {
                const newMsg = payload.new;
                // التأكد أن الرسالة تخص المحادثة المفتوحة حالياً
                if ((newMsg.sender_id === activeChat.id && newMsg.receiver_id === user.id) ||
                    (newMsg.sender_id === user.id && newMsg.receiver_id === activeChat.id)) {
                    setMessages(prev => [...prev, newMsg]);
                }
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [activeChat, user]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!messageText.trim() || !user || !activeChat) return;

        try {
            await api.sendMessage(user.id, activeChat.id, messageText);
            setMessageText(''); // مسح الحقل بعد الإرسال
        } catch (error) {
            console.error("خطأ في الإرسال:", error);
        }
    };

    return (
        <AppLayout>
            <div className="max-w-6xl mx-auto h-[calc(100vh-120px)] flex flex-col">
                {/* العنوان */}
                <div className="flex items-center gap-4 mb-6">
                    <div className="p-3 bg-primary/10 rounded-2xl text-primary"><MessageSquare size={32} /></div>
                    <div>
                        <h1 className="text-4xl font-black tracking-tight">المراسلات</h1>
                        <p className="text-muted-foreground font-medium mt-1">تواصل مباشرة مع السائقين لضمان سير الشحنات بانسيابية</p>
                    </div>
                </div>

                <Card className="rounded-[2.5rem] border-none shadow-xl bg-white flex-1 overflow-hidden flex">
                    {/* قائمة المحادثات (اليسار) */}
                    <div className="w-1/3 border-l border-slate-100 bg-slate-50 flex flex-col">
                        <div className="p-6 border-b border-slate-200">
                            <div className="relative">
                                <Input className="h-12 bg-white border-none rounded-xl font-bold pr-12 text-sm shadow-sm" placeholder="ابحث في المحادثات..." />
                                <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            {contacts.length === 0 && !loading && <p className="text-center mt-10 text-slate-400 font-bold">لا توجد محادثات بعد</p>}
                            {contacts.map(contact => (
                                <div
                                    key={contact.id}
                                    onClick={() => setActiveChat(contact)}
                                    className={`p-5 flex items-center gap-4 cursor-pointer transition-colors border-b border-slate-100 ${activeChat?.id === contact.id ? 'bg-white border-l-4 border-l-primary' : 'hover:bg-slate-100/50 border-l-4 border-l-transparent'}`}
                                >
                                    <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center text-slate-500 font-black"><User /></div>
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

                    {/* منطقة الدردشة (اليمين) */}
                    <div className="w-2/3 flex flex-col bg-white">
                        {activeChat ? (
                            <>
                                <div className="h-20 border-b border-slate-100 flex items-center justify-between px-8">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 font-black"><User /></div>
                                        <h3 className="font-black text-slate-800 text-lg">{activeChat.name}</h3>
                                    </div>
                                    <Button variant="outline" size="icon" onClick={() => window.location.href = `tel:${activeChat.phone}`} className="rounded-full">
                                        <Phone size={18} />
                                    </Button>
                                </div>

                                <div className="flex-1 p-8 overflow-y-auto space-y-6 bg-slate-50/50 flex flex-col">
                                    {messages.map((msg, index) => (
                                        <div key={index} className={`flex max-w-[75%] ${msg.sender_id === user?.id ? 'mr-auto' : 'ml-auto'}`}>
                                            <div className={`p-4 rounded-2xl shadow-sm ${msg.sender_id === user?.id
                                                ? 'bg-primary text-white rounded-tl-none'
                                                : 'bg-white text-slate-800 border border-slate-100 rounded-tr-none'}`}>
                                                <p className="font-bold text-sm leading-relaxed">{msg.text}</p>
                                                <span className="text-[9px] block mt-2 opacity-70">
                                                    {new Date(msg.created_at).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-slate-100 flex gap-3">
                                    <Input
                                        value={messageText}
                                        onChange={(e) => setMessageText(e.target.value)}
                                        placeholder="اكتب رسالتك هنا..."
                                        className="flex-1 h-14 rounded-2xl bg-slate-50 border-none font-bold"
                                    />
                                    <Button type="submit" className="h-14 w-14 rounded-2xl">
                                        <Send className="rotate-180" size={20} />
                                    </Button>
                                </form>
                            </>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                                <MessageSquare size={60} className="mb-4 opacity-20" />
                                <h3 className="font-black text-xl">مراسلات السائقين</h3>
                                <p className="font-bold">اختر محادثة للبدء</p>
                            </div>
                        )}
                    </div>
                </Card>
            </div>
        </AppLayout>
    );
}