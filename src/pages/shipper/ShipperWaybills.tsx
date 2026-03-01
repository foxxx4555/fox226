import { useState } from 'react';
import { api } from '@/services/api';
import { useAuth } from '@/hooks/useAuth';
import AppLayout from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Search, FileText, Printer, AlertCircle } from 'lucide-react';
import { WaybillPreview } from '@/components/WaybillPreview';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export default function ShipperWaybills() {
    const { userProfile } = useAuth();
    const [searchId, setSearchId] = useState('');
    const [loading, setLoading] = useState(false);
    const [loadData, setLoadData] = useState<any>(null);

    const handleSearch = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!searchId.trim()) {
            toast.error("يرجى إدخال رقم الشحنة");
            return;
        }

        setLoading(true);
        setLoadData(null);
        try {
            const cleanId = searchId.trim().toLowerCase().replace('#', '');

            // جلب كافة شحنات المستخدم والبحث فيها محلياً لتجنب مشاكل الـ UUID Type Casting في Supabase
            const { data, error } = await supabase
                .from('loads')
                .select(`*, owner:profiles!loads_owner_id_fkey(*), driver:profiles!loads_driver_id_fkey(*)`)
                .eq('owner_id', userProfile?.id);

            if (error) throw error;

            // البحث عن أول شحنة يبدأ معرفها بالنص المدخل
            const found = data?.find(l => l.id.replace(/-/g, '').startsWith(cleanId) || l.id.startsWith(cleanId));

            if (found) {
                setLoadData(found);
                toast.success("تم العثور على البوليصة ✅");
            } else {
                toast.error("لم يتم العثور على شحنة بهذا الرقم");
            }
        } catch (err) {
            console.error(err);
            toast.error("حدث خطأ أثناء البحث");
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <AppLayout>
            <div className="max-w-5xl mx-auto space-y-8">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-2xl text-primary"><FileText size={32} /></div>
                    <div>
                        <h1 className="text-4xl font-black tracking-tight">بوالص الشحن الإلكترونية</h1>
                        <p className="text-muted-foreground font-medium mt-1">ابحث عن أي بوليصة واطبعها فوراً برقم المعرف</p>
                    </div>
                </div>

                <Card className="rounded-[2.5rem] border-none shadow-xl bg-white overflow-hidden">
                    <CardHeader className="p-8 border-b border-slate-50 bg-slate-50/50">
                        <CardTitle className="flex items-center gap-3 text-2xl font-black">
                            <Search className="text-primary" /> ابحث برقم الشحنة (ID)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-8">
                        <form onSubmit={handleSearch} className="flex gap-4">
                            <div className="relative flex-1">
                                <Input
                                    value={searchId}
                                    onChange={(e) => setSearchId(e.target.value)}
                                    placeholder="أدخل رقم الشحنة هنا (مثال: 546d8879...)"
                                    className="h-16 rounded-2xl bg-slate-50 border-transparent focus:bg-white transition-all shadow-inner text-lg font-bold pr-12"
                                />
                                <FileText className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                            </div>
                            <Button
                                type="submit"
                                disabled={loading}
                                className="h-16 px-10 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black text-lg gap-3 shadow-lg shadow-primary/20"
                            >
                                {loading ? <Loader2 className="animate-spin" /> : <Search size={22} />}
                                ابحث الآن
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {loadData && (
                    <div className="space-y-6">
                        <div className="flex justify-end gap-3">
                            <Button onClick={handlePrint} className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold h-12 gap-2 shadow-lg shadow-emerald-500/20">
                                <Printer size={20} /> طباعة البوليصة
                            </Button>
                        </div>

                        <div className="bg-slate-200 p-8 rounded-[3rem] shadow-inner overflow-x-auto min-h-[500px] flex justify-center items-start">
                            <div className="bg-white p-0 shadow-2xl rounded-lg scale-[0.9] origin-top">
                                <WaybillPreview
                                    load={loadData}
                                    shipper={loadData.owner || userProfile}
                                    driver={loadData.driver}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {!loadData && !loading && (
                    <div className="py-20 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-100 flex flex-col items-center">
                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4 text-slate-300">
                            <AlertCircle size={40} />
                        </div>
                        <p className="text-slate-500 font-bold">أدخل رقم الشحنة في الأعلى لعرض البوليصة</p>
                    </div>
                )}
            </div>

            {/* Printing Overlay */}
            <div className="hidden print:block fixed inset-0 bg-white z-[99999] p-0 m-0 overflow-visible">
                {loadData && (
                    <WaybillPreview
                        load={loadData}
                        shipper={loadData.owner || userProfile}
                        driver={loadData.driver}
                    />
                )}
            </div>
        </AppLayout>
    );
}
