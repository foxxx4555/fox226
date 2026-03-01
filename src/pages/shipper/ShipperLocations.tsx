import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/services/api';
import {
    MapPin,
    Plus,
    Trash2,
    Loader2,
    Search,
    Navigation,
    Home,
    Building2,
    Warehouse,
    Edit2
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

export default function ShipperLocations() {
    const { userProfile } = useAuth();
    const [locations, setLocations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Form state
    const [newName, setNewName] = useState('');
    const [newAddress, setNewAddress] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    // Edit state
    const [editingLocation, setEditingLocation] = useState<any>(null);
    const [editName, setEditName] = useState('');
    const [editAddress, setEditAddress] = useState('');

    const fetchLocations = async () => {
        if (!userProfile?.id) return;
        try {
            const data = await api.getSavedLocations(userProfile.id);
            setLocations(data || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLocations();
    }, [userProfile?.id]);

    const handleAddLocation = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName.trim() || !newAddress.trim()) {
            return toast.error("يرجى إكمال جميع الحقول");
        }

        setSaving(true);
        try {
            await api.saveLocation(userProfile?.id || '', {
                name: newName,
                address: newAddress
            });
            toast.success("تم حفظ الموقع بنجاح");
            setNewName('');
            setNewAddress('');
            fetchLocations();
        } catch (error) {
            toast.error("حدث خطأ أثناء الحفظ");
        } finally {
            setSaving(false);
        }
    };

    const handleUpdateLocation = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingLocation) return;
        if (!editName.trim() || !editAddress.trim()) {
            return toast.error("يرجى إكمال جميع الحقول");
        }

        setSaving(true);
        try {
            await api.updateSavedLocation(editingLocation.id, {
                name: editName,
                address: editAddress
            });
            toast.success("تم تحديث الموقع بنجاح");
            setEditingLocation(null);
            fetchLocations();
        } catch (error) {
            toast.error("حدث خطأ أثناء التحديث");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("هل أنت متأكد من حذف هذا الموقع؟")) return;

        try {
            await api.deleteSavedLocation(id);
            toast.success("تم الحذف بنجاح");
            fetchLocations();
        } catch (error) {
            toast.error("حدث خطأ أثناء الحذف");
        }
    };

    const filteredLocations = locations.filter(loc =>
        loc.location_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        loc.address_details.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <AppLayout>
            <div className="max-w-5xl mx-auto space-y-8 pb-20">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-rose-500/10 rounded-2xl text-rose-500"><MapPin size={32} /></div>
                        <div>
                            <h1 className="text-4xl font-black tracking-tight text-slate-800">أماكن التحميل المفضلة</h1>
                            <p className="text-muted-foreground font-medium mt-1">احفظ عناوينك المتكررة لسهولة استخدامها في طلبات الشحن</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Form to Add New Location */}
                    <Card className="lg:col-span-1 rounded-[2.5rem] border-none shadow-xl bg-white overflow-hidden h-fit">
                        <CardHeader className="p-8 pb-0">
                            <CardTitle className="text-xl font-black text-slate-800 flex items-center gap-2">
                                <Plus className="text-rose-500" /> إضافة موقع جديد
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-8 space-y-4">
                            <form onSubmit={handleAddLocation} className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-500 mr-2">اسم المكان (مثال: مستودع جدة)</label>
                                    <Input
                                        value={newName}
                                        onChange={(e) => setNewName(e.target.value)}
                                        className="h-12 bg-slate-50 border-none rounded-xl font-bold"
                                        placeholder="ادخل اسم الموقع المميز"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-500 mr-2">العنوان التفصيلي</label>
                                    <Input
                                        value={newAddress}
                                        onChange={(e) => setNewAddress(e.target.value)}
                                        className="h-12 bg-slate-50 border-none rounded-xl font-bold"
                                        placeholder="المدينة، الحي، الشارع..."
                                    />
                                </div>
                                <Button
                                    className="w-full h-12 bg-rose-500 hover:bg-rose-600 text-white font-black rounded-xl shadow-lg shadow-rose-500/20"
                                    disabled={saving}
                                >
                                    {saving ? <Loader2 className="animate-spin" /> : "حفظ الموقع"}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    {/* List of Saved Locations */}
                    <div className="lg:col-span-2 space-y-4">
                        <div className="relative mb-6">
                            <Input
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="h-14 pl-12 pr-4 bg-white border-slate-100 rounded-[1.5rem] font-bold shadow-sm"
                                placeholder="بحث في عناوينك المحفوظة..."
                            />
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        </div>

                        {loading ? (
                            <div className="flex justify-center py-20"><Loader2 className="animate-spin text-rose-500" size={48} /></div>
                        ) : filteredLocations.length === 0 ? (
                            <div className="py-20 text-center bg-white/50 rounded-[3rem] border-2 border-dashed border-slate-200">
                                <MapPin size={48} className="mx-auto text-slate-300 mb-4 opacity-50" />
                                <p className="font-bold text-slate-500">لا يوجد مواقع محفوظة حالياً</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <AnimatePresence>
                                    {filteredLocations.map((loc) => (
                                        <motion.div
                                            key={loc.id}
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                        >
                                            <Card className="rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all group">
                                                <CardContent className="p-6">
                                                    <div className="flex justify-between items-start mb-4">
                                                        <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center">
                                                            {loc.location_name.includes('مستودع') ? <Warehouse size={24} /> : loc.location_name.includes('شركة') ? <Building2 size={24} /> : <Home size={24} />}
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => {
                                                                    setEditingLocation(loc);
                                                                    setEditName(loc.location_name);
                                                                    setEditAddress(loc.address_details);
                                                                }}
                                                                className="text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-xl"
                                                            >
                                                                <Edit2 size={18} />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => handleDelete(loc.id)}
                                                                className="text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl"
                                                            >
                                                                <Trash2 size={18} />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                    <h3 className="font-black text-lg text-slate-800 mb-1">{loc.location_name}</h3>
                                                    <p className="text-sm font-bold text-slate-500 mb-4 line-clamp-2 min-h-[2.5rem]">{loc.address_details}</p>

                                                    <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-50">
                                                        <Button
                                                            variant="outline"
                                                            className="flex-1 rounded-xl h-10 border-slate-100 font-bold text-xs gap-2"
                                                            onClick={() => window.open(`https://www.google.com/maps?q=${loc.address_details}`, '_blank')}
                                                        >
                                                            <Navigation size={14} /> المعاينة
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
                </div>
            </div>
            {/* Edit Location Modal */}
            <Dialog open={!!editingLocation} onOpenChange={() => setEditingLocation(null)}>
                <DialogContent className="max-w-md rounded-[2.5rem] p-8 bg-white border-none shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black text-slate-800">تعديل الموقع</DialogTitle>
                        <DialogDescription className="text-slate-500 font-bold">تعديل بيانات الموقع المحفوظ</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleUpdateLocation} className="space-y-6 mt-6">
                        <div className="space-y-2 text-right">
                            <label className="text-sm font-bold text-slate-500 mr-2">اسم المكان</label>
                            <Input
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="h-12 bg-slate-50 border-none rounded-xl font-bold"
                            />
                        </div>
                        <div className="space-y-2 text-right">
                            <label className="text-sm font-bold text-slate-500 mr-2">العنوان التفصيلي</label>
                            <Input
                                value={editAddress}
                                onChange={(e) => setEditAddress(e.target.value)}
                                className="h-12 bg-slate-50 border-none rounded-xl font-bold"
                            />
                        </div>
                        <div className="flex gap-3 pt-4">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => setEditingLocation(null)}
                                className="flex-1 h-12 rounded-xl font-bold"
                            >
                                إلغاء
                            </Button>
                            <Button
                                type="submit"
                                className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl shadow-lg shadow-blue-500/20"
                                disabled={saving}
                            >
                                {saving ? <Loader2 className="animate-spin" /> : "حفظ التعديلات"}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
