import { useState, useEffect } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  Settings, Bell, Globe, Save, Loader2, Mail, Info, Trash2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export default function AdminSettings() {
  // --- حالات التحميل ---
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  // --- إعدادات المحتوى (CMS) ---
  const [aboutUs, setAboutUs] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('pr@sas3pl.com');
  const [address, setAddress] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [contactFormEmail, setContactFormEmail] = useState('yalqlb019@gmail.com');
  const [privacyPolicy, setPrivacyPolicy] = useState('');
  const [termsAndConditions, setTermsAndConditions] = useState('');

  // --- إعدادات EmailJS ---
  const [emailjsServiceId, setEmailjsServiceId] = useState('');
  const [emailjsTemplateId, setEmailjsTemplateId] = useState('');
  const [emailjsPublicKey, setEmailjsPublicKey] = useState('');

  // --- إعدادات الإشعارات ---
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setFetching(true);
    try {
      const { data: settingsData, error: settingsError } = await supabase
        .from('system_settings')
        .select('*');

      if (settingsError) throw settingsError;

      settingsData?.forEach(setting => {
        const config = setting.data as any;
        if (setting.id === 'content_config') {
          setAboutUs(config.aboutUs || '');
          setPhone(config.phone || '');
          setEmail(config.email || '');
          setAddress(config.address || '');
          setWhatsapp(config.whatsapp || '');
          setContactFormEmail(config.contactFormEmail || '');
          setPrivacyPolicy(config.privacyPolicy || '');
          setTermsAndConditions(config.termsAndConditions || '');
          setEmailjsServiceId(config.emailjsServiceId || '');
          setEmailjsTemplateId(config.emailjsTemplateId || '');
          setEmailjsPublicKey(config.emailjsPublicKey || '');
        } else if (setting.id === 'notification_config') {
          setEmailNotifications(config.emailNotifications ?? true);
          setSmsNotifications(config.smsNotifications ?? true);
        }
      });

    } catch (err: any) {
      console.error("خطأ في جلب البيانات:", err.message);
      toast.error('حدث خطأ أثناء تحميل البيانات');
    } finally {
      setFetching(false);
    }
  };

  const handleSaveContent = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert({
          id: 'content_config',
          data: {
            aboutUs, phone, email, address, whatsapp, contactFormEmail,
            privacyPolicy, termsAndConditions,
            emailjsServiceId, emailjsTemplateId, emailjsPublicKey
          }
        });
      if (error) throw error;
      toast.success('تم تحديث محتوى الصفحات بنجاح ✅');
    } catch (err) {
      toast.error('فشل في تحديث المحتوى');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNotifications = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert({
          id: 'notification_config',
          data: { emailNotifications, smsNotifications }
        });
      if (error) throw error;
      toast.success('تم تحديث تفضيلات الإشعارات بنجاح ✅');
    } catch (err) {
      toast.error('فشل في تحديث الإشعارات');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <AdminLayout>
        <div className="h-[70vh] flex flex-col items-center justify-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
          <p className="font-bold text-slate-500 text-lg">جاري تحميل إعدادات النظام...</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-8 max-w-7xl mx-auto pb-20 px-4" dir="rtl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              <div className="p-2 bg-slate-800 rounded-xl text-white">
                <Settings size={28} />
              </div>
              إعدادات النظام العامة
            </h1>
            <p className="text-muted-foreground font-medium mt-2">إدارة محتوى الصفحات وتفضيلات التواصل</p>
          </div>
        </div>

        <Tabs defaultValue="notifications" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8 h-14 bg-white rounded-2xl p-1 shadow-sm border border-slate-100">
            <TabsTrigger value="notifications" className="rounded-xl font-bold data-[state=active]:bg-blue-600 data-[state=active]:text-white transition-all text-slate-500">
              <Bell size={18} className="me-2" /> الإشعارات والتنبيهات
            </TabsTrigger>
            <TabsTrigger value="pages" className="rounded-xl font-bold data-[state=active]:bg-blue-600 data-[state=active]:text-white transition-all text-slate-500">
              <Globe size={18} className="me-2" /> الصفحات والمحتوى
            </TabsTrigger>
            <TabsTrigger value="nuclear" className="rounded-xl font-bold data-[state=active]:bg-rose-600 data-[state=active]:text-white transition-all text-slate-500">
              <Trash2 size={18} className="me-2 text-rose-500 group-data-[state=active]:text-white" /> تصفية النظام ☢️
            </TabsTrigger>
          </TabsList>

          <TabsContent value="notifications">
            <Card className="rounded-[2rem] border-none shadow-xl bg-white p-8">
              <CardHeader className="p-0 mb-6">
                <CardTitle className="text-xl font-black">تفضيلات التنبيهات</CardTitle>
              </CardHeader>
              <div className="space-y-6">
                <div className="flex items-center justify-between p-6 border-2 border-slate-100 rounded-2xl">
                  <div>
                    <h3 className="text-lg font-black">إشعارات البريد الإلكتروني</h3>
                    <p className="text-slate-500 text-sm">إرسال الفواتير وملخصات الطلبات</p>
                  </div>
                  <Button
                    onClick={() => setEmailNotifications(!emailNotifications)}
                    variant={emailNotifications ? "default" : "outline"}
                    className={emailNotifications ? "bg-emerald-500 hover:bg-emerald-600" : ""}
                  >
                    {emailNotifications ? "مفعّل" : "معطل"}
                  </Button>
                </div>
                <div className="flex items-center justify-between p-6 border-2 border-slate-100 rounded-2xl">
                  <div>
                    <h3 className="text-lg font-black">إشعارات SMS</h3>
                    <p className="text-slate-500 text-sm">تنبيهات السائقين والعمليات اللحظية</p>
                  </div>
                  <Button
                    onClick={() => setSmsNotifications(!smsNotifications)}
                    variant={smsNotifications ? "default" : "outline"}
                    className={smsNotifications ? "bg-emerald-500 hover:bg-emerald-600" : ""}
                  >
                    {smsNotifications ? "مفعّل" : "معطل"}
                  </Button>
                </div>
                <Button onClick={handleSaveNotifications} disabled={loading} className="w-full h-12 rounded-xl bg-blue-600 font-bold">
                  {loading ? <Loader2 className="animate-spin me-2" /> : <Save size={18} className="me-2" />}
                  حفظ تفضيلات الإشعارات
                </Button>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="pages">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <Card className="rounded-[2rem] border-none shadow-xl bg-white p-8 space-y-6">
                <CardTitle className="flex items-center gap-2"><Info size={20} /> عن المنصة والسياسة</CardTitle>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="font-bold">من نحن</Label>
                    <Textarea value={aboutUs} onChange={e => setAboutUs(e.target.value)} className="min-h-[120px] rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold">سياسة الخصوصية</Label>
                    <Textarea value={privacyPolicy} onChange={e => setPrivacyPolicy(e.target.value)} className="min-h-[120px] rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold">الشروط والأحكام</Label>
                    <Textarea value={termsAndConditions} onChange={e => setTermsAndConditions(e.target.value)} className="min-h-[120px] rounded-xl" />
                  </div>
                </div>
              </Card>

              <Card className="rounded-[2rem] border-none shadow-xl bg-white p-8 space-y-6">
                <CardTitle className="flex items-center gap-2"><Mail size={20} /> معلومات التواصل والمراسلات</CardTitle>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label className="font-bold">رقم الهاتف</Label><Input value={phone} onChange={e => setPhone(e.target.value)} className="rounded-xl" /></div>
                    <div className="space-y-2"><Label className="font-bold">واتساب</Label><Input value={whatsapp} onChange={e => setWhatsapp(e.target.value)} className="rounded-xl" /></div>
                  </div>
                  <div className="space-y-2"><Label className="font-bold">البريد الرسمي</Label><Input value={email} onChange={e => setEmail(e.target.value)} className="rounded-xl" /></div>
                  <div className="space-y-2"><Label className="font-bold">عنوان المكتب</Label><Input value={address} onChange={e => setAddress(e.target.value)} className="rounded-xl" /></div>

                  <div className="pt-4 border-t border-slate-100">
                    <Label className="font-black text-blue-600 block mb-3">ربط EmailJS (للمراسلات التلقائية)</Label>
                    <div className="space-y-3 bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                      <div className="space-y-1"><Label className="text-xs font-bold text-slate-500">Service ID</Label><Input value={emailjsServiceId} onChange={e => setEmailjsServiceId(e.target.value)} className="h-9 rounded-lg" /></div>
                      <div className="space-y-1"><Label className="text-xs font-bold text-slate-500">Template ID</Label><Input value={emailjsTemplateId} onChange={e => setEmailjsTemplateId(e.target.value)} className="h-9 rounded-lg" /></div>
                      <div className="space-y-1"><Label className="text-xs font-bold text-slate-500">Public Key</Label><Input value={emailjsPublicKey} onChange={e => setEmailjsPublicKey(e.target.value)} className="h-9 rounded-lg" /></div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
            <Button onClick={handleSaveContent} disabled={loading} className="w-full mt-8 h-14 rounded-2xl bg-slate-900 text-white font-black text-lg shadow-xl">
              {loading ? <Loader2 className="animate-spin me-2" /> : <Save size={20} className="me-2" />}
              حفظ كافة تحديثات المحتوى
            </Button>
          </TabsContent>

          <TabsContent value="nuclear">
            <Card className="rounded-[2.5rem] border-2 border-rose-100 shadow-xl bg-white p-10 mt-4 overflow-hidden relative">
               <div className="absolute top-0 right-0 w-32 h-32 bg-rose-50 rounded-full -mr-16 -mt-16 opacity-50"></div>
               <div className="relative z-10">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="p-4 bg-rose-600 text-white rounded-2xl shadow-lg shadow-rose-200">
                      <Trash2 size={32} />
                    </div>
                    <div>
                      <h3 className="text-3xl font-black text-rose-600">منطقة الخطر القصوى (Nuclear Zone)</h3>
                      <p className="text-slate-500 font-bold text-lg mt-1">تستخدم فقط لتنظيف النظام بالكامل وبدء دورة اختبار جديدة</p>
                    </div>
                  </div>

                  <div className="bg-rose-50 border border-rose-100 p-8 rounded-3xl mb-10">
                    <h4 className="text-xl font-black text-rose-800 mb-4 flex items-center gap-2">
                       <Info size={20} /> ماذا سيحدث عند الضغط على الزر؟
                    </h4>
                    <ul className="space-y-3 text-rose-700 font-bold">
                      <li className="flex items-center gap-2">• سيتم حذف كافة الشحنات (Shipments) نهائياً.</li>
                      <li className="flex items-center gap-2">• سيتم تصفير كافة الفواتير (Invoices) والسجلات المالية.</li>
                      <li className="flex items-center gap-2">• سيتم حذف سجل العمليات (Transactions) بالكامل.</li>
                      <li className="flex items-center gap-2">• سيتم تصفير موازنة المحافظ (Wallets) لكل المستخدمين لـ 0.00.</li>
                      <li className="flex items-center gap-2 text-rose-600 font-black underline">• ملحوظة: لن يتم حذف حسابات المستخدمين (Profiles).</li>
                    </ul>
                  </div>

                  <div className="flex flex-col md:flex-row items-center justify-between gap-8 p-8 bg-slate-50 rounded-3xl border border-slate-100">
                    <div className="flex-1">
                       <p className="text-slate-600 font-bold leading-relaxed">
                          هذا الإجراء غير قابل للتراجع. يرجى التأكد من رغبتك في مسح كافة البيانات من قاعدة البيانات للبدء من جديد بأرقام نظيفة.
                       </p>
                    </div>
                    <Button 
                      variant="destructive"
                      size="lg"
                      onClick={async () => {
                        const confirmMsg = "تنبيه نووي ☢️: سيتم تصفية كافة البيانات المالية، الشحنات، الفواتير، وموازنة المحافظ في النظام بالكامل. هل أنت متأكد بنسبة 100%؟";
                        if (!window.confirm(confirmMsg)) return;
                        
                        setLoading(true);
                        try {
                          const { api } = await import('@/services/api');
                          await api.masterReset();
                          toast.success('تم تنظيف النظام بالكامل بنجاح 🧼');
                          window.location.reload();
                        } catch (err: any) {
                          toast.error('حدث خطأ أثناء التصفية: ' + err.message);
                        } finally {
                          setLoading(false);
                        }
                      }}
                      disabled={loading}
                      className="h-20 px-12 rounded-[2rem] bg-rose-600 hover:bg-rose-700 text-2xl font-black shadow-2xl shadow-rose-200 transition-all active:scale-95 flex items-center gap-4"
                    >
                      {loading ? <Loader2 className="animate-spin" /> : <Trash2 size={28} />}
                      تصفية كافة بيانات النظام
                    </Button>
                  </div>
               </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
