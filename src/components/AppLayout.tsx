import { ReactNode, useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { LayoutDashboard, Truck, Users, Settings, LogOut, FileText, Plus, Menu, X, Bell, Search, History, Trash2, Volume2, VolumeX, Package, MapPin, MessageSquare, HelpCircle, Hammer, ShieldAlert, User, RotateCcw, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { api } from '@/services/api';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/components/theme-provider';
import { Moon, Sun, Languages } from 'lucide-react';

export default function AppLayout({ children }: { children: ReactNode }) {
  const { userProfile, currentRole, logout } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { i18n, t } = useTranslation();
  const { theme, setTheme } = useTheme();

  const audioEnabledRef = useRef(false);

  useEffect(() => {
    const unlockAudio = () => {
      // Create a silent audio element to unlock audio context on first interaction
      const audio = new Audio("data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA");
      audio.play().then(() => {
        audioEnabledRef.current = true;
        ['click', 'touchstart', 'keydown'].forEach(event =>
          document.removeEventListener(event, unlockAudio)
        );
      }).catch(e => console.log("Audio unlock required more interaction", e));
    };

    ['click', 'touchstart', 'keydown'].forEach(event =>
      document.addEventListener(event, unlockAudio, { once: true })
    );

    // Update document direction and language code on i18n change
    const updateDir = () => {
      const dir = i18n.language === 'ar' ? 'rtl' : 'ltr';
      document.documentElement.dir = dir;
      document.documentElement.lang = i18n.language;
    };
    updateDir();

    return () => {
      ['click', 'touchstart', 'keydown'].forEach(event =>
        document.removeEventListener(event, unlockAudio)
      );
    };
  }, []);
  const fetchInitialNotifications = async () => {
    if (!userProfile?.id) return;
    const data = await api.getNotifications(userProfile.id);
    setNotifications(data || []);
    setUnreadCount(data?.filter((n: any) => !n.is_read).length || 0);
  };

  const playNotificationSound = (type: string) => {
    if (!audioEnabledRef.current) return;

    let soundFile = '/notification.mp3';
    if (type === 'accept') soundFile = '/accept.mp3';
    if (type === 'complete') soundFile = '/complete.mp3';
    if (type === 'new_load') soundFile = '/loud_ringtone.mp3';

    const audio = new Audio(soundFile);
    audio.volume = 1.0;
    audio.play().catch(e => console.log("Audio play blocked", e));
  };

  const showNativeNotification = (title: string, body: string) => {
    if (Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/favicon.ico',
        badge: '/favicon.ico'
      });
    }
  };

  useEffect(() => {
    if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      const requestPerm = () => {
        Notification.requestPermission();
        document.removeEventListener('click', requestPerm);
      };
      document.addEventListener('click', requestPerm);
    }
  }, []);

  useEffect(() => {
    if (!userProfile?.id) return;

    fetchInitialNotifications();

    const personalChannel = supabase.channel(`user-notifs-${userProfile.id}`)
      .on('postgres_changes' as any, {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userProfile.id}`
      }, (payload: any) => {
        const newNotif = payload?.new;
        if (!newNotif) return;
        setNotifications(prev => {
          if (prev.find(n => n.id === newNotif.id)) return prev;
          playNotificationSound(newNotif.type);
          toast.success(newNotif.title, { description: newNotif.message });
          showNativeNotification(newNotif.title, newNotif.message);
          setUnreadCount(c => c + 1);
          return [newNotif, ...prev];
        });
      })
      .on('broadcast' as any, { event: 'new_notification' }, (payload: any) => {
        const newNotif = payload?.payload;
        if (!newNotif) return;
        setNotifications(prev => {
          if (prev.find(n => n.id === newNotif.id)) return prev;
          playNotificationSound(newNotif.type);
          toast.success(newNotif.title, { description: newNotif.message });
          setUnreadCount(c => c + 1);
          return [newNotif, ...prev];
        });
      }).subscribe();

    let loadsChannel: any;
    if (currentRole === 'driver') {
      loadsChannel = supabase.channel('public:loads')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'loads',
          filter: "status=eq.available"
        }, (payload) => {
          playNotificationSound('new_load');
          toast.success("📦 شحنة جديدة متاحة الآن!", {
            description: `من ${payload.new.origin} إلى ${payload.new.destination}`,
            duration: 8000
          });
          showNativeNotification("📦 شحنة جديدة متاحة!", `من ${payload.new.origin} إلى ${payload.new.destination}`);

          setNotifications(prev => [{
            id: `load-${payload.new.id}`,
            title: "شحنة جديدة متاحة",
            message: `شحنة من ${payload.new.origin} إلى ${payload.new.destination}`,
            type: 'new_load',
            is_read: false,
            created_at: new Date().toISOString()
          }, ...prev]);
          setUnreadCount(prev => prev + 1);
        }).subscribe();
    }

    const updateDir = () => {
      const dir = i18n.language === 'ar' ? 'rtl' : 'ltr';
      document.documentElement.dir = dir;
      document.documentElement.lang = i18n.language;
    };
    updateDir();

    return () => {
      supabase.removeChannel(personalChannel);
      if (loadsChannel) supabase.removeChannel(loadsChannel);
    };
  }, [userProfile?.id, currentRole, i18n.language]);

  const markAsRead = async () => {
    if (!userProfile?.id) return;
    setUnreadCount(0);
    await supabase.from('notifications' as any).update({ is_read: true } as any).eq('user_id', userProfile.id);
  };

  const clearAll = async () => {
    if (!userProfile?.id) return;
    if (!confirm("مسح سجل الإشعارات؟")) return;
    await api.clearAllNotifications(userProfile.id);
    setNotifications([]);
    setUnreadCount(0);
  };

  let navItems = currentRole === 'shipper' ? [
    { label: "الرئيسية", path: '/shipper/dashboard', icon: <LayoutDashboard size={20} /> },
    { label: "نشر شحنة جديدة", path: '/shipper/post', icon: <Plus size={20} /> },
    { label: "إضافة منتج", path: '/shipper/products', icon: <Package size={20} /> },
    { label: "إضافة عميل مستلم", path: '/shipper/receivers', icon: <Users size={20} /> },
    { label: "شحناتي", path: '/shipper/loads', icon: <History size={20} /> },
    { label: "عروض الأسعار", path: '/shipper/bids', icon: <Search size={20} /> },
    { label: "بوالص الشحن", path: '/shipper/waybills', icon: <FileText size={20} /> },
    { label: "تتبع حالة الشحنة", path: '/shipper/track', icon: <MapPin size={20} /> },
    { label: "سجل الطلبات السابقة", path: '/shipper/history', icon: <FileText size={20} /> },
    { label: "كشف حساب", path: '/shipper/statement', icon: <FileText size={20} /> },
    { label: "أماكن التحميل", path: '/shipper/locations', icon: <MapPin size={20} /> },
    { label: "المراسلات", path: '/shipper/messaging', icon: <MessageSquare size={20} /> },
    { label: "الملف الشخصي", path: '/shipper/account', icon: <Settings size={20} /> },
    { label: "الدعم الفني", path: '/shipper/support', icon: <HelpCircle size={20} /> },
  ] : [
    { label: "الرئيسية", path: '/driver/dashboard', icon: <LayoutDashboard size={20} /> },
    { label: "الشحنات المتاحة", path: '/driver/loads', icon: <Search size={20} /> },
    { label: "عروض الأسعار", path: '/driver/bids', icon: <Hammer size={20} /> },
    { label: "شاحناتي", path: '/driver/trucks', icon: <Truck size={20} /> },
    { label: "إضافة سائق", path: '/driver/add-driver', icon: <Users size={20} /> },
    { label: "شحناتي الحالية", path: '/driver/tasks', icon: <Truck size={20} /> },
    { label: "سجل الشحنات المنفذة", path: '/driver/history', icon: <History size={20} /> },
    { label: "كشف حساب", path: '/driver/statement', icon: <FileText size={20} /> },
    { label: "طباعة البوليصة", path: '/driver/waybill', icon: <FileText size={20} /> },
    { label: "المراسلات", path: '/driver/messaging', icon: <MessageSquare size={20} /> },
    { label: "الملف الشخصي", path: '/driver/account', icon: <Settings size={20} /> },
    { label: "الدعم الفني", path: '/driver/support', icon: <HelpCircle size={20} /> },
  ];

  if (currentRole === 'driver' && !(userProfile as any)?.is_verified) {
    navItems = navItems.filter(item => item.path === '/driver/account' || item.path === '/driver/support');
  }

  return (
    <div className="min-h-screen flex bg-slate-50 w-full overflow-x-hidden" dir="rtl">
      {/* Sidebar - Remains Same */}
      <aside className={cn("fixed lg:static inset-y-0 right-0 z-50 w-72 bg-[#0f172a] text-white flex flex-col transition-transform duration-300", sidebarOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0")}>
        <div className="p-8 border-b border-white/5 flex justify-between items-center">
          <h1 className="font-black text-xl italic tracking-tighter">SAS TRANSPORT</h1>
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(false)}><X /></Button>
        </div>
        <nav className="flex-1 p-6 space-y-2 overflow-y-auto">
          {navItems.map((item) => (
            <Link key={item.path} to={item.path} onClick={() => setSidebarOpen(false)} className={cn("flex items-center gap-4 px-5 py-4 rounded-2xl font-bold transition-all", location.pathname === item.path ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20" : "text-slate-400 hover:bg-white/5 hover:text-white")}>
              {item.icon} {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-6 border-t border-white/5"><Button variant="ghost" className="w-full justify-start gap-4 text-rose-400 font-black h-14 rounded-2xl" onClick={logout}><LogOut size={20} /> خروج</Button></div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-20 bg-white border-b px-6 flex items-center justify-between shadow-sm shrink-0">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(true)}><Menu size={28} className="text-blue-600" /></Button>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-full border border-emerald-100 mr-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-[10px] font-black uppercase tracking-wider">Online</span>
            </div>


            <Popover onOpenChange={(open) => open && markAsRead()}>
              <PopoverTrigger asChild>
                <div className="relative cursor-pointer">
                  <Button variant="ghost" size="icon" className="h-11 w-11 rounded-xl bg-slate-50">
                    <Bell size={22} className="text-slate-600" />
                  </Button>
                  {unreadCount > 0 && <div className="absolute top-2 right-2 w-5 h-5 bg-rose-500 rounded-full border-2 border-white flex items-center justify-center text-[10px] text-white font-black animate-bounce shadow-sm">{unreadCount}</div>}
                </div>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0 rounded-[2rem] shadow-2xl border-none overflow-hidden bg-white" align="start">
                <div className="p-5 bg-[#0f172a] text-white flex justify-between items-center">
                  <p className="font-black text-sm">التنبيهات المباشرة</p>
                  <Button variant="ghost" size="sm" className="text-rose-400 h-8 hover:bg-white/10" onClick={clearAll}><Trash2 size={16} /></Button>
                </div>
                <ScrollArea className="h-[300px]">
                  {notifications.length === 0 ? (
                    <div className="p-10 text-center text-slate-400 text-xs font-bold">لا يوجد تنبيهات</div>
                  ) : (
                    notifications.slice(0, 10).map((notif) => (
                      <div key={notif.id} className="p-4 border-b border-slate-50 flex gap-3 hover:bg-slate-50 transition-colors">
                        <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0", notif.is_read ? "bg-slate-100 text-slate-400" : "bg-blue-50 text-blue-600")}><Bell size={14} /></div>
                        <div className="flex-1 text-right">
                          <p className="font-black text-[11px] text-slate-800">{notif.title}</p>
                          <p className="text-[10px] text-slate-500 leading-tight mt-1">{notif.message}</p>
                        </div>
                      </div>
                    ))
                  )}
                </ScrollArea>
              </PopoverContent>
            </Popover>

            <div className="flex items-center gap-2 border-r pr-4 border-slate-100 mr-2">
              {/* Language Switcher */}
              <Button
                variant="ghost"
                size="icon"
                className="h-11 w-11 rounded-xl bg-slate-50 text-slate-600 hover:bg-slate-100"
                onClick={() => i18n.changeLanguage(i18n.language === 'ar' ? 'en' : 'ar')}
              >
                <Languages size={20} />
              </Button>

              {/* Theme Switcher */}
              <Button
                variant="ghost"
                size="icon"
                className="h-11 w-11 rounded-xl bg-slate-50 text-slate-600 hover:bg-slate-100"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              >
                {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
              </Button>
            </div>

            <div className="w-11 h-11 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-lg shadow-inner">{userProfile?.full_name?.charAt(0)}</div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-10 bg-[#f8fafc]">
          {currentRole === 'driver' && !(userProfile as any)?.is_verified && location.pathname !== '/driver/account' && location.pathname !== '/driver/support' ? (
            <div className="flex h-full w-full flex-col items-center justify-center bg-amber-50/50 gap-4 p-6 text-center rounded-[3rem] border-2 border-amber-100" dir="rtl">
              <div className="bg-amber-100 p-8 rounded-[2.5rem] mb-6 relative shadow-inner">
                <ShieldAlert size={80} className="text-amber-500 animate-pulse" />
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-rose-500 rounded-full animate-ping opacity-75"></div>
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-rose-500 rounded-full flex items-center justify-center shadow-lg"><span className="w-3 h-3 bg-white rounded-full"></span></div>
              </div>
              <h1 className="text-4xl md:text-5xl font-black mb-4 text-slate-800 tracking-tight">طلبك قيد المراجعة</h1>
              <p className="text-slate-500 max-w-xl leading-relaxed font-bold text-lg mb-8">
                مرحباً بك في SAS Transport. حسابك كـ "ناقل شريك" يخضع حالياً للتدقيق الأمني والإداري. يرجى الانتظار (من 24 إلى 48 ساعة) أو التأكد من إكمال <Link to="/driver/account" className="text-blue-600 underline underline-offset-4 hover:text-blue-700 transition-colors">رفع جميع المستندات المطلوبة في ملفك الشخصي</Link> لتسريع عملية التوثيق.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 mt-2 w-full max-w-md">
                <Button onClick={() => window.location.href = '/driver/account'} className="flex-1 rounded-[1.5rem] bg-blue-600 hover:bg-blue-700 text-white h-16 font-black text-lg shadow-xl shadow-blue-500/20 transition-all transform hover:scale-105">
                  <User size={22} className="ml-2" /> إكمال الملف الشخصي
                </Button>
                <Button onClick={logout} variant="outline" className="flex-1 rounded-[1.5rem] h-16 font-black text-lg border-2 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-all">
                  تسجيل الخروج
                </Button>
              </div>
            </div>
          ) : (
            children
          )}
        </div>
      </main>
    </div>
  );
}
