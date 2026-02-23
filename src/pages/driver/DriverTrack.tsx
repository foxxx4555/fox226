import { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { MapPin, Truck, Navigation, CheckCircle2, Clock, PackageCheck, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/services/api';

const steps = [
    { id: 'pending', label: 'بانتظار سائق', icon: Clock },
    { id: 'in_progress', label: 'جاري التوصيل', icon: Truck },
    { id: 'delivered', label: 'تم التسليم', icon: PackageCheck },
];

export default function DriverTrack() {
    const { userProfile } = useAuth();
    const [activeLoads, setActiveLoads] = useState<any[]>([]);
    const [currentLocation, setCurrentLocation] = useState({ lat: 24.7136, lng: 46.6753 }); // Riyadh default

    useEffect(() => {
        if (userProfile?.id) {
            api.getUserLoads(userProfile.id).then(data => {
                const active = data.filter((l: any) => l.status === 'in_progress' || l.status === 'pending');
                setActiveLoads(active);
            });
        }

        // محاكاة تتبع موقع السائق
        if ("geolocation" in navigator) {
            const watchId = navigator.geolocation.watchPosition((position) => {
                const newLoc = { lat: position.coords.latitude, lng: position.coords.longitude };
                setCurrentLocation(newLoc);

                // Update Supabase location
                if (userProfile?.id) {
                    supabase.from('profiles').update({
                        latitude: newLoc.lat,
                        longitude: newLoc.lng
                    } as any).eq('id', userProfile.id);
                }
            });
            return () => navigator.geolocation.clearWatch(watchId);
        }
    }, [userProfile?.id]);

    const getCurrentStepIndex = (status: string) => {
        const idx = steps.findIndex(s => s.id === status);
        return idx === -1 ? 0 : idx;
    };

    return (
        <AppLayout>
            <div className="max-w-6xl mx-auto space-y-8">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-600/10 rounded-2xl text-blue-600"><Navigation size={32} /></div>
                    <div>
                        <h1 className="text-4xl font-black tracking-tight text-slate-800">التتبع الحي</h1>
                        <p className="text-muted-foreground font-medium mt-1">تتبع موقعك الحالي ومسار رحلتك نحو نقطة التسليم</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Card className="lg:col-span-2 rounded-[2rem] border-none shadow-xl bg-white overflow-hidden relative min-h-[500px]">
                        <div className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur-md px-4 py-2 rounded-xl shadow-lg border border-slate-100 flex items-center gap-2 font-bold text-sm text-slate-700">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                            موقعك مُحدث (GPS)
                        </div>

                        {/* خريطة وهمية */}
                        <div className="w-full h-full bg-slate-100 relative overflow-hidden flex items-center justify-center">
                            <img src="https://images.unsplash.com/photo-1524661135-423995f22d0b?q=80&w=2000&auto=format&fit=crop" alt="Map Route" className="w-full h-full object-cover opacity-60" />

                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring", stiffness: 260, damping: 20 }}
                                className="absolute inset-0 m-auto w-16 h-16 flex items-center justify-center"
                            >
                                <div className="relative">
                                    <div className="w-16 h-16 bg-blue-600/20 rounded-full animate-ping absolute inset-0"></div>
                                    <div className="w-12 h-12 bg-white rounded-full shadow-2xl flex items-center justify-center border-4 border-blue-600 z-10 relative text-blue-600">
                                        <Truck size={20} />
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    </Card>

                    <div className="space-y-6">
                        <h2 className="text-2xl font-black text-slate-800">الشحنات النشطة</h2>
                        {activeLoads.length === 0 ? (
                            <Card className="rounded-[2rem] border-none shadow-sm bg-slate-50 text-center py-12">
                                <AlertCircle size={40} className="mx-auto text-slate-300 mb-4" />
                                <p className="font-bold text-slate-500">لا توجد رحلات نشطة للتتبع</p>
                            </Card>
                        ) : (
                            activeLoads.map((load, idx) => (
                                <Card key={idx} className="rounded-[2rem] border-none shadow-lg bg-white overflow-hidden relative">
                                    <div className="absolute top-0 right-0 w-2 h-full bg-blue-600"></div>
                                    <CardHeader className="pb-2">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="text-[10px] font-black tracking-wider text-slate-400 uppercase mb-1">معرف الطلب: #{load.id.substring(0, 6)}</p>
                                                <CardTitle className="text-lg font-black text-slate-800 flex items-center gap-2">
                                                    {load.origin} <Navigation size={14} className="text-blue-600" /> {load.destination}
                                                </CardTitle>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="py-6 relative">
                                            <div className="absolute top-1/2 left-4 right-4 h-1 bg-slate-100 -translate-y-1/2 -z-10 rounded-full"></div>
                                            <div
                                                className={`absolute top-1/2 right-4 h-1 bg-blue-600 -translate-y-1/2 -z-10 rounded-full transition-all duration-1000 ${getCurrentStepIndex(load.status) === 0 ? 'w-0' :
                                                        getCurrentStepIndex(load.status) === 1 ? 'w-1/2' :
                                                            'w-full'
                                                    }`}
                                            ></div>

                                            <div className="flex justify-between">
                                                {steps.map((step, i) => {
                                                    const isActive = i <= getCurrentStepIndex(load.status);
                                                    const Icon = step.icon;
                                                    return (
                                                        <div key={step.id} className="flex flex-col items-center gap-2">
                                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 shadow-sm ${isActive ? 'bg-blue-600 text-white scale-110' : 'bg-white text-slate-300 border-2 border-slate-100'}`}>
                                                                <Icon size={18} />
                                                            </div>
                                                            <span className={`text-[10px] font-bold ${isActive ? 'text-blue-600' : 'text-slate-400'}`}>{step.label}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        <Button className="w-full mt-4 h-12 bg-slate-900 hover:bg-slate-800 rounded-xl font-bold gap-2" onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&origin=${currentLocation.lat},${currentLocation.lng}&destination=${encodeURIComponent(load.receiver_address || load.destination)}`, '_blank')}>
                                            <MapPin size={18} /> فتح في خرائط جوجل
                                        </Button>
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
