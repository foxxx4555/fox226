import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/services/api';
import AppLayout from '@/components/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, MapPin, Phone, MessageCircle, X, CheckCircle2, Clock, Navigation, Printer, FileText, User, Package, Truck as TruckIcon, ListChecks, ArrowRightLeft, Trash2, PackageCheck } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogTitle, DialogHeader } from "@/components/ui/dialog";
import SignaturePad from '@/components/finance/SignaturePad';

export default function DriverTasks() {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<any[]>([]);
  const [bids, setBids] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDeliveryTask, setConfirmDeliveryTask] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  const [activeLoadForSignature, setActiveLoadForSignature] = useState<string | null>(null);
  const [pendingPodImage, setPendingPodImage] = useState<string | null>(null);

  const fetchTasks = async () => {
    if (!userProfile?.id) return;
    try {
      const [tasksData, bidsData] = await Promise.all([
        api.getUserLoads(userProfile.id),
        api.getBids(userProfile.id, 'driver')
      ]);
      const activeTasks = tasksData.filter((l: any) => l.status === 'in_progress' || l.status === 'accepted');
      setTasks(activeTasks);
      setBids(bidsData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();

    // إعداد المزامنة اللحظية مع تتبع الأخطاء والتأكد من جلب البيانات بأحدث حالة
    const channel = supabase.channel('driver_tasks_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'loads', filter: `driver_id=eq.${userProfile?.id}` },
        () => {
          console.log('🔄 تحديث لحظي للمهام...');
          fetchTasks();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'load_bids', filter: `driver_id=eq.${userProfile?.id}` },
        () => {
          console.log('🔄 تحديث لحظي للعروض...');
          fetchTasks();
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userProfile?.id]);

  const handleCompleteClick = (task: any) => {
    setConfirmDeliveryTask(task);
  };

  const handleFileSelect = async (e: any) => {
    const file = e.target.files[0];
    if (!file || !confirmDeliveryTask) return;

    const task = confirmDeliveryTask;
    setConfirmDeliveryTask(null);
    setIsProcessing(true);

    try {
      const fileName = `${task.id}_pod_img_${Date.now()}.png`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('pods')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from('pods').getPublicUrl(fileName);
      setPendingPodImage(publicUrlData.publicUrl);
      setActiveLoadForSignature(task.id);
      setIsSignatureModalOpen(true);
    } catch (err: any) {
      toast.error("فشل رفع الصورة: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveSignature = async (signatureDataUrl: string) => {
    if (!activeLoadForSignature || !pendingPodImage) return;

    setIsProcessing(true);
    try {
      const res = await fetch(signatureDataUrl);
      const blob = await res.blob();
      const fileName = `${activeLoadForSignature}_signature_${Date.now()}.png`;

      const { error: uploadError } = await supabase.storage
        .from('pods')
        .upload(fileName, blob);

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from('pods').getPublicUrl(fileName);
      const signatureUrl = publicUrlData.publicUrl;

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

      const targetTask = tasks.find(t => t.id === activeLoadForSignature);
      if (targetTask?.owner_id) {
        await api.createNotification(
          targetTask.owner_id,
          'تم تسليم شحنتك بنجاح ✅',
          `قام السائق ${userProfile?.full_name || ''} بتسليم الشحنة المرجعية #${activeLoadForSignature.substring(0, 6)} بنجاح وإرفاق الإثباتات.`,
          'complete'
        );
      }

      if (updateError) throw updateError;

      toast.success("تم إنهاء الرحلة وتوثيق الإثبات بنجاح 🏁");
      setIsSignatureModalOpen(false);
      setPendingPodImage(null);
      setActiveLoadForSignature(null);
      fetchTasks();
    } catch (err: any) {
      toast.error("فشل التوثيق: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStartTrip = async (id: string) => {
    try {
      await api.updateLoad(id, { status: 'in_progress' });
      toast.success("تم بدء الرحلة بنجاح 🚚");
      fetchTasks();
    } catch (e) { toast.error("فشل البدء"); }
  };

  const handleCancelBid = async (id: string) => {
    if (!confirm("هل أنت متأكد من إلغاء هذا العرض؟")) return;
    try {
      await supabase.from('load_bids').delete().eq('id', id);
      toast.success("تم إلغاء العرض بنجاح");
      fetchTasks();
    } catch (e) { toast.error("فشل إلغاء العرض"); }
  };

  const getBidStatusBadge = (status: string) => {
    switch (status) {
      case 'accepted': return <Badge className="bg-emerald-500 text-white border-none py-1">مقبول - يرجى المتابعة</Badge>;
      case 'rejected': return <Badge className="bg-rose-500 text-white border-none py-1">مرفوض</Badge>;
      default: return <Badge className="bg-amber-500 text-white border-none py-1">بانتظار موافقة الشاحن</Badge>;
    }
  };

  return (
    <AppLayout>
      <div className="space-y-8 max-w-5xl mx-auto pb-20">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-600/10 rounded-2xl text-blue-600"><TruckIcon size={32} /></div>
          <div>
            <h1 className="text-4xl font-black tracking-tight text-slate-800 text-right">شحناتي الحالية</h1>
            <p className="text-muted-foreground font-medium mt-1">تتبع وإدارة الشحنات الجاري تنفيذها حالياً</p>
          </div>
        </div>

        <Tabs defaultValue="tasks" className="w-full" dir="rtl">
          <TabsList className="grid w-full grid-cols-2 h-16 bg-slate-100 rounded-[1.5rem] p-1.5 mb-8">
            <TabsTrigger value="tasks" className="rounded-[1.2rem] font-black gap-2 data-[state=active]:bg-white data-[state=active]:shadow-lg text-lg">
              <ListChecks size={20} /> المهام النشطة
            </TabsTrigger>
            <TabsTrigger value="bids" className="rounded-[1.2rem] font-black gap-2 data-[state=active]:bg-white data-[state=active]:shadow-lg text-lg">
              <ArrowRightLeft size={20} /> العروض المُقدمة
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tasks" className="space-y-6">
            {loading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="animate-spin text-blue-600" size={48} />
              </div>
            ) : tasks.length === 0 ? (
              <div className="text-center py-24 bg-white rounded-[3rem] border-2 border-dashed border-slate-200 text-slate-400 font-bold">
                <Clock size={64} className="mx-auto mb-4 opacity-20" />
                <p>لا توجد مهام نشطة حالياً</p>
                <p className="text-sm font-medium mt-2">اذهب لصفحة "البحث عن عمل" لقبول شحنة جديدة</p>
              </div>
            ) : (
              <div className="grid gap-8">
                <AnimatePresence>
                  {tasks.map((task) => (
                    <motion.div key={task.id} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
                      <Card className="rounded-[2.5rem] border-none shadow-2xl bg-white overflow-hidden relative border-r-8 border-r-blue-600">
                        <CardContent className="p-10">
                          <div className="flex flex-col gap-10">
                            {/* ترويسة الشحنة */}
                            <div className="flex flex-col md:flex-row justify-between items-start gap-6 border-b border-slate-50 pb-8">
                              <div className="space-y-2">
                                <p className="text-[10px] font-black tracking-widest text-blue-600 uppercase">معرف الشحنة: #{task.id.substring(0, 8)}</p>
                                <div className="flex items-center gap-4 font-black text-2xl text-slate-800">
                                  <span>{task.origin}</span>
                                  <div className="flex-1 h-px bg-slate-200 w-16 relative">
                                    <MapPin size={16} className="absolute inset-x-0 mx-auto -top-2 text-blue-600" />
                                  </div>
                                  <span>{task.destination}</span>
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  onClick={() => navigate(`/driver/track?id=${task.id}`)}
                                  className="h-12 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold gap-2 shadow-lg shadow-blue-100"
                                >
                                  <Navigation size={18} /> تتبع الحالة
                                </Button>
                                <Button
                                  variant="outline"
                                  onClick={() => navigate(`/driver/messaging?shipperId=${task.owner_id}`)}
                                  className="h-12 px-6 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 font-bold gap-2"
                                >
                                  <MessageCircle size={18} /> مراسلة الشاحن
                                </Button>
                              </div>
                            </div>
                            {/* بيانات تفصيلية */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                              <div className="space-y-3">
                                <div className="flex items-center gap-2 text-slate-400">
                                  <User size={16} />
                                  <span className="text-xs font-black uppercase">الشاحن (From)</span>
                                </div>
                                <p className="font-bold text-slate-800">{task.owner?.full_name || 'غير متوفر'}</p>
                                <div className="flex gap-2">
                                  <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full bg-slate-100 text-slate-600" onClick={() => window.location.href = `tel:${task.owner?.phone}`}><Phone size={14} /></Button>
                                  <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full bg-emerald-50 text-emerald-600" onClick={() => window.open(`https://wa.me/966${task.owner?.phone?.substring(1)}`, '_blank')}><MessageCircle size={14} /></Button>
                                </div>
                              </div>
                              <div className="space-y-3">
                                <div className="flex items-center gap-2 text-slate-400">
                                  <User size={16} />
                                  <span className="text-xs font-black uppercase">المستلم (To)</span>
                                </div>
                                <p className="font-bold text-slate-800">{task.receiver_name || 'غير متاح'}</p>
                                <p className="text-xs text-slate-400 font-medium">{task.receiver_phone || '---'}</p>
                              </div>
                              <div className="space-y-3">
                                <div className="flex items-center gap-2 text-slate-400">
                                  <Package size={16} />
                                  <span className="text-xs font-black uppercase">الحمولة</span>
                                </div>
                                <p className="font-bold text-slate-800">{task.package_type || 'بضائع عامة'}</p>
                                <p className="text-sm font-black text-blue-600">{task.weight} طن</p>
                              </div>
                              <div className="space-y-3">
                                <div className="flex items-center gap-2 text-slate-400">
                                  <TruckIcon size={16} />
                                  <span className="text-xs font-black uppercase">السائق</span>
                                </div>
                                <p className="font-bold text-slate-800">{userProfile?.full_name}</p>
                                <p className="text-[10px] text-slate-400 font-bold uppercase">الرقم المرجعي: {userProfile?.id.substring(0, 6)}</p>
                              </div>
                            </div>
                            {/* منطقة الإجراءات المالية والطباعة */}
                            <div className="flex flex-col md:flex-row justify-between items-center bg-slate-50 p-6 rounded-3xl gap-6">
                              <div className="flex items-center gap-4">
                                <p className="text-3xl font-black text-slate-900">{task.price} <span className="text-sm">ريال</span></p>
                                <Button
                                  variant="ghost"
                                  onClick={() => navigate(`/driver/waybill?id=${task.id}`)}
                                  className="text-purple-600 font-black gap-2 hover:bg-purple-50 rounded-xl"
                                >
                                  <Printer size={18} /> طباعة البوليصة
                                </Button>
                              </div>
                              <div className="flex gap-4 w-full md:w-auto">
                                {task.status === 'accepted' ? (
                                  <Button
                                    onClick={() => handleStartTrip(task.id)}
                                    className="flex-1 md:w-48 h-12 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-black gap-2 shadow-lg shadow-orange-100"
                                  >
                                    تأكيد الاستلام البدء
                                  </Button>
                                ) : (
                                  <Button
                                    onClick={() => handleCompleteClick(task)}
                                    className="flex-1 md:w-48 h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black gap-2 shadow-lg shadow-emerald-100"
                                  >
                                    <CheckCircle2 size={18} /> تم التسليم
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </TabsContent>

          <TabsContent value="bids" className="space-y-6">
            {loading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="animate-spin text-blue-600" size={48} />
              </div>
            ) : bids.length === 0 ? (
              <div className="text-center py-24 bg-white rounded-[3rem] border-2 border-dashed border-slate-200 text-slate-400 font-bold">
                <ArrowRightLeft size={64} className="mx-auto mb-4 opacity-20" />
                <p>لم تقم بتقديم أي عروض حتى الآن</p>
              </div>
            ) : (
              <div className="grid gap-6">
                <AnimatePresence>
                  {bids.map((bid) => (
                    <motion.div key={bid.id} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
                      <Card className="rounded-[2rem] border-none shadow-md hover:shadow-xl transition-shadow bg-white overflow-hidden relative border-r-4 border-r-amber-500">
                        <CardContent className="p-8">
                          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                            <div className="w-full md:flex-1 space-y-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                  <span className="font-black text-2xl text-slate-800">{bid.load?.origin}</span>
                                  <ArrowRightLeft size={20} className="text-slate-300" />
                                  <span className="font-black text-2xl text-slate-800">{bid.load?.destination}</span>
                                </div>
                                {getBidStatusBadge(bid.status)}
                              </div>
                              <div className="flex items-center gap-4 text-sm font-bold text-slate-500">
                                <span>عائد للمرسل: {bid.load?.owner?.full_name || 'غير معرف'}</span>
                                <span className="w-1.5 h-1.5 bg-slate-300 rounded-full" />
                                <span>وزن الشحنة: {bid.load?.weight} طن</span>
                                <span className="w-1.5 h-1.5 bg-slate-300 rounded-full" />
                                <span>ملاحظاتك: {bid.message || 'لا يوجد'}</span>
                              </div>
                            </div>

                            <div className="w-full md:w-auto flex flex-col items-center md:items-end gap-4 border-t md:border-none pt-4 md:pt-0">
                              <p className="text-3xl font-black text-emerald-600">
                                {bid.price} <span className="text-sm text-emerald-600/60 pr-1">ر.س</span>
                              </p>
                              {bid.status === 'pending' && (
                                <Button
                                  variant="ghost"
                                  onClick={() => handleCancelBid(bid.id)}
                                  className="w-full md:w-auto h-12 bg-rose-50 text-rose-600 font-black hover:bg-rose-100 gap-2 rounded-xl"
                                >
                                  <Trash2 size={18} /> إلغاء العرض
                                </Button>
                              )}
                              {bid.status === 'accepted' && (
                                <p className="text-xs font-black text-emerald-500">تم القبول، انظر قسم المهام النشطة</p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* حوار تأكيد التسليم */}
        <Dialog open={!!confirmDeliveryTask} onOpenChange={(open) => !open && setConfirmDeliveryTask(null)}>
          <DialogContent className="max-w-md rounded-[3rem] p-8 text-center space-y-6 bg-white border-none shadow-2xl">
            <DialogTitle className="sr-only">تأكيد تسليم الشحنة</DialogTitle>
            <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto"><PackageCheck size={40} /></div>
            <div className="space-y-2">
              <h3 className="text-2xl font-black text-slate-800">تأكيد التسليم</h3>
              <p className="text-sm font-bold text-slate-500">يرجى إرفاق صورة إثبات التسليم (بوليصة / بضاعة) لإتمام العملية والانتقال للتوقيع</p>
            </div>
            <div className="flex flex-col gap-3">
              <label className="flex items-center justify-center w-full h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-lg cursor-pointer transition-colors">
                {isProcessing ? <Loader2 className="animate-spin" /> : (
                  <>
                    <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileSelect} />
                    <PackageCheck size={20} className="mr-2" />
                    التقاط / رفع صورة الإثبات
                  </>
                )}
              </label>
              <Button onClick={() => setConfirmDeliveryTask(null)} disabled={isProcessing} variant="ghost" className="font-bold text-slate-400">إلغاء</Button>
            </div>
          </DialogContent>
        </Dialog>

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
      </div>
    </AppLayout>
  );
}
