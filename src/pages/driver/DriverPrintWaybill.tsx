import { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, Printer, FileText, Truck, MapPin, Search } from 'lucide-react';
import { api } from '@/services/api';
import { Input } from '@/components/ui/input';

export default function DriverPrintWaybill() {
    const { userProfile } = useAuth();
    const [loadId, setLoadId] = useState('');
    const [loadData, setLoadData] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    const fetchWaybill = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!loadId.trim()) return;

        setLoading(true);
        try {
            // In a real app we'd fetch specific load. We'll use getUserLoads to find it.
            const loads = await api.getUserLoads(userProfile?.id || '');
            const found = loads.find((l: any) => l.id.toLowerCase().includes(loadId.toLowerCase()));
            if (found) {
                setLoadData(found);
            } else {
                alert("لم يتم العثور على البوليصة أو لا تملك صلاحية لها.");
                setLoadData(null);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

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
                            <form onSubmit={fetchWaybill} className="flex gap-4 max-w-lg mx-auto">
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
                                <div className="border border-black mb-4 flex justify-between items-center p-4 bg-slate-50">
                                    <div className="text-center w-1/3 border-r border-black pr-4">
                                        <h1 className="text-4xl font-black italic tracking-tighter text-black border-2 border-black px-3 py-1 inline-block">SAS</h1>
                                        <p className="text-xs font-bold text-black mt-2">منصة النقل والخدمات اللوجستية</p>
                                    </div>
                                    <div className="text-center w-1/3">
                                        <h2 className="text-3xl font-black text-black">بوليصة شحن<br />Bill of Lading</h2>
                                    </div>
                                    <div className="w-1/3 text-left border-l border-black pl-4">
                                        <p className="font-bold font-mono">No: {loadData.id.substring(0, 8).toUpperCase()}</p>
                                        <p className="font-bold">Date: {new Date().toLocaleDateString('en-GB')}</p>
                                    </div>
                                </div>

                                {/* بيانات الأطراف الثلاثة */}
                                <div className="grid grid-cols-3 border-t border-r border-l border-black bg-white">
                                    {/* الشاحن */}
                                    <div className="p-3 border-b border-l border-black">
                                        <h3 className="text-sm font-black text-black uppercase mb-2 bg-slate-200 p-1">1. بيانات الشاحن (FROM)</h3>
                                        <p className="font-bold text-sm"><span className="text-slate-500">الاسم | Name:</span> {loadData.owner?.full_name || '---'}</p>
                                        <p className="font-bold text-sm" dir="ltr"><span className="text-slate-500 float-right">:Phone</span> {loadData.owner?.phone || '---'}</p>
                                        <p className="font-bold text-sm"><span className="text-slate-500">العنوان | Address:</span> {loadData.origin}</p>
                                    </div>
                                    {/* المرسل إليه */}
                                    <div className="p-3 border-b border-l border-black">
                                        <h3 className="text-sm font-black text-black uppercase mb-2 bg-slate-200 p-1">2. بيانات المستلم (TO)</h3>
                                        <p className="font-bold text-sm"><span className="text-slate-500">الاسم | Name:</span> {loadData.receiver_name || '---'}</p>
                                        <p className="font-bold text-sm" dir="ltr"><span className="text-slate-500 float-right">:Phone</span> {loadData.receiver_phone || '---'}</p>
                                        <p className="font-bold text-sm"><span className="text-slate-500">العنوان | Address:</span> {loadData.destination}</p>
                                    </div>
                                    {/* الناقل لمعلومات السائق */}
                                    <div className="p-3 border-b border-black">
                                        <h3 className="text-sm font-black text-black uppercase mb-2 bg-slate-200 p-1">3. بيانات الناقل (Carrier)</h3>
                                        <p className="font-bold text-sm"><span className="text-slate-500">الاسم | Name:</span> {userProfile?.full_name}</p>
                                        <p className="font-bold text-sm" dir="ltr"><span className="text-slate-500 float-right">:Phone</span> {userProfile?.phone}</p>
                                        <p className="font-bold text-sm"><span className="text-slate-500">الهوية | ID:</span> _____________</p>
                                    </div>
                                </div>

                                {/* بيانات الشاحنة */}
                                <div className="grid grid-cols-3 border-x border-b border-black bg-white">
                                    <div className="p-2 border-l border-black font-bold text-sm flex gap-2">
                                        <span className="text-slate-500">نوع الشاحنة | Truck Type:</span>
                                        <span>{loadData.truck_category || '---'} {loadData.body_type || '---'}</span>
                                    </div>
                                    <div className="p-2 border-l border-black font-bold text-sm">
                                        <span className="text-slate-500">حجم الشاحنة | Truck Size:</span> {loadData.weight || '---'} Ton
                                    </div>
                                    <div className="p-2 border-black font-bold text-sm">
                                        <span className="text-slate-500">رقم اللوحة | Plate No:</span> _____________
                                    </div>
                                </div>

                                {/* تفاصيل الشحنة */}
                                <div className="border-x border-black mt-4">
                                    <h3 className="text-sm font-black text-black uppercase text-center bg-slate-200 p-2 border-y border-black">تفاصيل الشحنة (Shipment Description)</h3>
                                    <table className="w-full text-right bg-white">
                                        <thead className="bg-slate-50 text-xs text-black border-b border-black font-black">
                                            <tr>
                                                <th className="p-2 border-l border-black">النوع (Type)</th>
                                                <th className="p-2 border-l border-black">وحدة الشحنة (Unit)</th>
                                                <th className="p-2 border-l border-black">الكمية (Qty)</th>
                                                <th className="p-2 border-l border-black">قيمة البضاعة (Value)</th>
                                                <th className="p-2 border-l border-black">أجرة الشحن (Freight)</th>
                                                <th className="p-2">الدفع (Payment)</th>
                                            </tr>
                                        </thead>
                                        <tbody className="text-sm font-bold text-slate-800 border-b border-black">
                                            <tr>
                                                <td className="p-3 border-l border-black">{loadData.package_type || 'بضائع عامة'}</td>
                                                <td className="p-3 border-l border-black">----------</td>
                                                <td className="p-3 border-l border-black">----------</td>
                                                <td className="p-3 border-l border-black">----------</td>
                                                <td className="p-3 border-l border-black">{loadData.price} SAR</td>
                                                <td className="p-3">----------</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>

                                {/* خط السير */}
                                <div className="border-x border-b border-black p-2 bg-white flex text-sm font-bold">
                                    <span className="text-slate-500 w-1/4">مسار الرحلة | Itinerary:</span>
                                    <span className="w-3/4 text-black">{loadData.origin} <Truck size={14} className="inline mx-2" /> {loadData.destination}</span>
                                </div>

                                {/* الشروط */}
                                <div className="p-3 text-center border-x border-b border-black bg-slate-50 text-xs font-bold text-slate-600">
                                    تعتبر البضاعة في عهدة السائق منذ استلامه لها وتنتهي مسؤوليته بتسليمها للمستلم ليتحمل كامل المسؤولية.
                                </div>

                                {/* التوقيعات */}
                                <div className="grid grid-cols-3 border-x border-b border-black bg-white min-h-[120px]">
                                    <div className="p-3 border-l border-black relative">
                                        <h3 className="text-xs font-black text-black mb-6">توقيع الشاحن | Shipper Sign:</h3>
                                        <p className="absolute bottom-4 right-4 text-slate-300">___________________</p>
                                    </div>
                                    <div className="p-3 border-l border-black relative">
                                        <h3 className="text-xs font-black text-black mb-6">توقيع الناقل | Carrier Sign:</h3>
                                        <p className="absolute bottom-4 font-black">{userProfile?.full_name}</p>
                                    </div>
                                    <div className="p-3 border-black relative">
                                        <h3 className="text-xs font-black text-black mb-6">توقيع المستلم | Consignee Sign:</h3>
                                        <p className="absolute bottom-4 right-4 text-slate-300">___________________</p>
                                    </div>
                                </div>

                                <div className="flex justify-between mt-2 text-[10px] font-bold text-slate-400">
                                    <span>تم إنشاء هذه الوثيقة آلياً عبر نظام SAS.</span>
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
