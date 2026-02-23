import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/services/api';
import AppLayout from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandList, CommandItem } from "@/components/ui/command";
import { toast } from 'sonner';
import { Loader2, ChevronsUpDown, Package, Info, Search, MapPin, CheckCircle2, User, ChevronRight, ChevronLeft, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const SAUDI_CITIES = [
  { value: "riyadh", label: "الرياض" }, { value: "jeddah", label: "جدة" },
  { value: "mecca", label: "مكة المكرمة" }, { value: "medina", label: "المدينة المنورة" },
  { value: "dammam", label: "الدمام" }, { value: "khobar", label: "الخبر" },
  { value: "tabuk", label: "تبوك" }, { value: "abha", label: "أبها" },
  { value: "buraidah", label: "بريدة" }, { value: "hail", label: "حائل" },
];

const TRUCK_CATEGORIES = [
  { id: 'trella', label: 'تريلا' },
  { id: 'lorry', label: 'لوري' },
  { id: 'dyna', label: 'دينا' },
  { id: 'pickup', label: 'بيك أب' },
];

const TRUCK_TYPES: Record<string, { value: string, label: string }[]> = {
  trella: [
    { value: 'flatbed', label: 'تريلا سطحة (25 طن)' },
    { value: 'curtain', label: 'تريلا ستارة (25 طن)' },
    { value: 'box', label: 'تريلا جوانب ألماني صندوق (25 طن)' },
    { value: 'refrigerated', label: 'تريلا ثلاجة تبريد (25 طن)' },
    { value: 'lowboy', label: 'تريلا لوبوي (معدات ثقيلة)' },
    { value: 'tank', label: 'تريلا صهريج' },
  ],
  lorry: [
    { value: 'box', label: 'لوري صندوق مغلق (11 طن)' },
    { value: 'flatbed', label: 'لوري سطحة (11 طن)' },
    { value: 'refrigerated', label: 'لوري ثلاجة مبرد (11 طن)' },
    { value: 'curtain', label: 'لوري ستارة' },
  ],
  dyna: [
    { value: 'box', label: 'دينا صندوق مغلق (4 طن)' },
    { value: 'refrigerated', label: 'دينا ثلاجة تبريد (4 طن)' },
    { value: 'flatbed', label: 'دينا سطحة (4 طن)' },
  ],
  pickup: [
    { value: 'flatbed', label: 'بيك أب مفتوح (1 طن)' },
    { value: 'box', label: 'بيك أب صندوق (1 طن)' },
  ]
};

export default function ShipperPostLoad() {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const totalSteps = 4;

  const [openOrigin, setOpenOrigin] = useState(false);
  const [openDest, setOpenDest] = useState(false);
  const today = new Date().toISOString().split('T')[0];

  const [form, setForm] = useState({
    origin: '',
    destination: '',
    weight: '',
    price: '',
    package_type: '',
    pickup_date: today,
    truck_category: '',
    body_type: '',
    receiver_name: '',
    receiver_phone: '',
  });

  const nextStep = () => { if (step < totalSteps) setStep(step + 1); };
  const prevStep = () => { if (step > 1) setStep(step - 1); };

  const isCurrentStepValid = () => {
    if (step === 1) return form.origin !== '' && form.destination !== '' && form.pickup_date !== '';
    if (step === 2) return form.truck_category !== '' && form.body_type !== '' && form.weight !== '' && form.package_type !== '';
    if (step === 3) return form.receiver_name !== '' && form.receiver_phone.length >= 8;
    if (step === 4) return form.price !== '';
    return false;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step !== totalSteps) {
      if (isCurrentStepValid()) nextStep();
      return;
    }

    if (!userProfile?.id) {
      toast.error("يرجى تسجيل الدخول أولاً");
      return;
    }

    setLoading(true);
    try {
      let phone = form.receiver_phone.trim();
      if (phone.startsWith('0')) phone = phone.substring(1);

      // بناء البيانات مع مطابقة أسماء الأعمدة في قاعدة البيانات
      const finalPayload = {
        origin: form.origin,
        destination: form.destination,
        weight: parseFloat(form.weight) || 0,
        price: parseFloat(form.price) || 0,
        package_type: form.package_type,
        pickup_date: form.pickup_date,
        body_type: form.body_type,
        // تم تغيير truck_type إلى truck_type_required بناءً على خطأ PGRST204
        // إذا كان اسم العمود في السوبابيس مختلفاً، قم بتغيير الكلمة بالأسفل فقط
        truck_type_required: form.truck_category,
        receiver_name: form.receiver_name,
        receiver_phone: '+966' + phone,
        status: 'available',
        description: `شحنة من ${form.origin} إلى ${form.destination}`
      };

      await api.postLoad(finalPayload, userProfile.id);

      toast.success("تم نشر الشحنة بنجاح ✅");
      navigate('/shipper/dashboard');
    } catch (err: any) {
      console.error("Full Error details:", err);
      // تنبيه المستخدم بالخطأ الدقيق
      const msg = err.message || "حدث خطأ غير متوقع";
      toast.error(`فشل النشر: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto pb-10 pt-4 px-4">
        {/* Progress Stepper */}
        <div className="mb-8 relative">
          <div className="flex items-center justify-between mb-2 absolute w-full top-6 z-0 px-8">
            <div className={`h-1 flex-1 rounded-full transition-all duration-500 ${step >= 2 ? 'bg-primary' : 'bg-slate-200'}`}></div>
            <div className={`h-1 flex-1 rounded-full transition-all duration-500 ${step >= 3 ? 'bg-primary' : 'bg-slate-200'} mx-2`}></div>
            <div className={`h-1 flex-1 rounded-full transition-all duration-500 ${step >= 4 ? 'bg-primary' : 'bg-slate-200'}`}></div>
          </div>
          <div className="flex justify-between relative z-10">
            {[1, 2, 3, 4].map((indicator) => (
              <div key={indicator} className="flex flex-col items-center gap-2">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-black transition-all duration-500 flex-shrink-0 ${step === indicator ? 'bg-primary text-white scale-110 shadow-lg border-4 border-white' : step > indicator ? 'bg-emerald-500 text-white border-4 border-white' : 'bg-white text-slate-400 border-4 border-slate-100'}`}>
                  {step > indicator ? <CheckCircle2 size={24} /> : indicator}
                </div>
              </div>
            ))}
          </div>
        </div>

        <Card className="rounded-[2.5rem] shadow-xl border-none overflow-hidden bg-white">
          <CardHeader className="bg-slate-50 border-b p-8 text-center">
            <CardTitle className="text-2xl font-black text-slate-800">
              {step === 1 ? 'حدد مسار الرحلة' : step === 2 ? 'تفاصيل الحمولة' : step === 3 ? 'بيانات المستلم' : 'التسعير والنشر'}
            </CardTitle>
          </CardHeader>

          <CardContent className="p-8 md:p-12">
            <form onSubmit={handleSubmit}>
              <AnimatePresence mode="wait">
                <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>

                  {step === 1 && (
                    <div className="space-y-8">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                          <Label className="font-bold flex items-center gap-2"><MapPin size={18} className="text-primary" /> من</Label>
                          <Popover open={openOrigin} onOpenChange={setOpenOrigin}>
                            <PopoverTrigger asChild>
                              <Button variant="outline" className="w-full h-16 rounded-2xl font-bold justify-between">{form.origin || "اختر المدينة"}</Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[300px] p-0">
                              <Command>
                                <CommandList>
                                  {SAUDI_CITIES.map(c => (
                                    <CommandItem key={c.value} onSelect={() => { setForm(p => ({ ...p, origin: c.label })); setOpenOrigin(false); }}>{c.label}</CommandItem>
                                  ))}
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                        </div>
                        <div className="space-y-3">
                          <Label className="font-bold flex items-center gap-2"><MapPin size={18} className="text-emerald-500" /> إلى</Label>
                          <Popover open={openDest} onOpenChange={setOpenDest}>
                            <PopoverTrigger asChild>
                              <Button variant="outline" className="w-full h-16 rounded-2xl font-bold justify-between">{form.destination || "اختر المدينة"}</Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[300px] p-0">
                              <Command>
                                <CommandList>
                                  {SAUDI_CITIES.map(c => (
                                    <CommandItem key={c.value} onSelect={() => { setForm(p => ({ ...p, destination: c.label })); setOpenDest(false); }}>{c.label}</CommandItem>
                                  ))}
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <Label className="font-bold flex items-center gap-2"><Calendar size={18} /> موعد التحميل</Label>
                        <Input type="date" value={form.pickup_date} min={today} onChange={e => setForm(p => ({ ...p, pickup_date: e.target.value }))} className="h-16 rounded-2xl" />
                      </div>
                    </div>
                  )}

                  {step === 2 && (
                    <div className="space-y-8">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <Label className="font-bold">نوع الشاحنة</Label>
                          <Select value={form.truck_category} onValueChange={(v) => setForm(p => ({ ...p, truck_category: v, body_type: '' }))}>
                            <SelectTrigger className="h-16 rounded-2xl font-bold"><SelectValue placeholder="اختر الفئة" /></SelectTrigger>
                            <SelectContent>
                              {TRUCK_CATEGORIES.map(cat => <SelectItem key={cat.id} value={cat.id}>{cat.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-4">
                          <Label className="font-bold">الحجم / النوع</Label>
                          <Select disabled={!form.truck_category} value={form.body_type} onValueChange={(v) => setForm(p => ({ ...p, body_type: v }))}>
                            <SelectTrigger className="h-16 rounded-2xl font-bold"><SelectValue placeholder="اختر النوع" /></SelectTrigger>
                            <SelectContent>
                              {form.truck_category && TRUCK_TYPES[form.truck_category]?.map(type => <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-4">
                          <Label className="font-bold">الوزن (طن)</Label>
                          <Input type="number" value={form.weight} onChange={e => setForm(p => ({ ...p, weight: e.target.value }))} className="h-16 rounded-2xl font-black text-xl" placeholder="0" />
                        </div>
                        <div className="space-y-4">
                          <Label className="font-bold">نوع البضاعة</Label>
                          <Input value={form.package_type} onChange={e => setForm(p => ({ ...p, package_type: e.target.value }))} className="h-16 rounded-2xl font-bold" placeholder="مثال: مواد بناء" />
                        </div>
                      </div>
                    </div>
                  )}

                  {step === 3 && (
                    <div className="space-y-6">
                      <div className="space-y-3">
                        <Label className="font-bold">اسم المستلم</Label>
                        <Input value={form.receiver_name} onChange={e => setForm(p => ({ ...p, receiver_name: e.target.value }))} className="h-16 rounded-2xl font-bold" placeholder="اسم الشخص أو المؤسسة" />
                      </div>
                      <div className="space-y-3">
                        <Label className="font-bold">جوال المستلم</Label>
                        <div className="flex">
                          <span className="flex items-center px-4 bg-slate-100 border rounded-r-2xl h-16 font-black">+966</span>
                          <Input value={form.receiver_phone} onChange={e => setForm(p => ({ ...p, receiver_phone: e.target.value.replace(/\D/g, '').slice(0, 9) }))} className="h-16 rounded-l-2xl rounded-r-none font-black text-xl" placeholder="5xxxxxxxx" dir="ltr" />
                        </div>
                      </div>
                    </div>
                  )}

                  {step === 4 && (
                    <div className="space-y-8 max-w-md mx-auto text-center">
                      <div className="bg-[#0f172a] text-white p-8 rounded-[2rem] shadow-2xl">
                        <Label className="font-bold text-slate-300 text-lg block mb-4">عرض السعر المقترح (ر.س)</Label>
                        <Input type="number" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} className="h-20 rounded-2xl bg-white/10 border-white/20 font-black text-4xl text-center text-white" placeholder="0" dir="ltr" />
                        <p className="mt-4 text-emerald-400 text-sm font-medium">هذا السعر هو سعر العرض الأولي للسائقين</p>
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>

              <div className="flex items-center justify-between mt-12 pt-6 border-t">
                <Button type="button" variant="ghost" onClick={prevStep} className={`h-14 px-6 font-bold ${step === 1 ? 'invisible' : ''}`}><ChevronRight className="ml-2" /> رجوع</Button>
                <Button type="submit" disabled={loading || !isCurrentStepValid()} className={`h-14 px-10 rounded-xl font-black text-lg ${step === totalSteps ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-primary'}`}>
                  {loading ? <Loader2 className="animate-spin" /> : step === totalSteps ? "نشر الشحنة الآن" : "التالي"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}