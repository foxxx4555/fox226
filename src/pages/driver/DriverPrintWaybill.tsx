import { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, Printer, FileText, Truck, MapPin, Search } from 'lucide-react';
import { api } from '@/services/api';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

import { useLocation } from 'react-router-dom';

export default function DriverPrintWaybill() {
    const { userProfile } = useAuth();
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const targetId = queryParams.get('id');

    const [loadId, setLoadId] = useState('');
    const [loadData, setLoadData] = useState<any>(null);
    const [truckData, setTruckData] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    const fetchWaybill = async (idToSearch?: string, e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const searchId = idToSearch || loadId;
        if (!searchId) return;

        setLoading(true);
        try {
            const loads = await api.getUserLoads(userProfile?.id || '');
            const found = loads.find((l: any) =>
                l.id.toLowerCase() === searchId.toLowerCase() ||
                l.id.toLowerCase().startsWith(searchId.toLowerCase()) ||
                l.id.toLowerCase().includes(searchId.toLowerCase())
            );

            if (found) {
                setLoadData(found);
                if (found.driver_id) {
                    const { data: trucks } = await supabase.from('trucks').select('*').eq('owner_id', found.driver_id);
                    if (trucks && trucks.length > 0) {
                        setTruckData(trucks[0]);
                    }
                }
            } else {
                toast.error("لم يتم العثور على البوليصة أو لا تملك صلاحية لها.");
                setLoadData(null);
            }
        } catch (error) {
            console.error(error);
            toast.error("حدث خطأ أثناء البحث عن البوليصة.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (targetId && userProfile?.id) {
            setLoadId(targetId);
            fetchWaybill(targetId);
        }
    }, [targetId, userProfile?.id]);

    const handlePrint = () => {
        window.print();
    };

    return (
        <AppLayout>
            <div className="max-w-4xl mx-auto space-y-8 pb-20">
                <div className="flex items-center justify-between gap-4 print:hidden">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-purple-600/10 rounded-2xl text-purple-600"><FileText size={32} /></div>
                        <div>
                            <h1 className="text-4xl font-black tracking-tight text-slate-800">طباعة البوليصة</h1>
                            <p className="text-muted-foreground font-medium mt-1">ابحث برقم الشحنة لطباعة بوليصة الشحن الرسمية</p>
                        </div>
                    </div>
                    {loadData && (
                        <Button onClick={handlePrint} className="h-12 bg-slate-900 hover:bg-slate-800 rounded-xl font-bold gap-2 print:hidden pb-1">
                            <Printer size={18} /> طباعة
                        </Button>
                    )}
                </div>

                <Card className="rounded-[2.5rem] border-none shadow-xl bg-white overflow-hidden print:shadow-none print:rounded-none">
                    <CardContent className="p-0">
                        <div className="p-8 border-b border-slate-100 print:hidden bg-slate-50">
                            <form onSubmit={(e) => fetchWaybill(undefined, e)} className="flex gap-4 max-w-lg mx-auto">
                                <div className="relative flex-1">
                                    <Input
                                        value={loadId}
                                        onChange={(e) => setLoadId(e.target.value)}
                                        className="h-14 pl-12 pr-4 bg-white border-none rounded-xl font-bold shadow-sm"
                                        placeholder="أدخل رقم الشحنة (مثال: abc1234)..."
                                    />
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                                </div>
                                <Button type="submit" className="h-14 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-black px-8">
                                    {loading ? <Loader2 className="animate-spin" /> : "بحث"}
                                </Button>
                            </form>
                        </div>

                        {loadData ? (
                            <div className="p-8 md:p-12" id="print-area">
                                {/* ترويسة البوليصة */}
                                <div className="relative flex justify-center items-center mb-6 mt-4">
                                    <div className="absolute right-0 flex items-center">
                                        <div className="font-black text-4xl tracking-tighter drop-shadow-sm">
                                            <span className="text-[#002B5B] border-b-[3px] border-[#002B5B] pb-1">SAS</span>
                                            <span className="text-yellow-500 italic ml-2">Transport</span>
                                        </div>
                                    </div>
                                    <div className="bg-[#002B5B] text-yellow-500 font-bold px-8 py-2 text-xl md:text-2xl uppercase shadow-md inline-block relative z-10 border-2 border-[#002B5B]">
                                        بوليصة شحن Bill of LADING
                                    </div>
                                </div>
                                <div className="flex justify-between items-center mb-2 font-bold text-xs" dir="ltr">
                                    <div className="flex gap-4">
                                        <span>NUMBER: <span className="border-b border-black inline-block w-24 text-center text-black font-normal">{loadData.id?.substring(0, 8).toUpperCase() || ''}</span></span>
                                        <span>BILL DATE: <span className="border-b border-black inline-block w-24 text-center text-black font-normal">{new Date(loadData.created_at || Date.now()).toLocaleDateString('en-GB')}</span></span>
                                    </div>
                                    <div className="flex gap-4 text-[10px]" dir="rtl">
                                        <label className="flex items-center gap-1"><input type="checkbox" className="w-3 h-3 accent-[#002B5B]" /> الوثيقة غير قابلة للتداول</label>
                                        <label className="flex items-center gap-1"><input type="checkbox" className="w-3 h-3 accent-[#002B5B]" /> الوثيقة قابلة للتداول</label>
                                    </div>
                                </div>

                                {/* بيانات الأطراف الثلاثة */}
                                <div className="border border-[#002B5B] bg-white text-[10px] sm:text-xs font-bold w-full mx-auto" style={{ borderColor: '#002B5B' }}>
                                    {/* FROM / TO Headers */}
                                    <div className="flex bg-[#002B5B] text-white text-center border-b border-[#002B5B]">
                                        <div className="flex-1 p-2 border-l border-white">FROM بيانات الشاحن</div>
                                        <div className="flex-1 p-2">TO بيانات المرسل له</div>
                                    </div>

                                    {/* FROM / TO Details */}
                                    <div className="flex border-b border-[#002B5B] min-h-[70px]">
                                        {/* FROM */}
                                        <div className="flex-1 flex border-l border-[#002B5B]">
                                            <div className="w-24 p-1 flex flex-col justify-between border-l border-[#002B5B]" dir="ltr">
                                                <div className="border-b border-black">Name</div>
                                                <div className="flex-1 flex items-center border-b border-black py-1">Phone Number</div>
                                                <div className="pt-1">Address</div>
                                            </div>
                                            <div className="flex-1 p-1 text-black flex flex-col justify-between text-center font-normal">
                                                <div className="border-b border-black pb-1">{loadData.owner?.full_name || '---'}</div>
                                                <div className="border-b border-black py-1 flex-1 flex items-center justify-center" dir="ltr">{loadData.owner?.phone || '---'}</div>
                                                <div className="pt-1">{loadData.origin || '---'}</div>
                                            </div>
                                            <div className="w-20 p-1 text-center flex flex-col justify-between border-r border-[#002B5B]" dir="rtl">
                                                <div className="border-b border-black">الاسم</div>
                                                <div className="border-b border-black py-1 flex-1 flex items-center justify-center">رقم الهاتف</div>
                                                <div className="pt-1">العنوان</div>
                                            </div>
                                        </div>
                                        {/* TO */}
                                        <div className="flex-1 flex">
                                            <div className="w-24 p-1 flex flex-col justify-between border-l border-[#002B5B]" dir="ltr">
                                                <div className="border-b border-black">Name</div>
                                                <div className="flex-1 flex items-center border-b border-black py-1">Phone Number</div>
                                                <div className="pt-1">Address</div>
                                            </div>
                                            <div className="flex-1 p-1 text-black flex flex-col justify-between text-center font-normal">
                                                <div className="border-b border-black pb-1">{loadData.receiver_name || '---'}</div>
                                                <div className="border-b border-black py-1 flex-1 flex items-center justify-center" dir="ltr">{loadData.receiver_phone || '---'}</div>
                                                <div className="pt-1">{loadData.destination || '---'}</div>
                                            </div>
                                            <div className="w-20 p-1 text-center flex flex-col justify-between border-r border-[#002B5B]" dir="rtl">
                                                <div className="border-b border-black">الاسم</div>
                                                <div className="border-b border-black py-1 flex-1 flex items-center justify-center">رقم الهاتف</div>
                                                <div className="pt-1">العنوان</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Carrier Data / Truck Data Headers */}
                                    <div className="flex bg-[#002B5B] text-white text-center border-b border-[#002B5B]">
                                        <div className="flex-1 p-1 border-l border-white text-[11px]">بيانات الناقل Carrier Data</div>
                                        <div className="flex-1 p-1 text-[11px]">بيانات الشاحنة Truck Data</div>
                                    </div>

                                    {/* Carrier / Truck Details */}
                                    <div className="flex border-b border-[#002B5B] min-h-[70px]">
                                        {/* Carrier */}
                                        <div className="flex-1 flex border-l border-[#002B5B]">
                                            <div className="w-24 p-1 flex flex-col justify-between border-l border-[#002B5B]" dir="ltr">
                                                <div className="border-b border-black">Name</div>
                                                <div className="flex-1 flex items-center border-b border-black py-1">Phone Number</div>
                                                <div className="pt-1">Card number</div>
                                            </div>
                                            <div className="flex-1 p-1 text-black flex flex-col justify-between text-center font-normal">
                                                <div className="border-b border-black pb-1">{userProfile?.full_name || '---'}</div>
                                                <div className="border-b border-black py-1 flex-1 flex items-center justify-center" dir="ltr">{userProfile?.phone || '---'}</div>
                                                <div className="pt-1">{(userProfile as any)?.commercial_register || '----------------'}</div>
                                            </div>
                                            <div className="w-20 p-1 text-center flex flex-col justify-between border-r border-[#002B5B]" dir="rtl">
                                                <div className="border-b border-black">الاسم</div>
                                                <div className="border-b border-black py-1 flex-1 flex items-center justify-center">رقم الهاتف</div>
                                                <div className="pt-1">رقم البطاقة</div>
                                            </div>
                                        </div>
                                        {/* Truck */}
                                        <div className="flex-1 flex">
                                            <div className="w-24 p-1 flex flex-col justify-between border-l border-[#002B5B]" dir="ltr">
                                                <div className="border-b border-black">Truck Type</div>
                                                <div className="flex-1 flex items-center border-b border-black py-1">Plate Number</div>
                                                <div className="pt-1">Truck Size</div>
                                            </div>
                                            <div className="flex-1 p-1 text-black flex flex-col justify-between text-center font-normal">
                                                <div className="border-b border-black pb-1">{[loadData.truck_category, loadData.body_type].filter(Boolean).join(' - ') || '---'}</div>
                                                <div className="border-b border-black py-1 flex-1 flex items-center justify-center">{truckData?.plate_number || '---'}</div>
                                                <div className="pt-1">{loadData.weight ? `${loadData.weight} Ton` : '---'}</div>
                                            </div>
                                            <div className="w-20 p-1 text-center flex flex-col justify-between border-r border-[#002B5B]" dir="rtl">
                                                <div className="border-b border-black">نوع الشاحنة</div>
                                                <div className="border-b border-black py-1 flex-1 flex items-center justify-center">رقم اللوحة</div>
                                                <div className="pt-1">حجم الشاحنة</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Shipment Description Headers */}
                                    <div className="flex bg-[#002B5B] text-white text-center border-b border-[#002B5B] text-[10px]">
                                        <div className="w-24 p-1 border-l border-white">الكمية Quantity</div>
                                        <div className="flex-1 p-1 border-l border-white">وصف الشحنة Shipment description</div>
                                        <div className="w-20 p-1 border-l border-white">الوحدة Unit</div>
                                        <div className="w-24 p-1">النوع Type</div>
                                    </div>

                                    {/* Shipment Rows */}
                                    {[...Array(5)].map((_, i) => (
                                        <div key={i} className="flex border-b border-[#002B5B] min-h-[30px] font-normal">
                                            <div className="w-24 border-l border-[#002B5B] p-1 flex items-center justify-center">
                                                {i === 0 ? loadData.qty || 'حاوية كاملة' : ''}
                                            </div>
                                            <div className="flex-1 border-l border-[#002B5B] p-1 flex items-center justify-center">
                                                {i === 0 ? loadData.description || '---' : ''}
                                            </div>
                                            <div className="w-20 border-l border-[#002B5B] p-1 flex items-center justify-center">
                                                {i === 0 ? loadData.unit || '---' : ''}
                                            </div>
                                            <div className="w-24 p-1 flex items-center justify-center">
                                                {i === 0 ? loadData.package_type || '---' : ''}
                                            </div>
                                        </div>
                                    ))}

                                    {/* Additional Info Block */}
                                    <div className="flex flex-col text-[12px] font-bold border-b border-[#002B5B]">
                                        <div className="flex min-h-[40px] border-b border-[#002B5B]">
                                            <div className="w-[15%] border-l border-[#002B5B] p-1 flex items-center justify-start pl-2 bg-[#f8f9fa]" dir="ltr">Freight charge</div>
                                            <div className="w-[15%] border-l border-[#002B5B] p-1 flex items-center justify-center bg-[#f8f9fa]">أجرة الشحن</div>
                                            <div className="w-[20%] border-l border-[#002B5B] p-1 flex items-center justify-center text-black font-bold text-[14px]">{loadData.price ? `SAR ${loadData.price}` : '---'}</div>
                                            <div className="w-[15%] border-l border-[#002B5B] p-1 flex items-center justify-center bg-[#f8f9fa]" dir="ltr">Shipment Type</div>
                                            <div className="w-[20%] border-l border-[#002B5B] p-1 flex items-center justify-center text-black font-bold text-[14px]">{loadData.package_type || loadData.truck_category || '---'}</div>
                                            <div className="w-[15%] p-1 flex items-center justify-center bg-[#f8f9fa]">نوع الشحنة</div>
                                        </div>
                                        <div className="flex min-h-[40px] border-b border-[#002B5B]">
                                            <div className="w-[15%] border-l border-[#002B5B] p-1 flex items-center justify-start pl-2 bg-[#f8f9fa]" dir="ltr">Value of goods</div>
                                            <div className="w-[15%] border-l border-[#002B5B] p-1 flex items-center justify-center bg-[#f8f9fa]">قيمة البضاعة</div>
                                            <div className="w-[20%] border-l border-[#002B5B] p-1 flex items-center justify-center text-black font-bold text-[14px]">{loadData.goods_value ? `${loadData.goods_value} SAR` : '---'}</div>
                                            <div className="w-[15%] border-l border-[#002B5B] p-1 flex items-center justify-center bg-[#f8f9fa]" dir="ltr">Flight Itinerary</div>
                                            <div className="w-[20%] border-l border-[#002B5B] p-1 flex items-center justify-center text-black font-bold text-[12px] text-center leading-tight">{loadData.origin && loadData.destination ? `${loadData.origin.split(',')[0]} - ${loadData.destination.split(',')[0]}` : '---'}</div>
                                            <div className="w-[15%] p-1 flex items-center justify-center bg-[#f8f9fa]">خط سير الرحلة</div>
                                        </div>
                                        <div className="flex min-h-[40px]">
                                            <div className="w-[15%] border-l border-[#002B5B] p-1 flex items-center justify-start pl-2 bg-[#f8f9fa]" dir="ltr">Shipping insurance</div>
                                            <div className="w-[15%] border-l border-[#002B5B] p-1 flex items-center justify-center bg-[#f8f9fa]">التأمين على الشحنة</div>
                                            <div className="w-[20%] border-l border-[#002B5B] p-1 flex items-center justify-center text-black font-bold text-[14px]">{loadData.insurance_value || '0'}</div>
                                            <div className="w-[15%] border-l border-[#002B5B] p-1 flex items-center justify-center bg-[#f8f9fa]" dir="ltr">Fare Payment Method</div>
                                            <div className="w-[20%] border-l border-[#002B5B] p-1 flex items-center justify-center text-black font-bold text-[14px]">{loadData.payment_method || 'نقدًا / Cash'}</div>
                                            <div className="w-[15%] p-1 flex items-center justify-center bg-[#f8f9fa]">طريقة دفع الأجرة</div>
                                        </div>
                                    </div>

                                    {/* Terms */}
                                    <div className="p-2 text-center text-[10px] leading-relaxed border-b border-[#002B5B]">
                                        <p className="font-bold mb-1">
                                            تعتبر البضائع في عهدة السائق منذ استلامه لها وتنتهي مسؤوليته بتسليمها للمستلم، ويتحمل كامل المسؤولية.
                                        </p>
                                        <p className="font-sans font-normal" dir="ltr">
                                            The goods are considered in the driver's possession from the time he receives them, and his responsibility ends when they are delivered to the recipient. He bears full responsibility.
                                        </p>
                                    </div>

                                    {/* Signatures Headers */}
                                    <div className="flex bg-[#002B5B] text-white font-bold text-center border-b border-[#002B5B]">
                                        <div className="flex-1 p-2 border-l border-white uppercase flex items-center justify-between px-4"><span dir="ltr">Consignee</span><span>المرسل اليه</span></div>
                                        <div className="flex-1 p-2 border-l border-white uppercase flex items-center justify-between px-4"><span dir="ltr">Driver</span><span>السائق</span></div>
                                        <div className="flex-1 p-2 uppercase flex items-center justify-between px-4"><span dir="ltr">Shipper</span><span>الشاحن</span></div>
                                    </div>

                                    {/* Signatures Boxes */}
                                    <div className="flex min-h-[140px] text-[9px] font-normal">
                                        {/* Consignee */}
                                        <div className="flex-1 border-l border-[#002B5B] p-3 flex flex-col justify-between relative bg-white">
                                            <div className="flex flex-col gap-2 relative z-10 text-[9px]">
                                                <span dir="ltr" className="w-full text-left leading-snug">I acknowledge that I have received the goods in good condition, and there are no defects or shortages.</span>
                                                <span dir="rtl" className="w-full text-right font-bold mt-2 leading-relaxed">أقر بموجب أنني قد استلمت البضاعة بحالة جيدة ولا يوجد بها أي عيوب أو نقص.</span>
                                            </div>
                                            <div className="flex flex-col gap-4 font-bold mt-8 w-full" dir="ltr">
                                                <div className="flex justify-between items-end w-full">
                                                    <span className="shrink-0 w-16 text-center text-[10px]">Date التاريخ</span>
                                                    <div className="flex-1 border-b-[1.5px] border-dotted border-black mb-1 mx-2"></div>
                                                </div>
                                                <div className="flex justify-between items-end w-full">
                                                    <span className="shrink-0 w-16 text-center text-[10px]">Signature التوقيع</span>
                                                    <div className="flex-1 border-b-[1.5px] border-dotted border-black mb-1 mx-2"></div>
                                                </div>
                                            </div>
                                        </div>
                                        {/* Driver */}
                                        <div className="flex-1 border-l border-[#002B5B] p-3 flex flex-col justify-between relative bg-[#E6F4EA]">
                                            <div className="flex flex-col gap-2 relative z-10 text-[9px]">
                                                <span dir="ltr" className="w-full text-left leading-snug">I acknowledge receipt of the goods and take full responsibility until delivery to the recipient.</span>
                                                <span dir="rtl" className="w-full text-right font-bold mt-2 leading-relaxed">أقر باستلام البضائع وأتحمل المسؤولية الكاملة عنها حتى تسليمها للمستلم.</span>
                                            </div>
                                            <div className="flex flex-col gap-4 font-bold mt-8 w-full" dir="ltr">
                                                <div className="flex justify-between items-end w-full">
                                                    <span className="shrink-0 w-16 text-center text-[10px]">Date التاريخ</span>
                                                    <div className="flex-1 border-b-[1.5px] border-dotted border-black mb-1 mx-2"></div>
                                                </div>
                                                <div className="flex justify-between items-end w-full">
                                                    <span className="shrink-0 w-16 text-center text-[10px]">Signature التوقيع</span>
                                                    <div className="flex-1 border-b-[1.5px] border-dotted border-black mb-1 mx-2"></div>
                                                </div>
                                            </div>
                                        </div>
                                        {/* Shipper */}
                                        <div className="flex-1 p-3 flex flex-col justify-between relative bg-white">
                                            <div className="flex flex-col gap-2 relative z-10 text-[9px]">
                                                <span dir="ltr" className="w-full text-left leading-snug">I confirm that the shipped products are free from defects or prohibited items and are fit for transport in accordance with applicable regulations.</span>
                                                <span dir="rtl" className="w-full text-right font-bold mt-2 leading-relaxed">أقر بأن المنتجات المشحونة خالية من العيوب أو المواد الممنوعة، وصالحة للنقل وفق الأنظمة المعمول بها.</span>
                                            </div>
                                            <div className="flex flex-col gap-4 font-bold mt-8 w-full" dir="ltr">
                                                <div className="flex justify-between items-end w-full">
                                                    <span className="shrink-0 w-16 text-center text-[10px]">Date التاريخ</span>
                                                    <div className="flex-1 border-b-[1.5px] border-dotted border-black mb-1 mx-2"></div>
                                                </div>
                                                <div className="flex justify-between items-end w-full">
                                                    <span className="shrink-0 w-16 text-center text-[10px]">signature التوقيع</span>
                                                    <div className="flex-1 border-b-[1.5px] border-dotted border-black mb-1 mx-2"></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-between mt-2 text-[10px] font-bold text-slate-400">
                                    <span>https://shahen-website.vercel.app</span>
                                    <span dir="ltr">sas-transport.com</span>
                                </div>
                            </div>
                        ) : (
                            <div className="p-20 text-center print:hidden">
                                <FileText size={64} className="mx-auto text-slate-200 mb-4" />
                                <p className="font-bold text-slate-500">قم بإدخال رقم الشحنة للبحث عن البوليصة</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
        @media print {
          body * {
            visibility: hidden;
          }
          #print-area, #print-area * {
            visibility: visible;
          }
          #print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}} />
        </AppLayout>
    );
}
