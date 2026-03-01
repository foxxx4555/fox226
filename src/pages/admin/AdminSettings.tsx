import { useState, useEffect } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Settings, Map, Bell, Globe, Save, HelpCircle, ShieldAlert, TrendingUp, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export default function AdminSettings() {
  // --- حالات التسعير الذكي الجديدة ---
  const [minFare, setMinFare] = useState('500'); // الحد الأدنى
  const [distanceThreshold, setDistanceThreshold] = useState('100'); // نقطة التحول
  const [shortRate, setShortRate] = useState('5.0'); // مسافات قصيرة
  const [longRate, setLongRate] = useState('2.5'); // مسافات طويلة
  const [systemCommission, setSystemCommission] = useState('10'); // عمولة
  const [loading, setLoading] = useState(false);

  const [aboutUs, setAboutUs] = useState('منصة نقل سحابية تربط بين الشاحنين والناقلين...');
  const [privacyPolicy, setPrivacyPolicy] = useState('نحن نحترم خصوصية بياناتك...');

  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data, error } = (await supabase.from('system_settings' as any)
          .select('data')
          .eq('id', 'pricing_config')
          .single()) as any;

        if (data?.data) {
          const config = data.data as any;
          if (config.min_fare) setMinFare(config.min_fare.toString());
          if (config.threshold) setDistanceThreshold(config.threshold.toString());
          if (config.short_rate) setShortRate(config.short_rate.toString());
          if (config.long_rate) setLongRate(config.long_rate.toString());
          if (config.commission) setSystemCommission(config.commission.toString());
        }
      } catch (err) {
        console.error("لم يتم العثور على إعدادات تسعير، سيتم استخدام الافتراضي.");
      }
    };

    fetchSettings();
  }, []);

  // دالة لحفظ إعدادات التسعير في سوبابيس
  const handleSavePricing = async () => {
    setLoading(true);
    try {
      const { error } = (await supabase.from('system_settings' as any)
        .upsert({
          id: 'pricing_config',
          data: {
            min_fare: parseFloat(minFare),
            threshold: parseFloat(distanceThreshold),
            short_rate: parseFloat(shortRate),
            long_rate: parseFloat(longRate),
            commission: parseFloat(systemCommission)
          }
        })) as any;

      if (error) throw error;
      toast.success('تم تحديث نظام التسعير الذكي بنجاح ✅');
    } catch (err) {
      toast.error('فشل في حفظ الإعدادات، تأكد من وجود جدول system_settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSavePages = () => {
    toast.success('تم تحديث محتوى الصفحات التعريفية');
  };

  const handleSaveNotifications = () => {
    toast.success('تم تحديث تفضيلات الإشعارات');
  };

  return (
    <AdminLayout>
      <div className="space-y-8 max-w-5xl mx-auto pb-20">

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              <div className="p-2 bg-slate-800 rounded-xl text-white">
                <Settings size={28} />
              </div>
              إعدادات النظام
            </h1>
            <p className="text-muted-foreground font-medium mt-2">التحكم في التسعيرة، الصفحات التعريفية والإشعارات</p>
          </div>
        </div>

        <Tabs defaultValue="pricing" className="w-full" dir="rtl">
          <TabsList className="grid w-full grid-cols-3 mb-8 h-14 bg-white rounded-2xl p-1 shadow-sm border border-slate-100">
            <TabsTrigger value="pricing" className="rounded-xl font-bold data-[state=active]:bg-blue-600 data-[state=active]:text-white transition-all text-slate-500">
              <Map size={18} className="me-2" /> إعدادات التسعير
            </TabsTrigger>
            <TabsTrigger value="notifications" className="rounded-xl font-bold data-[state=active]:bg-blue-600 data-[state=active]:text-white transition-all text-slate-500">
              <Bell size={18} className="me-2" /> الإشعارات والتنبيهات
            </TabsTrigger>
            <TabsTrigger value="pages" className="rounded-xl font-bold data-[state=active]:bg-blue-600 data-[state=active]:text-white transition-all text-slate-500">
              <Globe size={18} className="me-2" /> الصفحات والمحتوى
            </TabsTrigger>
          </TabsList>

          {/* Pricing Tab */}
          <TabsContent value="pricing">
            <Card className="rounded-[2.5rem] border-none shadow-2xl bg-white overflow-hidden">
              <CardHeader className="border-b border-slate-50 pb-8 bg-slate-50/50 p-10">
                <div className="flex items-center gap-4 mb-2">
                  <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg"><Zap size={24} /></div>
                  <CardTitle className="text-2xl font-black text-slate-800">خوارزمية حساب تكلفة الشحن</CardTitle>
                </div>
                <CardDescription className="text-slate-500 font-bold text-lg">تحكم في كيفية حساب الأسعار بناءً على شرائح المسافة لضمان رضا السائق والتاجر.</CardDescription>
              </CardHeader>
              <CardContent className="p-10 space-y-10">

                {/* الصف الأول: الحد الأدنى ونقطة التحول */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-4">
                    <Label className="font-black text-slate-700 text-lg flex items-center gap-2">
                      الحد الأدنى للطلب (أقل سعر)
                      <HelpCircle size={16} className="text-slate-400" />
                    </Label>
                    <div className="relative">
                      <Input
                        type="number"
                        value={minFare}
                        onChange={(e) => setMinFare(e.target.value)}
                        className="h-16 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-2xl px-8 focus:border-blue-500 transition-all"
                      />
                      <span className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 font-black">ر.س</span>
                    </div>
                    <p className="text-sm text-slate-400 font-bold">لا يمكن أن يقل سعر أي شحنة عن هذا الرقم مهما قصرت المسافة.</p>
                  </div>

                  <div className="space-y-4">
                    <Label className="font-black text-slate-700 text-lg">نقطة تحول المسافة (كم)</Label>
                    <div className="relative">
                      <Input
                        type="number"
                        value={distanceThreshold}
                        onChange={(e) => setDistanceThreshold(e.target.value)}
                        className="h-16 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-2xl px-8"
                      />
                      <span className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 font-black">كم</span>
                    </div>
                    <p className="text-sm text-slate-400 font-bold">المسافة التي يبدأ بعدها النظام بتغيير سعر الكيلومتر.</p>
                  </div>
                </div>

                {/* الصف الثاني: أسعار الكيلومترات */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10 bg-blue-50/30 p-8 rounded-[2rem] border border-blue-50">
                  <div className="space-y-4">
                    <Label className="font-black text-blue-800 text-lg">سعر الكيلومتر (المسافات القصيرة)</Label>
                    <div className="relative">
                      <Input
                        type="number"
                        value={shortRate}
                        onChange={(e) => setShortRate(e.target.value)}
                        className="h-16 bg-white border-2 border-blue-100 rounded-2xl font-black text-2xl px-8 text-blue-600"
                      />
                      <span className="absolute left-6 top-1/2 -translate-y-1/2 text-blue-400 font-bold">ر.س / كم</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Label className="font-black text-emerald-800 text-lg">سعر الكيلومتر (المسافات الطويلة)</Label>
                    <div className="relative">
                      <Input
                        type="number"
                        value={longRate}
                        onChange={(e) => setLongRate(e.target.value)}
                        className="h-16 bg-white border-2 border-emerald-100 rounded-2xl font-black text-2xl px-8 text-emerald-600"
                      />
                      <span className="absolute left-6 top-1/2 -translate-y-1/2 text-emerald-400 font-bold">ر.س / كم</span>
                    </div>
                  </div>
                </div>

                {/* عمولة المنصة */}
                <div className="space-y-4 max-w-md">
                  <Label className="font-black text-slate-700 text-lg flex items-center gap-2">
                    <div className="p-1 bg-amber-100 text-amber-600 rounded-lg"><TrendingUp size={18} /></div>
                    نسبة اقتطاع المنصة (العمولة)
                  </Label>
                  <div className="relative">
                    <Input
                      type="number"
                      value={systemCommission}
                      onChange={(e) => setSystemCommission(e.target.value)}
                      className="h-16 bg-amber-50 border-2 border-amber-100 text-amber-900 rounded-2xl font-black text-2xl px-8"
                    />
                    <span className="absolute left-6 top-1/2 -translate-y-1/2 text-amber-600 font-black">%</span>
                  </div>
                </div>

                <Button
                  disabled={loading}
                  onClick={handleSavePricing}
                  className="h-16 px-12 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xl shadow-xl shadow-blue-500/30 w-full md:w-auto"
                >
                  <Save size={24} className="me-3" />
                  {loading ? 'جاري الحفظ...' : 'حفظ وتفعيل نظام التسعير'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications">
            <Card className="rounded-[2rem] border-none shadow-xl bg-white">
              <CardHeader className="border-b border-slate-50 pb-6">
                <CardTitle className="text-xl font-black text-slate-800">قنوات الاتصال والتنبيهات</CardTitle>
                <CardDescription className="text-slate-500 font-bold">تحديد كيفية تواصل النظام الآلي مع السائقين والشاحنين</CardDescription>
              </CardHeader>
              <CardContent className="p-8 space-y-6">
                <div className="flex items-center justify-between p-6 border-2 border-slate-100 rounded-2xl hover:border-blue-200 transition-colors">
                  <div>
                    <h3 className="text-lg font-black text-slate-800">إشعارات البريد الإلكتروني (Email)</h3>
                    <p className="text-slate-500 mt-1 font-bold text-sm">إرسال الفواتير وملخصات الطلبات عبر البريد</p>
                  </div>
                  <Button
                    variant={emailNotifications ? "default" : "outline"}
                    className={`h-10 rounded-xl font-bold w-24 ${emailNotifications ? 'bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/20' : 'text-slate-400 border-slate-200'}`}
                    onClick={() => setEmailNotifications(!emailNotifications)}
                  >
                    {emailNotifications ? 'مُفعل' : 'مُعطل'}
                  </Button>
                </div>

                <div className="flex items-center justify-between p-6 border-2 border-slate-100 rounded-2xl hover:border-blue-200 transition-colors">
                  <div>
                    <h3 className="text-lg font-black text-slate-800">الرسائل النصية (SMS)</h3>
                    <p className="text-slate-500 mt-1 font-bold text-sm">تنبيهات عاجلة وحالات الشحنات المباشرة لبطاقات المستخدمين</p>
                  </div>
                  <Button
                    variant={smsNotifications ? "default" : "outline"}
                    className={`h-10 rounded-xl font-bold w-24 ${smsNotifications ? 'bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/20' : 'text-slate-400 border-slate-200'}`}
                    onClick={() => setSmsNotifications(!smsNotifications)}
                  >
                    {smsNotifications ? 'مُفعل' : 'مُعطل'}
                  </Button>
                </div>

                <div className="pt-6">
                  <Button onClick={handleSaveNotifications} className="h-14 px-8 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black text-lg">
                    <Save size={20} className="me-2" /> حفظ التفضيلات
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* CMS / Pages Tab */}
          <TabsContent value="pages">
            <Card className="rounded-[2rem] border-none shadow-xl bg-white">
              <CardHeader className="border-b border-slate-50 pb-6">
                <CardTitle className="text-xl font-black text-slate-800">إدارة محتوى المنصة</CardTitle>
                <CardDescription className="text-slate-500 font-bold">تحديث الشروط، الأحكام، وصفحات التعريف الثابتة</CardDescription>
              </CardHeader>
              <CardContent className="p-8 space-y-8">

                <div className="space-y-4">
                  <Label className="font-black text-slate-700 text-lg">من نحن (About Us) - نبذة عن المنصة</Label>
                  <Textarea
                    value={aboutUs}
                    onChange={(e) => setAboutUs(e.target.value)}
                    className="min-h-[150px] bg-slate-50 border-slate-200 rounded-2xl p-6 font-medium leading-relaxed resize-y"
                  />
                </div>

                <div className="space-y-4">
                  <Label className="font-black text-slate-700 text-lg">سياسة الخصوصية والشروط والأحكام</Label>
                  <Textarea
                    value={privacyPolicy}
                    onChange={(e) => setPrivacyPolicy(e.target.value)}
                    className="min-h-[200px] bg-slate-50 border-slate-200 rounded-2xl p-6 font-medium leading-relaxed resize-y"
                  />
                  <p className="text-xs text-slate-400 font-bold mt-2">يجب أن يوافق عليها السائق أو التاجر عند التسجيل.</p>
                </div>

                <Button onClick={handleSavePages} className="h-14 px-8 w-full md:w-auto rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-lg shadow-lg shadow-blue-500/20">
                  <Globe size={20} className="me-2" /> نشر المحتوى المحدث
                </Button>

              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>
      </div>
    </AdminLayout>
  );
}
