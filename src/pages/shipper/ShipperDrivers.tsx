import { useEffect, useState, useCallback } from 'react';
import { api } from '@/services/api';
import AppLayout from '@/components/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Phone, Star, MapPin, Search, MessageCircle, Navigation } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export default function ShipperDrivers() {
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // 1. جلب البيانات لأول مرة
  const fetchDrivers = useCallback(async () => {
    try {
      const data = await api.getAvailableDrivers();
      setDrivers(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDrivers();

    // 2. الاشتراك في التحديثات الحية (Realtime)
    const channel = supabase
      .channel('live-drivers')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles' },
        (payload) => {
          setDrivers((current) =>
            current.map((d) => (d.id === payload.new.id ? { ...d, ...payload.new } : d))
          );
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchDrivers]);

  // 3. وظائف الاتصال والواتساب
  const handleCall = (phone: string) => {
    if (!phone) return toast.error("رقم الهاتف غير متاح");
    window.location.href = `tel:${phone}`;
  };

  const handleWhatsApp = (phone: string) => {
    if (!phone) return toast.error("رقم الهاتف غير متاح");
    let cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.startsWith('05')) cleanPhone = '966' + cleanPhone.substring(1);
    window.open(`https://wa.me/${cleanPhone}`, '_blank');
  };

  const filtered = drivers.filter(d => d.full_name?.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <AppLayout>
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-4xl font-black tracking-tight">رادار السائقين المباشر</h1>
            <p className="text-muted-foreground font-medium text-lg mt-1">تتبع مواقع السائقين وتواصل معهم لحظة بلحظة</p>
          </div>
          <div className="relative w-full md:w-80">
            <Search className="absolute start-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
            <Input 
              placeholder="بحث باسم السائق..." 
              className="ps-12 h-14 rounded-2xl border-2 focus:border-primary font-bold shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-24"><Loader2 className="animate-spin text-primary" size={48} /></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <AnimatePresence>
              {filtered.map((driver) => (
                <motion.div
                  key={driver.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                >
                  <Card className="rounded-[2.5rem] overflow-hidden border-none shadow-xl hover:shadow-2xl transition-all group bg-white">
                    <CardContent className="p-8">
                      <div className="flex items-center gap-5 mb-8">
                        <div className="relative">
                          <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center text-primary text-3xl font-black">
                            {driver.full_name?.charAt(0)}
                          </div>
                          {/* نقطة "متصل الآن" الخضراء */}
                          <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full border-4 border-white shadow-sm" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-black text-xl truncate">{driver.full_name}</h3>
                          <div className="flex items-center gap-1.5 text-amber-500 mt-1">
                            <Star size={16} fill="currentColor" />
                            <span className="text-sm font-black">4.9</span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4 mb-8 bg-muted/30 p-5 rounded-[1.5rem] border border-muted-foreground/5">
                        <div className="flex items-center gap-3 text-sm font-black text-slate-600">
                          <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm text-primary">
                            <Phone size={16} />
                          </div>
                          <span dir="ltr">{driver.phone || "لا يوجد رقم"}</span>
                        </div>
                        
                        {/* عرض الموقع الحي (إحداثيات + زر خريطة) */}
                        <div className="flex items-center justify-between gap-3 text-sm font-black text-slate-600">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm text-accent">
                              <MapPin size={16} />
                            </div>
                            <span className="text-emerald-600 flex items-center gap-2">
                              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
                              بث مباشر للموقع
                            </span>
                          </div>
                          {driver.latitude && (
                            <Button 
                              variant="ghost" size="sm" className="h-8 rounded-lg text-primary bg-primary/5 hover:bg-primary/10"
                              onClick={() => window.open(`https://www.google.com/maps?q=${driver.latitude},${driver.longitude}`, '_blank')}
                            >
                              <Navigation size={14} className="me-1" /> خريطة
                            </Button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <Button 
                          onClick={() => handleCall(driver.phone)}
                          className="h-12 rounded-xl font-bold bg-slate-900 hover:bg-primary transition-all gap-2"
                        >
                          <Phone size={18} /> اتصال
                        </Button>
                        <Button 
                          onClick={() => handleWhatsApp(driver.phone)}
                          variant="outline" 
                          className="h-12 rounded-xl font-bold border-2 gap-2 text-emerald-600 border-emerald-100 hover:bg-emerald-50"
                        >
                          <MessageCircle size={18} /> واتساب
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
