import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { api } from '@/services/api';
import AppLayout from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    Wrench,
    Camera,
    Upload,
    CheckCircle2,
    AlertTriangle,
    Loader2,
    Fuel,
    Disc,
    Settings,
    HelpCircle,
    Package,
    X,
    Plus
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function DriverMaintenance() {
    const { userProfile } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const truckId = searchParams.get('truck_id');

    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [activeLoads, setActiveLoads] = useState<any[]>([]);
    const [userTrucks, setUserTrucks] = useState<any[]>([]);

    const [form, setForm] = useState({
        truck_id: '',
        category: '',
        load_id: '',
        description: '',
        other_category: '',
        repair_cost: '',
        images: [] as string[],
        invoice_image: ''
    });

    const [cameraActive, setCameraActive] = useState(false);
    const [capturedImages, setCapturedImages] = useState<string[]>([]);
    const [tempPhotos, setTempPhotos] = useState<string[]>([]);
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (userProfile?.id) {
            async function loadData() {
                // 1. Get ONLY this user's specific loads (Current/Active)
                const data = await api.getUserLoads(userProfile.id);
                const current = data.filter((l: any) => l.status === 'in_progress' || l.status === 'accepted');

                setActiveLoads(current || []);

                // 2. Get User Trucks
                // First check if current user is a carrier/owner
                const { data: ownedTrucks } = await supabase
                    .from('trucks')
                    .select('*')
                    .eq('owner_id', userProfile.id);

                if (ownedTrucks && ownedTrucks.length > 0) {
                    setUserTrucks(ownedTrucks);
                    // Pre-select if truckId in URL
                    if (truckId) {
                        setForm(p => ({ ...p, truck_id: truckId }));
                    }
                } else {
                    // Check if they are a sub-driver with an assigned truck
                    const { data: subDriver } = await supabase
                        .from('sub_drivers')
                        .select('assigned_truck_id, trucks(*)')
                        .eq('id', userProfile.id)
                        .maybeSingle();

                    if (subDriver?.trucks) {
                        setUserTrucks([subDriver.trucks]);
                        setForm(p => ({ ...p, truck_id: (subDriver.trucks as any).id }));
                    }
                }

                // 3. Auto-link load if truck is already selected
                const currentTruckId = truckId || form.truck_id;
                if (currentTruckId) {
                    const matchingLoad = (current || []).find((l: any) => l.truck_id === currentTruckId || l.driver_id === userProfile.id);
                    if (matchingLoad) {
                        setForm(p => ({ ...p, load_id: matchingLoad.id, truck_id: currentTruckId }));
                    }
                }
            }
            loadData();
        }
    }, [userProfile, truckId]);

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'environment',
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                },
                audio: false
            });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                streamRef.current = stream;
                setCameraActive(true);
                setTempPhotos([]); // Clear temp photos on new session
            }
        } catch (err) {
            console.error("Camera error:", err);
            toast.error("فشل الوصول للكاميرا، يرجى التأكد من إعطاء الصلاحيات للمتصفح.");
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        setCameraActive(false);
    };

    const capturePhoto = () => {
        if (videoRef.current) {
            const canvas = document.createElement('canvas');
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(videoRef.current, 0, 0);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);

            setTempPhotos(prev => [...prev, dataUrl]);
            toast.success("تم التقاط الصورة بنجاح");
        }
    };

    const confirmPhotos = () => {
        if (tempPhotos.length === 0) {
            toast.error("يرجى التقاط صورة واحدة على الأقل");
            return;
        }

        if (step === 2) {
            setCapturedImages(prev => [...prev, ...tempPhotos]);
        } else if (step === 3) {
            setForm(p => ({ ...p, invoice_image: tempPhotos[tempPhotos.length - 1] }));
        }
        stopCamera();
        toast.success("تم حفظ الصور في الخانة بنجاح ✅");
    };

    const uploadToSupabase = async (base64: string, path: string) => {
        const fileName = `${userProfile?.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
        const blob = await (await fetch(base64)).blob();

        const { data, error } = await supabase.storage
            .from('maintenance_photos')
            .upload(fileName, blob);

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
            .from('maintenance_photos')
            .getPublicUrl(fileName);

        return publicUrl;
    };

    const handleSubmit = async () => {
        const finalCategory = form.category === 'other' ? form.other_category : form.category;

        if (!form.truck_id || !form.category || !form.load_id || !form.description || capturedImages.length === 0 || !form.invoice_image || (form.category === 'other' && !form.other_category)) {
            toast.error("يرجى إكمال كافة البيانات والصور المطلوبة واختيار الشاحنة والشحنة");
            return;
        }

        if (capturedImages.length < 2) {
            toast.error("يجب التقاط صورتين على الأقل (صورة العطل + صورة لوحة السيارة الأمامية)");
            return;
        }

        setLoading(true);
        try {
            // 1. Upload Images
            const imageUrls = await Promise.all(
                capturedImages.map(img => uploadToSupabase(img, 'requests'))
            );

            const invoiceUrl = await uploadToSupabase(form.invoice_image, 'invoices');

            // 2. Save Request
            const { error } = await supabase.from('maintenance_requests' as any).insert({
                driver_id: userProfile?.id,
                truck_id: form.truck_id,
                load_id: form.load_id,
                category: form.category === 'other' ? form.other_category : form.category,
                description: form.description,
                images: imageUrls,
                repair_cost: parseFloat(form.repair_cost) || 0,
                invoice_image: invoiceUrl,
                status: 'pending'
            } as any);

            if (error) throw error;

            toast.success("تم إرسال طلب الصيانة بنجاح ✅");
            navigate('/driver/dashboard');
        } catch (err: any) {
            toast.error("فشل إرسال الطلب: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const categories = [
        { id: 'fuel', name: 'وقود / بنزين', icon: <Fuel /> },
        { id: 'tire', name: 'إطارات / كاوتش', icon: <Disc /> },
        { id: 'mechanical', name: 'عطل ميكانيكي', icon: <Settings /> },
        { id: 'other', name: 'أخرى', icon: <HelpCircle /> },
    ];

    return (
        <AppLayout>
            <div className="max-w-3xl mx-auto pb-20">
                <div className="flex items-center justify-between mb-10">
                    <div className="flex items-center gap-4">
                        <div className="p-4 bg-orange-600/10 rounded-2xl text-orange-600">
                            <Wrench size={32} />
                        </div>
                        <div>
                            <h1 className="text-4xl font-black text-slate-800">صيانة الشاحنة</h1>
                            <p className="text-muted-foreground font-medium">سجل العطل وارفع الفواتير لطلب التعويض</p>
                        </div>
                    </div>
                    <Button variant="ghost" className="rounded-2xl font-black gap-2" onClick={() => navigate(-1)}>
                        <X size={20} /> إغلاق
                    </Button>
                </div>

                <div className="flex justify-between mb-8 px-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className={`flex flex-col items-center gap-2 ${step >= i ? 'text-orange-600' : 'text-slate-300'}`}>
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border-2 ${step >= i ? 'border-orange-600 bg-orange-50' : 'border-slate-200'}`}>
                                {i}
                            </div>
                            <span className="text-xs font-black">{i === 1 ? 'البيانات' : i === 2 ? 'صور العطل' : 'الفاتورة'}</span>
                        </div>
                    ))}
                </div>

                <Card className="rounded-[2.5rem] border-none shadow-2xl overflow-hidden">
                    <CardContent className="p-8 md:p-12">
                        <AnimatePresence mode="wait">
                            {step === 1 && (
                                <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                                    <div className="space-y-4">
                                        <Label className="text-lg font-black text-orange-600">اختر المركبة (العربية) *</Label>
                                        <Select value={form.truck_id} onValueChange={val => setForm(p => ({ ...p, truck_id: val }))}>
                                            <SelectTrigger className="h-14 rounded-2xl border-slate-200">
                                                <SelectValue placeholder="اختر الشاحنة المصابة" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {userTrucks.map(t => (
                                                    <SelectItem key={t.id} value={t.id}>{t.plate_number} - {t.brand} ({t.model})</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-4">
                                        <Label className="text-lg font-black">نوع العطل</Label>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            {categories.map(cat => (
                                                <button
                                                    key={cat.id}
                                                    onClick={() => setForm(p => ({ ...p, category: cat.id }))}
                                                    className={`p-6 rounded-3xl flex flex-col items-center gap-3 transition-all border-2 ${form.category === cat.id ? 'bg-orange-600 text-white border-orange-600 shadow-xl scale-105' : 'bg-white text-slate-600 border-slate-100 hover:border-orange-200'}`}
                                                >
                                                    {cat.icon}
                                                    <span className="font-bold text-xs">{cat.name}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <Label className="text-lg font-black text-rose-600">ربط بشحنة (إجباري) *</Label>
                                        <Select value={form.load_id} onValueChange={val => setForm(p => ({ ...p, load_id: val }))}>
                                            <SelectTrigger className="h-14 rounded-2xl border-slate-200">
                                                <SelectValue placeholder="اختر الشحنة المتأثرة" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {activeLoads.map(l => (
                                                    <SelectItem key={l.id} value={l.id}>{l.origin} - {l.destination} (#{l.id.substring(0, 8)})</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {form.category === 'other' && (
                                        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                                            <Label className="text-lg font-black">حدد نوع العطل الآخر</Label>
                                            <Input
                                                placeholder="مثال: عطل في الإضاءة، كسر في الزجاج..."
                                                className="h-14 rounded-2xl border-slate-200"
                                                value={form.other_category}
                                                onChange={e => setForm(p => ({ ...p, other_category: e.target.value }))}
                                            />
                                        </motion.div>
                                    )}

                                    <div className="space-y-4">
                                        <Label className="text-lg font-black">وصف المشكلة</Label>
                                        <Textarea
                                            placeholder="اشرح ما حدث بالتفصيل..."
                                            className="rounded-2xl min-h-[120px] border-slate-200"
                                            value={form.description}
                                            onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                                        />
                                    </div>

                                    <div className="flex gap-4">
                                        <Button
                                            variant="ghost"
                                            className="h-16 flex-1 rounded-2xl font-black"
                                            onClick={() => navigate(-1)}
                                        >
                                            إلغاء
                                        </Button>
                                        <Button
                                            className="h-16 flex-[2] rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-black text-lg"
                                            onClick={() => setStep(2)}
                                            disabled={!form.truck_id || !form.category || !form.load_id || !form.description || (form.category === 'other' && !form.other_category)}
                                        >
                                            التالي: تصوير العطل
                                        </Button>
                                    </div>
                                </motion.div>
                            )}

                            {step === 2 && (
                                <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                                    <div className="text-center space-y-2">
                                        <h3 className="text-2xl font-black">التقط صوراً للعطل 📸</h3>
                                        <div className="p-4 bg-orange-50 border border-orange-200 rounded-2xl space-y-1">
                                            <p className="text-orange-700 font-black text-sm">💡 كاميرا برمجية مباشرة (لا تفتح الاستوديو)</p>
                                            <p className="text-rose-600 font-black text-xs">⚠️ يجب تصوير لوحة السيارة الأمامية مع العطل لضمان التوثيق</p>
                                        </div>
                                    </div>

                                    {cameraActive ? (
                                        <div className="fixed inset-0 z-[1000] bg-black flex flex-col items-center justify-center p-4">
                                            <div className="relative w-full max-w-2xl aspect-[3/4] md:aspect-video rounded-[3rem] overflow-hidden bg-black shadow-2xl border-4 border-white/10">
                                                <video
                                                    ref={videoRef}
                                                    autoPlay
                                                    playsInline
                                                    className="w-full h-full object-cover scale-x-[-1]"
                                                />

                                                {/* Guide Overlay */}
                                                <div className="absolute inset-0 border-2 border-white/20 border-dashed m-10 rounded-2xl pointer-events-none flex items-center justify-center">
                                                    <p className="text-white/40 text-[10px] uppercase font-black tracking-widest">قم بتوسيط العطل أو لوحة النمر</p>
                                                </div>

                                                {/* Photos count */}
                                                <div className="absolute top-6 left-6 px-4 py-2 bg-black/50 backdrop-blur-md rounded-full border border-white/10">
                                                    <span className="text-white font-black text-xs">{tempPhotos.length} صور ملتقطة</span>
                                                </div>

                                                <button
                                                    onClick={stopCamera}
                                                    className="absolute top-6 right-6 w-10 h-10 bg-black/50 backdrop-blur-md rounded-full border border-white/10 flex items-center justify-center text-white"
                                                >
                                                    <X size={20} />
                                                </button>
                                            </div>

                                            {/* Camera Controls */}
                                            <div className="mt-10 flex items-center gap-12">
                                                <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white/20">
                                                    {tempPhotos.length > 0 && <img src={tempPhotos[tempPhotos.length - 1]} className="w-full h-full object-cover" />}
                                                </div>

                                                <button
                                                    onClick={capturePhoto}
                                                    className="w-24 h-24 rounded-full border-4 border-white flex items-center justify-center active:scale-90 transition-transform"
                                                >
                                                    <div className="w-20 h-20 bg-white rounded-full scale-95" />
                                                </button>

                                                <button
                                                    onClick={confirmPhotos}
                                                    disabled={tempPhotos.length === 0}
                                                    className={cn(
                                                        "w-16 h-16 rounded-full flex items-center justify-center transition-all",
                                                        tempPhotos.length > 0 ? "bg-emerald-500 text-white shadow-xl shadow-emerald-500/20" : "bg-white/10 text-white/20"
                                                    )}
                                                >
                                                    <CheckCircle2 size={32} />
                                                </button>
                                            </div>
                                            <p className="mt-6 text-white/60 font-medium text-sm">أكمل التقاط الصور ثم اضغط على "صح"</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                            {capturedImages.map((img, i) => (
                                                <div key={i} className="relative group aspect-square rounded-3xl overflow-hidden shadow-md border-2 border-slate-50">
                                                    <img src={img} className="w-full h-full object-cover" />
                                                    <button onClick={() => setCapturedImages(prev => prev.filter((_, idx) => idx !== i))} className="absolute top-2 left-2 p-1.5 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <X size={16} />
                                                    </button>
                                                </div>
                                            ))}

                                            <button
                                                onClick={startCamera}
                                                className="aspect-square rounded-3xl border-4 border-dashed border-slate-200 flex flex-col items-center justify-center gap-3 text-slate-400 hover:border-orange-400 hover:text-orange-400 transition-all font-black group bg-slate-50/50"
                                            >
                                                <div className="p-4 bg-white rounded-2xl group-hover:bg-orange-50 transition-colors shadow-sm border border-slate-100">
                                                    <Plus size={32} />
                                                </div>
                                                إضافة صورة
                                            </button>
                                        </div>
                                    )}

                                    <div className="flex gap-4">
                                        <Button variant="ghost" className="h-16 flex-1 rounded-2xl font-black" onClick={() => setStep(1)}>رجوع</Button>
                                        <Button
                                            className="h-16 flex-[2] rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-black"
                                            onClick={() => setStep(3)}
                                            disabled={capturedImages.length === 0}
                                        >
                                            التالي: الفاتورة والتكلفة
                                        </Button>
                                    </div>
                                </motion.div>
                            )}

                            {step === 3 && (
                                <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                                    <div className="space-y-6">
                                        <Label className="text-xl font-black">تكلفة الإصلاح (ريال)</Label>
                                        <Input
                                            type="number"
                                            placeholder="0.00"
                                            className="h-16 rounded-2xl text-2xl font-black text-orange-600 border-slate-200"
                                            value={form.repair_cost}
                                            onChange={e => setForm(p => ({ ...p, repair_cost: e.target.value }))}
                                        />
                                    </div>

                                    <div className="space-y-4">
                                        <Label className="text-xl font-black">صورة الفاتورة 📄</Label>
                                        {form.invoice_image ? (
                                            <div className="relative rounded-3xl overflow-hidden shadow-xl aspect-[4/3] group border-4 border-emerald-50">
                                                <img src={form.invoice_image} className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                    <Button variant="outline" className="text-white border-white font-black rounded-2xl h-14 px-8" onClick={startCamera}>
                                                        {loading ? <Loader2 className="animate-spin" /> : 'إعادة تصوير الفاتورة'}
                                                    </Button>
                                                </div>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={startCamera}
                                                className="w-full aspect-video rounded-[2rem] border-4 border-dashed border-slate-200 flex flex-col items-center justify-center gap-4 text-slate-400 hover:border-orange-400 hover:text-orange-400 transition-all font-black group bg-slate-50/50"
                                            >
                                                <div className="p-6 bg-white rounded-3xl shadow-sm border border-slate-100 group-hover:border-orange-200 transition-all">
                                                    <Camera size={48} />
                                                </div>
                                                صور الفاتورة الآن
                                            </button>
                                        )}
                                    </div>

                                    <div className="flex gap-4">
                                        <Button variant="ghost" className="h-16 flex-1 rounded-2xl font-black" onClick={() => setStep(2)}>رجوع</Button>
                                        <Button
                                            className="h-16 flex-[2] rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-lg gap-2 shadow-xl shadow-emerald-100"
                                            onClick={handleSubmit}
                                            disabled={loading || !form.repair_cost || !form.invoice_image}
                                        >
                                            {loading ? <Loader2 className="animate-spin" /> : <><CheckCircle2 /> إرسال للمراجعة</>}
                                        </Button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
