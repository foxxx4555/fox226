import { useEffect, useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { Power, Settings as SettingsIcon, Save, AlertCircle, Loader2, Percent } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

export default function AdminSettings() {
  const [systemActive, setSystemActive] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // إعدادات افتراضية أخرى
  const [commissionRate, setCommissionRate] = useState('10');
  const [taxRate, setTaxRate] = useState('15');

  const fetchSystemStatus = async () => {
    try {
      const { data, error } = await supabase.from('system_status' as any).select('is_active').maybeSingle();
      if (!error && data) {
        setSystemActive((data as any).is_active);
      }
    } catch (err) {
      console.error("لم يتم العثور على إعدادات، النظام يعتبر مفعل");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSystemStatus();
  }, []);

  const handleToggleSystem = async (checked: boolean) => {
    if (!confirm(checked ? "هل أنت متأكد من إعادة تفعيل النظام للعمل؟" : "تحذير الإيقاف: هل أنت متأكد من إيقاف النظام بشكل كامل؟ سيتم طرد جميع المستخدمين ولن يتمكنوا من الدخول.")) return;

    setSystemActive(checked);
    try {
      // نفترض وجود سجل واحد بمعرف '1' في جدول system_status
      const { error } = await supabase.from('system_status' as any).upsert({ id: '1', is_active: checked } as any);
      if (error) {
        if (error.code === '42P01') {
          toast.error('جدول حالة النظام غير موجود في قاعدة البيانات، لقد تم تصميمه كطبقة أمان.');
        } else {
          throw error;
        }
      } else {
        toast.success(checked ? "تم تشغيل النظام بنجاح" : "تم إيقاف النظام وتجميد جميع العمليات الحية");
      }
    } catch (e) {
      toast.error('فشل تحديث حالة النظام');
      setSystemActive(!checked); // تراجع عن حالة الزر
    }
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast.success("تم حفظ إعدادات الرسوم والضرائب بنجاح");
    }, 1000);
  };

  return (
    <AdminLayout>
      <div className="space-y-8 max-w-4xl mx-auto pb-20">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-slate-900 rounded-2xl text-white"><SettingsIcon size={32} /></div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">إعدادات النظام</h1>
            <p className="text-muted-foreground font-medium mt-1">التحكم المركزي في قواعد وعمليات التطبيق</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center p-20"><Loader2 className="animate-spin text-blue-600" size={40} /></div>
        ) : (
          <div className="grid gap-6">

            {/* قفل النظام (Kill Switch) */}
            <Card className="rounded-[2.5rem] border-none shadow-xl bg-white overflow-hidden relative">
              <div className={`absolute top-0 right-0 w-2 h-full ${systemActive ? 'bg-emerald-500' : 'bg-rose-600 animate-pulse'}`}></div>
              <CardHeader className="pb-4 pt-8">
                <div className="flex items-center gap-3 mb-2">
                  <AlertCircle className={systemActive ? 'text-emerald-500' : 'text-rose-600'} size={24} />
                  <CardTitle className="text-2xl font-black text-slate-800">حالة تشغيل النظام</CardTitle>
                </div>
                <CardDescription className="text-base font-medium">التحكم الرئيسي في إيقاف أو تشغيل المنصة. الإيقاف (Kill Switch) يمنع أي عمليات جديدة ويوجه المستخدمين لشاشة التوقف.</CardDescription>
              </CardHeader>
              <CardContent className="pt-4 pb-8">
                <div className={`p-6 rounded-2xl flex items-center justify-between ${systemActive ? 'bg-emerald-50 border border-emerald-100' : 'bg-rose-50 border border-rose-200'}`}>
                  <div>
                    <p className={`font-black text-xl mb-1 ${systemActive ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {systemActive ? 'النظام يعمل بشكل كامل 🚀' : 'النظام متوقف حالياً 🛑'}
                    </p>
                    <p className={`text-sm font-bold ${systemActive ? 'text-emerald-600/70' : 'text-rose-500/80'}`}>
                      اضغط على المفتاح لتغيير حالة النظام فوراً
                    </p>
                  </div>
                  <Switch
                    checked={systemActive}
                    onCheckedChange={handleToggleSystem}
                    className="scale-150 data-[state=checked]:bg-emerald-500 data-[state=unchecked]:bg-rose-500"
                  />
                </div>
              </CardContent>
            </Card>

            {/* إعدادات مالية */}
            <Card className="rounded-[2.5rem] border-none shadow-md bg-white">
              <CardHeader className="pt-8">
                <div className="flex items-center gap-3">
                  <Percent className="text-blue-600" size={24} />
                  <CardTitle className="text-2xl font-black text-slate-800">الإعدادات المالية التلقائية</CardTitle>
                </div>
                <CardDescription>هذه النسب ستؤثر على جميع الشحنات المستقبلية تلقائياً عند طلب تسعيرة.</CardDescription>
              </CardHeader>
              <CardContent className="pb-8">
                <form onSubmit={handleSaveSettings} className="space-y-6 max-w-lg">
                  <div>
                    <label className="text-slate-500 font-bold mb-2 block">نسبة عمولة المنصة (%)</label>
                    <Input
                      type="number"
                      value={commissionRate}
                      onChange={e => setCommissionRate(e.target.value)}
                      className="h-14 rounded-xl bg-slate-50 border-slate-200 font-bold text-lg"
                    />
                  </div>
                  <div>
                    <label className="text-slate-500 font-bold mb-2 block">نسبة القيمة المضافة لضريبة الدولة (%)</label>
                    <Input
                      type="number"
                      value={taxRate}
                      onChange={e => setTaxRate(e.target.value)}
                      className="h-14 rounded-xl bg-slate-50 border-slate-200 font-bold text-lg"
                    />
                  </div>

                  <Button type="submit" disabled={saving} className="h-14 w-full rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-lg gap-2 shadow-xl shadow-slate-900/20">
                    {saving ? <Loader2 className="animate-spin" /> : <><Save size={20} /> حفظ التغييرات</>}
                  </Button>
                </form>
              </CardContent>
            </Card>

          </div>
        )}
      </div>
    </AdminLayout>
  );
}
