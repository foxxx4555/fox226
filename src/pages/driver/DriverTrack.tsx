import { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { MapPin, Truck, Navigation, CheckCircle2, Clock, PackageCheck, AlertCircle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/services/api';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import SignaturePad from '@/components/finance/SignaturePad';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const steps = [
    { id: 'pending', label: 'بانتظار سائق', icon: Clock },
    { id: 'in_progress', label: 'جاري التوصيل', icon: Truck },
    { id: 'delivered', label: 'تم التسليم', icon: PackageCheck },
];

// Helper to calculate distance in meters
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI / 180; // φ, λ in radians
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // in metres
}

import { useLocation } from 'react-router-dom';

export default function DriverTrack() {
    const { userProfile } = useAuth();
    const queryClient = useQueryClient();
    const location = useLocation();
    const searchParams = new URLSearchParams(location.search);
    const targetLoadId = searchParams.get('id');

    const [currentLocation, setCurrentLocation] = useState({ lat: 24.7136, lng: 46.6753 }); // Riyadh default
    const [isTracking, setIsTracking] = useState(false);
    const [lastUpdatedLoc, setLastUpdatedLoc] = useState<{ lat: number, lng: number } | null>(null);
    const [loading, setLoading] = useState(false);
    const [geofenceAlertSent, setGeofenceAlertSent] = useState<Record<string, boolean>>({});
    const [offlineQueue, setOfflineQueue] = useState<any[]>(() => {
        const saved = localStorage.getItem('fox_offline_pods');
        return saved ? JSON.parse(saved) : [];
    });

    // ePOD States
    const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
    const [activeLoadForSignature, setActiveLoadForSignature] = useState<string | null>(null);
    const [pendingPodImage, setPendingPodImage] = useState<string | null>(null);

    const { data: activeLoads = [], isLoading } = useQuery({
        queryKey: ['driver-active-loads', userProfile?.id],
        queryFn: async () => {
            if (!userProfile?.id) return [];
            const data = await api.getUserLoads(userProfile.id);
            const active = data.filter((l: any) => l.status === 'in_progress' || l.status === 'pending');
            // لو فيه ID مستهدف، نخليه أول واحد في القائمة
            if (targetLoadId) {
                active.sort((a, b) => a.id === targetLoadId ? -1 : b.id === targetLoadId ? 1 : 0);
            }
            return active;
        },
        enabled: !!userProfile?.id,
    });

    useEffect(() => {
        if (!userProfile?.id) return;

        const channel = supabase
            .channel(`driver-loads-${userProfile.id}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'loads' }, () => {
                queryClient.invalidateQueries({ queryKey: ['driver-active-loads'] });
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [userProfile?.id, queryClient]);

    // محاكاة تتبع موقع السائق مع Throttling
    useEffect(() => {
        if (!isTracking) return;

        let watchId: number;
        let updateInterval: NodeJS.Timeout;

        if ("geolocation" in navigator) {
            watchId = navigator.geolocation.watchPosition((position) => {
                const newLoc = { lat: position.coords.latitude, lng: position.coords.longitude };
                setCurrentLocation(newLoc);
            }, undefined, { enableHighAccuracy: true });

            // Throttling: Update DB only every 30 seconds to avoid spamming
            updateInterval = setInterval(() => {
                setCurrentLocation(loc => {
                    // Check Geofencing for all active loads
                    activeLoads.forEach(load => {
                        if (load.status === 'in_progress' && !geofenceAlertSent[load.id]) {
                            // Using Riyadh coordinates as destination placeholder for calculation
                            // In real scenarios, we'd use load.destination_lat/lng
                            const dist = getDistance(loc.lat, loc.lng, 24.7136, 46.6753);
                            if (dist < 2000) { // 2km threshold
                                supabase.channel(`load-updates-${load.id}`).send({
                                    type: 'broadcast',
                                    event: 'proximity_alert',
                                    payload: { loadId: load.id, distance: dist }
                                });
                                setGeofenceAlertSent(prev => ({ ...prev, [load.id]: true }));
                                toast.info("تم تنبيه الشاحن باقترابك من الموقع 📍", { duration: 5000 });
                            }
                        }
                    });

                    setLastUpdatedLoc(lastLoc => {
                        // Only update if moved more than 50 meters to save db updates
                        if (userProfile?.id && (!lastLoc || getDistance(lastLoc.lat, lastLoc.lng, loc.lat, loc.lng) > 50)) {
                            supabase.from('profiles').update({
                                latitude: loc.lat,
                                longitude: loc.lng
                            } as any).eq('id', userProfile.id).then();
                            return loc;
                        }
                        return lastLoc;
                    });
                    return loc;
                });
            }, 30000);
        }

        return () => {
            if (watchId) navigator.geolocation.clearWatch(watchId);
            if (updateInterval) clearInterval(updateInterval);
        };
    }, [userProfile?.id, isTracking]);

    const handleStartTrip = async (loadId: string) => {
        if (!isTracking) {
            setIsTracking(true);
            // Update status to in_progress if not already
            const load = activeLoads.find(l => l.id === loadId);
            if (load?.status === 'pending') {
                await api.acceptLoad(loadId, userProfile!.id, load.owner_id, load.price);
                queryClient.invalidateQueries({ queryKey: ['driver-active-loads'] });
            }
        } else {
            setIsTracking(false);
        }
    };

    const handleCompleteDelivery = async (loadId: string) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async (e: any) => {
            const file = e.target.files[0];
            if (!file) return;

            setLoading(true);
            try {
                // 1. Upload POD Image
                const fileName = `${loadId}_pod_img_${Date.now()}.png`;
                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('pods')
                    .upload(fileName, file);

                if (uploadError) throw uploadError;

                const { data: publicUrlData } = supabase.storage.from('pods').getPublicUrl(fileName);
                setPendingPodImage(publicUrlData.publicUrl);
                setActiveLoadForSignature(loadId);
                setIsSignatureModalOpen(true);
            } catch (err: any) {
                toast.error("فشل رفع الصورة: " + err.message);
            } finally {
                setLoading(false);
            }
        };
        input.click();
    };

    const handleSaveSignature = async (signatureDataUrl: string) => {
        if (!activeLoadForSignature || !pendingPodImage) return;

        setLoading(true);
        try {
            // 1. Convert DataURL to Blob
            const res = await fetch(signatureDataUrl);
            const blob = await res.blob();
            const fileName = `${activeLoadForSignature}_signature_${Date.now()}.png`;

            // 2. Upload Signature to Supabase
            const { error: uploadError } = await supabase.storage
                .from('pods')
                .upload(fileName, blob);

            if (uploadError) throw uploadError;

            const { data: publicUrlData } = supabase.storage.from('pods').getPublicUrl(fileName);
            const signatureUrl = publicUrlData.publicUrl;

            // 3. Update Load with both POD image and Signature
            const updateData = {
                status: 'completed',
                pod_image_url: pendingPodImage,
                signature_url: signatureUrl,
                delivered_at: new Date().toISOString()
            };

            const { error: updateError } = await supabase
                .from('loads')
                .update(updateData)
                .eq('id', activeLoadForSignature);

            if (updateError) {
                // Network error? Save to offline queue
                const queueItem = { loadId: activeLoadForSignature, data: updateData };
                const newQueue = [...offlineQueue, queueItem];
                setOfflineQueue(newQueue);
                localStorage.setItem('fox_offline_pods', JSON.stringify(newQueue));
                toast.warning("تعذر الاتصال بالخادم. تم حفظ الشحنة محلياً وسيتم المزامنة لاحقاً 💾");
            } else {
                toast.success("تم إتمام التسليم وتوثيق التوقيع بنجاح ✅");
            }

            setIsSignatureModalOpen(false);
            setIsTracking(false);
            setPendingPodImage(null);
            setActiveLoadForSignature(null);
            queryClient.invalidateQueries({ queryKey: ['driver-active-loads'] });
        } catch (err: any) {
            toast.error("فشل حفظ التوقيع: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const syncOfflineItems = async () => {
        if (offlineQueue.length === 0 || !navigator.onLine) return;

        setLoading(true);
        const item = offlineQueue[0];
        try {
            const { error } = await supabase.from('loads').update(item.data).eq('id', item.loadId);
            if (!error) {
                const remaining = offlineQueue.slice(1);
                setOfflineQueue(remaining);
                localStorage.setItem('fox_offline_pods', JSON.stringify(remaining));
                toast.success("تمت مزامنة البيانات المحفوظة بنجاح! ⚡");
            }
        } catch (e) { } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const interval = setInterval(syncOfflineItems, 60000); // Try sync every minute
        return () => clearInterval(interval);
    }, [offlineQueue]);

    const getCurrentStepIndex = (status: string) => {
        const idx = steps.findIndex(s => s.id === status);
        return idx === -1 ? 0 : idx;
    };

    return (
        <AppLayout>
            <div className="max-w-6xl mx-auto space-y-8">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-600/10 rounded-2xl text-blue-600"><Navigation size={32} /></div>
                    <div className="flex-1 flex justify-between items-center">
                        <div>
                            <h1 className="text-4xl font-black tracking-tight text-slate-800">التتبع الحي</h1>
                            <p className="text-muted-foreground font-medium mt-1">تتبع موقعك الحالي ومسار رحلتك نحو نقطة التسليم</p>
                        </div>
                        {offlineQueue.length > 0 && (
                            <Button
                                variant="outline"
                                className="bg-amber-50 border-amber-200 text-amber-700 animate-pulse font-bold rounded-2xl gap-2"
                                onClick={syncOfflineItems}
                            >
                                <RotateCcw size={16} /> يوجد {offlineQueue.length} شحنات بانتظار المزامنة
                            </Button>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {isLoading ? (
                        <div className="lg:col-span-3 h-96 flex items-center justify-center">
                            <Loader2 className="animate-spin text-blue-600" size={48} />
                        </div>
                    ) : (
                        <>
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

                                                <div className="grid grid-cols-2 gap-3 mt-4">
                                                    <Button
                                                        className={`h-12 rounded-xl font-bold gap-2 ${isTracking ? 'bg-rose-500 hover:bg-rose-600 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}`}
                                                        onClick={() => handleStartTrip(load.id)}
                                                    >
                                                        {isTracking ? <AlertCircle size={18} /> : <Navigation size={18} />}
                                                        {isTracking ? 'إنهاء التتبع' : 'بدء الرحلة (تتبع)'}
                                                    </Button>

                                                    <Button variant="outline" className="h-12 border-2 border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-blue-600 rounded-xl font-bold gap-2" onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&origin=${currentLocation.lat},${currentLocation.lng}&destination=${encodeURIComponent(load.receiver_address || load.destination)}`, '_blank')}>
                                                        <MapPin size={18} /> خرائط جوجل
                                                    </Button>
                                                </div>
                                                {load.status === 'in_progress' && (
                                                    <Button
                                                        className="w-full mt-3 h-14 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl gap-2 shadow-lg shadow-emerald-500/20"
                                                        onClick={() => handleCompleteDelivery(load.id)}
                                                    >
                                                        <PackageCheck size={24} /> تأكيد وصول وتسليم الشحنة
                                                    </Button>
                                                )}
                                            </CardContent>
                                        </Card>
                                    ))
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Signature Modal */}
            <Dialog open={isSignatureModalOpen} onOpenChange={setIsSignatureModalOpen}>
                <DialogContent className="max-w-md bg-transparent border-none shadow-none p-0">
                    <DialogHeader className="hidden">
                        <DialogTitle>توقيع المستلم</DialogTitle>
                    </DialogHeader>
                    <SignaturePad
                        onSave={handleSaveSignature}
                        onCancel={() => setIsSignatureModalOpen(false)}
                    />
                </DialogContent>
            </Dialog>

            {loading && (
                <div className="fixed inset-0 z-[100] bg-white/60 backdrop-blur-sm flex items-center justify-center">
                    <div className="text-center">
                        <Loader2 size={48} className="animate-spin text-blue-600 mx-auto mb-4" />
                        <p className="font-black text-slate-800">جاري توثيق البيانات رقمياً...</p>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}
