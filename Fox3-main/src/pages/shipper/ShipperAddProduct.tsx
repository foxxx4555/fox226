import { useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Package, Plus, Save, Box, Trash2, Edit2, Layers, Tag } from 'lucide-react';

export default function ShipperAddProduct() {
    const [products, setProducts] = useState([
        { id: 1, name: 'أسمنت بورتلاندي', description: 'أسمنت عالي الجودة للبناء', type: 'مواد بناء', unit: 'كيس (50 كجم)' },
        { id: 2, name: 'مياه معبأة', description: 'مياه شرب نقية كرتون 40 حبة', type: 'مواد غذائية', unit: 'كرتون' }
    ]);

    const [form, setForm] = useState({ name: '', description: '', type: '', unit: '' });

    const handleSave = () => {
        if (!form.name || !form.type || !form.unit) {
            toast.error('الرجاء إكمال الحقول الأساسية (الاسم، النوع، الوحدة)');
            return;
        }

        setProducts([{ ...form, id: Date.now() }, ...products]);
        setForm({ name: '', description: '', type: '', unit: '' });
        toast.success('تم إضافة المنتج بنجاح');
    };

    const handleDelete = (id: number) => {
        setProducts(products.filter(p => p.id !== id));
        toast.success('تم حذف المنتج');
    };

    return (
        <AppLayout>
            <div className="max-w-6xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-black mb-2 flex items-center gap-3">
                            <Package className="text-primary" size={32} /> إدارة المنتجات
                        </h1>
                        <p className="text-muted-foreground font-medium">سجل منتجاتك المعتادة هنا لتسريع عملية إنشاء الشحنات</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Card className="lg:col-span-1 border-none shadow-xl rounded-[2rem] bg-white h-fit">
                        <CardHeader className="p-6 border-b border-slate-100">
                            <CardTitle className="flex items-center gap-2 text-xl font-black">
                                <Plus className="text-emerald-500 bg-emerald-500/10 rounded-full p-1" size={28} /> منتج جديد
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-5">
                            <div className="space-y-2">
                                <Label className="font-bold flex items-center gap-2 text-slate-700">
                                    <Box size={16} /> اسم المنتج <span className="text-rose-500">*</span>
                                </Label>
                                <Input
                                    value={form.name}
                                    onChange={e => setForm({ ...form, name: e.target.value })}
                                    placeholder="مثال: حديد تسليح، كراتين مياه..."
                                    className="h-12 rounded-xl bg-slate-50 border-transparent focus:bg-white transition-all shadow-inner"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="font-bold flex items-center gap-2 text-slate-700">
                                    <Layers size={16} /> النوع / التصنيف <span className="text-rose-500">*</span>
                                </Label>
                                <select
                                    className="flex h-12 w-full items-center justify-between rounded-xl bg-slate-50 border-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    value={form.type}
                                    onChange={e => setForm({ ...form, type: e.target.value })}
                                >
                                    <option value="" disabled>اختر تصنيف المنتج</option>
                                    <option value="مواد غذائية">مواد غذائية</option>
                                    <option value="مواد بناء">مواد بناء</option>
                                    <option value="أثاث ومفروشات">أثاث ومفروشات</option>
                                    <option value="إلكترونيات">إلكترونيات</option>
                                    <option value="مواد كيميائية خطرة">مواد كيميائية خطرة</option>
                                    <option value="أخرى">أخرى</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <Label className="font-bold flex items-center gap-2 text-slate-700">
                                    <Tag size={16} /> الوحدة المتداولة <span className="text-rose-500">*</span>
                                </Label>
                                <select
                                    className="flex h-12 w-full items-center justify-between rounded-xl bg-slate-50 border-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                    value={form.unit}
                                    onChange={e => setForm({ ...form, unit: e.target.value })}
                                >
                                    <option value="" disabled>كيف تقيس هذا المنتج؟</option>
                                    <option value="طبلية (بليت)">طبلية (بليت)</option>
                                    <option value="كرتون">كرتون</option>
                                    <option value="طن">طن</option>
                                    <option value="كيس">كيس</option>
                                    <option value="حاوية كاملة">حاوية كاملة</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <Label className="font-bold flex items-center gap-2 text-slate-700">
                                    الوصف (اختياري)
                                </Label>
                                <textarea
                                    value={form.description}
                                    onChange={e => setForm({ ...form, description: e.target.value })}
                                    placeholder="أية ملاحظات إضافية حول المنتج وكيفية التعامل معه..."
                                    className="flex w-full rounded-xl bg-slate-50 border-transparent px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:bg-white min-h-[100px] shadow-inner resize-none"
                                />
                            </div>

                            <Button onClick={handleSave} className="w-full h-14 rounded-xl font-black text-lg bg-emerald-500 hover:bg-emerald-600 text-white shadow-xl shadow-emerald-500/20 mt-4">
                                <Save className="me-2" size={20} /> إضافة منتج
                            </Button>
                        </CardContent>
                    </Card>

                    <Card className="lg:col-span-2 border-none shadow-xl rounded-[2rem] bg-white">
                        <CardHeader className="p-6 border-b border-slate-100">
                            <CardTitle className="flex items-center gap-2 text-xl font-black">
                                <Layers className="text-blue-500 bg-blue-500/10 rounded-full p-1" size={28} /> المنتجات المسجلة مسبقاً
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-right">
                                    <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-100">
                                        <tr>
                                            <th className="px-6 py-4 font-black">المنتج</th>
                                            <th className="px-6 py-4 font-black">التصنيف</th>
                                            <th className="px-6 py-4 font-black">الوحدة</th>
                                            <th className="px-6 py-4 font-black text-center">إجراءات</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 font-medium">
                                        {products.map(product => (
                                            <tr key={product.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="font-black text-slate-800 text-base">{product.name}</span>
                                                        {product.description && <span className="text-xs text-slate-500 mt-1 line-clamp-1">{product.description}</span>}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-800">
                                                        {product.type}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-slate-600 font-bold">{product.unit}</td>
                                                <td className="px-6 py-4">
                                                    <div className="flex justify-center gap-2">
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:bg-blue-50 rounded-lg">
                                                            <Edit2 size={16} />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" onClick={() => handleDelete(product.id)} className="h-8 w-8 text-rose-600 hover:bg-rose-50 rounded-lg">
                                                            <Trash2 size={16} />
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {products.length === 0 && (
                                            <tr>
                                                <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                                                    <Box size={40} className="mx-auto text-slate-300 mb-3 opacity-50" />
                                                    لا توجد منتجات مسجلة.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}
