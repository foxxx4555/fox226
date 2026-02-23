import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { Send, User, Search, Phone, MessageSquare } from 'lucide-react';

export default function ShipperMessaging() {
    const { userProfile } = useAuth();
    const [activeChat, setActiveChat] = useState<any>(null);
    const [message, setMessage] = useState('');

    // Mock data for demonstration purposes
    const contacts = [
        { id: 1, name: 'أحمد السائق', lastMessage: 'وصلت الموقع للتحميل', time: '10:30 ص', unread: 2, online: true, phone: '0501234567' },
        { id: 2, name: 'مؤسسة النقل السريع', lastMessage: 'تم تسليم الشحنة بنجاح', time: 'أمس', unread: 0, online: false, phone: '0559876543' }
    ];

    const messages = [
        { id: 1, text: 'السلام عليكم، هل وصلت لموقع التحميل؟', sender: 'me', time: '10:15 ص' },
        { id: 2, text: 'وعليكم السلام، نعم وصلت وسأبدأ التحميل الآن.', sender: 'other', time: '10:20 ص' },
        { id: 3, text: 'ممتاز، بانتظار تحديثك.', sender: 'me', time: '10:25 ص' },
        { id: 4, text: 'وصلت الموقع للتحميل', sender: 'other', time: '10:30 ص' }
    ];

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!message.trim()) return;
        // In a real app this would send to Supabase
        setMessage('');
    };

    return (
        <AppLayout>
            <div className="max-w-6xl mx-auto h-[calc(100vh-120px)] flex flex-col">
                <div className="flex items-center gap-4 mb-6">
                    <div className="p-3 bg-primary/10 rounded-2xl text-primary"><MessageSquare size={32} /></div>
                    <div>
                        <h1 className="text-4xl font-black tracking-tight">المراسلات</h1>
                        <p className="text-muted-foreground font-medium mt-1">تواصل مباشرة مع السائقين لضمان سير الشحنات بانسيابية</p>
                    </div>
                </div>

                <Card className="rounded-[2.5rem] border-none shadow-xl bg-white flex-1 overflow-hidden flex">
                    {/* نص الشاشة للأسماء */}
                    <div className="w-1/3 border-l border-slate-100 bg-slate-50 flex flex-col">
                        <div className="p-6 border-b border-slate-200">
                            <div className="relative">
                                <Input className="h-12 bg-white border-none rounded-xl font-bold pr-12 text-sm shadow-sm" placeholder="ابحث في المحادثات..." />
                                <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            {contacts.map(contact => (
                                <div
                                    key={contact.id}
                                    onClick={() => setActiveChat(contact)}
                                    className={`p-5 flex items-center gap-4 cursor-pointer transition-colors border-b border-slate-100 ${activeChat?.id === contact.id ? 'bg-white border-l-4 border-l-primary' : 'hover:bg-slate-100/50 border-l-4 border-l-transparent'}`}
                                >
                                    <div className="relative">
                                        <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center text-slate-500 font-black"><User /></div>
                                        {contact.online && <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full"></div>}
                                    </div>
                                    <div className="flex-1 overflow-hidden">
                                        <div className="flex justify-between items-center mb-1">
                                            <h3 className="font-black text-slate-800 truncate">{contact.name}</h3>
                                            <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap">{contact.time}</span>
                                        </div>
                                        <p className="text-xs font-bold text-slate-500 truncate">{contact.lastMessage}</p>
                                    </div>
                                    {contact.unread > 0 && (
                                        <div className="w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-[10px] font-black">{contact.unread}</div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* مساحة الدردشة */}
                    <div className="w-2/3 flex flex-col bg-white">
                        {activeChat ? (
                            <>
                                <div className="h-20 border-b border-slate-100 flex items-center justify-between px-8 bg-white/50 backdrop-blur-md z-10">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 font-black"><User /></div>
                                        <div>
                                            <h3 className="font-black text-slate-800 text-lg">{activeChat.name}</h3>
                                            <p className={`text-xs font-bold ${activeChat.online ? 'text-emerald-500' : 'text-slate-400'}`}>
                                                {activeChat.online ? 'متصل الآن' : 'غير متصل'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button variant="outline" size="icon" onClick={() => window.location.href = `tel:${activeChat.phone}`} className="h-10 w-10 rounded-full border-slate-200 text-slate-600 hover:bg-slate-100">
                                            <Phone size={18} />
                                        </Button>
                                    </div>
                                </div>

                                <div className="flex-1 p-8 overflow-y-auto space-y-6 bg-slate-50/50">
                                    <div className="text-center"><span className="text-[10px] font-bold bg-slate-200 text-slate-500 px-3 py-1 rounded-full text-center">اليوم</span></div>
                                    {messages.map(msg => (
                                        <div key={msg.id} className={`flex max-w-[70%] ${msg.sender === 'me' ? 'mr-auto' : 'ml-auto'}`}>
                                            <div className={`p-4 rounded-2xl shadow-sm ${msg.sender === 'me'
                                                    ? 'bg-primary text-white rounded-tl-none'
                                                    : 'bg-white text-slate-800 border border-slate-100 rounded-tr-none'
                                                }`}>
                                                <p className="font-bold text-sm leading-relaxed">{msg.text}</p>
                                                <p className={`text-[10px] mt-2 font-bold ${msg.sender === 'me' ? 'text-primary-foreground/70' : 'text-slate-400'}`}>{msg.time}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="p-4 bg-white border-t border-slate-100">
                                    <form onSubmit={handleSendMessage} className="flex gap-3">
                                        <Input
                                            value={message}
                                            onChange={(e) => setMessage(e.target.value)}
                                            placeholder="اكتب رسالتك هنا..."
                                            className="flex-1 h-14 rounded-2xl bg-slate-50 border-none font-bold px-6 shadow-inner"
                                        />
                                        <Button type="submit" className="h-14 w-14 rounded-2xl bg-primary hover:bg-primary/90 text-white shadow-xl shadow-primary/20 shrink-0">
                                            <Send className="rotate-180" size={20} />
                                        </Button>
                                    </form>
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 space-y-4">
                                <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center shadow-sm">
                                    <MessageSquare size={40} className="text-slate-300" />
                                </div>
                                <h3 className="font-black text-xl text-slate-500">مراسلات السائقين</h3>
                                <p className="font-bold">اختر محادثة من القائمة الجانبية للبدء</p>
                            </div>
                        )}
                    </div>
                </Card>
            </div>
        </AppLayout>
    );
}
