import { useState, useEffect } from 'react';
import { api } from '@/services/api';
import { useAuth } from '@/hooks/useAuth';
import AppLayout from '@/components/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, MapPin, Package, Clock, Truck, Navigation, Trash2, CheckCircle2, FileText, Printer, XCircle, CreditCard, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { WaybillPreview } from '@/components/WaybillPreview';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import PaymentModal from '@/components/finance/PaymentModal';
import { financeApi } from '@/lib/finances';
import { ShipmentLink } from '@/components/utils/ShipmentLink';

export default function ShipperLoads() {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const [activeLoads, setActiveLoads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLoadForWaybill, setSelectedLoadForWaybill] = useState<any>(null);
  const [showWaybillModal, setShowWaybillModal] = useState(false);

  const [selectedLoadForPayment, setSelectedLoadForPayment] = useState<any>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [finances, setFinances] = useState<Record<string, any>>({});

  const handleResetAccount = async () => {
    if (!confirm("تنبيه: سيتم حذف كافة الشحنات والعمليات بصفة نهائية. هل أنت متأكد؟")) return;
    setLoading(true);
    try {
      await api.deleteAllUserLoads(userProfile.id);
      toast.success("تم تصفية الحساب بنجاح");
      fetchLoads();
    } catch (err) {
      console.error(err);
      toast.error("حدث خطأ أثناء التصفية");
    } finally {
      setLoading(false);
    }
  };

  const fetchLoads = async () => {
    if (userProfile?.id) {
      try {
        const data = await api.getUserLoads(userProfile.id);
        const active = data.filter((l: any) => ['available', 'pending', 'in_progress'].includes(l.status));
        setActiveLoads(active);

        // Fetch wallet balance
        const wallet = await financeApi.getWallet(userProfile.id, 'shipper');
        setWalletBalance(wallet?.balance || 0);

        // Fetch financial status for each load
        const { data: finData } = await supabase
          .from('shipment_finances')
          .select('*')
          .in('shipment_id', active.map(l => l.id));

        const finMap: Record<string, any> = {};
        finData?.forEach(f => {
          finMap[f.shipment_id] = f;
        });
        setFinances(finMap);

      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchLoads();

    // Realtime updates
    const channel = supabase.channel('shipper_active_loads')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'loads', filter: `owner_id=eq.${userProfile?.id}` },
        () => {
          console.log("⚡ تحديث لحظي للشحنات...");
          fetchLoads();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'shipment_finances' },
        () => {
          console.log("⚡ تحديث لحظي للمدفوعات...");
          fetchLoads();
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userProfile]);

  const handleCancelLoad = async (id: string, currentStatus: string) => {
    if (confirm("هل أنت متأكد من رغبتك في إلغاء هذه الشحنة؟")) {
      try {
        await supabase.from('loads').update({ status: 'cancelled' }).eq('id', id);
        toast.success("تم إلغاء الشحنة");
        fetchLoads();
      } catch (e) {
        toast.error("حدث خطأ أثناء الإلغاء");
      }
    }
  };

  const handleUnassignDriver = async (loadId: string) => {
    if (confirm("هل أنت متأكد من إلغاء تعيين السائق؟ ستعود الشحنة لتظهر لجميع السائقين مرة أخرى.")) {
      try {
        const { error } = await supabase
          .from('loads')
          .update({
            driver_id: null,
            status: 'available'
          })
          .eq('id', loadId);

        if (error) throw error;
        toast.success("تم إلغاء تعيين السائق بنجاح ✅");
        fetchLoads();
      } catch (err) {
        toast.error("حدث خطأ أثناء إلغاء التعيين");
      }
    }
  };

  const getStatusBadge = (status: string, shipmentId: string) => {
    const finStatus = finances[shipmentId];

    if (finStatus?.payment_status === 'paid_to_escrow') {
      return <div className="flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-full font-bold text-sm"><ShieldCheck size={16} /> مدفوع (في الضمان)</div>;
    }

    switch (status) {
      case 'available':
      case 'pending':
        return <div className="flex items-center gap-2 bg-amber-100 text-amber-700 px-4 py-2 rounded-full font-bold text-sm"><Clock size={16} /> بانتظار العروض</div>;
      case 'in_progress':
        return <div className="flex items-center gap-2 bg-emerald-100 text-emerald-700 px-4 py-2 rounded-full font-bold text-sm"><Truck size={16} /> قيد التوصيل</div>;
      default:
        return null;
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <AppLayout title="إدارة الشحنات">
      <div className="max-w-5xl mx-auto space-y-8 pb-20 mt-6">
        <div className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-2xl text-primary"><Package size={32} /></div>
            <div>
              <h1 className="text-4xl font-black tracking-tight">شحناتي النشطة</h1>
              <p className="text-muted-foreground font-medium mt-1">تابع شحناتك، سدد المستحقات وتتبع السائقين</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="h-12 border-rose-200 text-rose-600 hover:bg-rose-50 font-bold rounded-xl gap-2 shadow-sm"
              onClick={handleResetAccount}
            >
              <Trash2 size={18} /> تصفية الحساب
            </Button>
            <Button onClick={() => navigate('/shipper/post')} className="bg-primary text-white font-bold h-12 rounded-xl shadow-lg hover:bg-primary/90">إضافة شحنة جديدة</Button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-32"><Loader2 className="animate-spin text-primary" size={48} /></div>
        ) : activeLoads.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-[3rem] border-2 border-dashed border-muted shadow-sm flex flex-col items-center justify-center">
            <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6">
              <Package size={40} className="text-slate-300" />
            </div>
            <p className="text-xl font-black text-slate-700">لا توجد شحنات نشطة حالياً</p>
            <p className="text-slate-500 mt-2 font-medium">ابدأ بإضافة شحنة جديدة لعرضها هنا</p>
            <Button onClick={() => navigate('/shipper/post')} className="mt-6 bg-primary font-bold h-12 px-8 rounded-xl shadow-lg hover:bg-primary/90 text-white">إضافة شحنة الان</Button>
          </div>
        ) : (
          <div className="grid gap-6">
            {activeLoads.map(load => {
              const finStatus = finances[load.id];
              const isPaid = finStatus?.payment_status === 'paid_to_escrow';

              return (
                <Card key={load.id} className="rounded-[2rem] border-none shadow-sm hover:shadow-xl transition-all bg-white overflow-hidden">
                  <CardContent className="p-0">
                    <div className="p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-slate-50">
                      <div className="flex flex-col gap-3">
                        <div className="flex flex-wrap items-center gap-3 mb-2">
                          {getStatusBadge(load.status, load.id)}
                          <ShipmentLink id={load.id} />
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-black text-xl md:text-2xl text-slate-800 flex items-center gap-2"><MapPin className="text-primary" size={20} /> {load.origin}</span>
                          <div className="h-px bg-slate-300 w-6 md:w-12"></div>
                          <span className="font-black text-xl md:text-2xl text-slate-800 flex items-center gap-2"><MapPin className="text-emerald-500" size={20} /> {load.destination}</span>
                        </div>
                      </div>
                      <div className="text-right bg-slate-50 p-4 rounded-2xl w-full md:w-auto min-w-[150px]">
                        <p className="text-xs font-bold text-slate-400 mb-1">المبلغ الإجمالي</p>
                        <p className="font-black text-3xl text-slate-800">{load.price} <span className="text-sm font-bold opacity-50">ر.س</span></p>
                      </div>
                    </div>

                    <div className="p-6 md:px-8 bg-white flex flex-col md:flex-row items-center justify-between gap-4">
                      <div className="flex flex-wrap gap-4 text-xs font-bold text-slate-500">
                        <span className="bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">الوزن: {load.weight} طن</span>
                        <span className="bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">النوع: {load.package_type || 'بضائع عامة'}</span>
                      </div>
                      <div className="flex w-full md:w-auto gap-3">
                        {!isPaid && (load.status === 'in_progress' || load.status === 'pending') && (
                          <Button
                            onClick={() => {
                              setSelectedLoadForPayment(load);
                              setShowPaymentModal(true);
                            }}
                            className="flex-1 md:flex-none h-12 rounded-xl font-black bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20"
                          >
                            <CreditCard size={18} className="me-2" /> سدد المستحقات
                          </Button>
                        )}

                        <Button
                          onClick={() => {
                            setSelectedLoadForWaybill(load);
                            setShowWaybillModal(true);
                          }}
                          variant="secondary"
                          className="flex-1 md:flex-none h-12 rounded-xl font-bold bg-slate-100 text-slate-700 hover:bg-slate-200"
                        >
                          <FileText size={18} className="me-2" /> بوليصة الشحن
                        </Button>

                        {load.driver_id && load.status === 'in_progress' && (
                          <Button onClick={() => navigate('/shipper/track')} className="flex-1 md:flex-none h-12 rounded-xl font-bold bg-emerald-500 hover:bg-emerald-600 text-white">
                            <Navigation size={18} className="me-2" /> تتبع
                          </Button>
                        )}

                        {(load.status === 'available' || load.status === 'pending') && (
                          <Button onClick={() => handleCancelLoad(load.id, load.status)} variant="outline" className="flex-1 md:flex-none h-12 rounded-xl font-bold border-rose-100 text-rose-500 hover:bg-rose-50 p-2">
                            <Trash2 size={18} />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={showWaybillModal} onOpenChange={setShowWaybillModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 border-none shadow-2xl rounded-[2rem]">
          <DialogHeader className="p-6 bg-slate-50 border-b">
            <DialogTitle className="flex items-center justify-between font-black text-2xl">
              <span>معاينة بوليصة الشحن</span>
              <Button onClick={handlePrint} className="bg-primary hover:bg-primary/90 text-white gap-2 rounded-xl">
                <Printer size={18} /> طباعة / تحميل PDF
              </Button>
            </DialogTitle>
          </DialogHeader>
          <div className="p-4 md:p-8 bg-slate-100">
            <WaybillPreview
              load={selectedLoadForWaybill}
              shipper={userProfile}
              driver={selectedLoadForWaybill?.driver}
            />
          </div>
        </DialogContent>
      </Dialog>

      {selectedLoadForPayment && (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          shipment={{
            id: selectedLoadForPayment.id,
            price: Number(selectedLoadForPayment.price),
            origin: selectedLoadForPayment.origin,
            destination: selectedLoadForPayment.destination
          }}
          walletBalance={walletBalance}
          onSuccess={fetchLoads}
        />
      )}

      {/* Hidden Print Wrapper */}
      <div className="hidden print:block fixed inset-0 bg-white z-[99999] overflow-visible p-0 m-0">
        {selectedLoadForWaybill && (
          <WaybillPreview
            load={selectedLoadForWaybill}
            shipper={userProfile}
            driver={selectedLoadForWaybill?.driver}
          />
        )}
      </div>
    </AppLayout>
  );
}
