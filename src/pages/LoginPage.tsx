import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/store/appStore';
import { api } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, ArrowRight, Mail, Lock, ShieldCheck, Eye, EyeOff, UserCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { setUserProfile, setCurrentRole, setAuth } = useAppStore();
  
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("user");
  
  // States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showAdminPassword, setShowAdminPassword] = useState(false);

  const handleUserLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { profile, role } = await api.loginByEmail(email, password);

      if (profile && role) {
        setAuth(profile, role);
      } else {
        if (profile) setUserProfile(profile);
        if (role) setCurrentRole(role);
      }

      toast.success(t('success'));

      // مصفوفة الأدوار الإدارية (تنظيف الأكواد المكررة)
      const adminRoles = [
        'super_admin', 'admin', 'finance', 'operations', 
        'carrier_manager', 'vendor_manager', 'support', 'analytics'
      ];
      
      const userRole = role.toLowerCase();

      if (userRole === 'driver') {
        navigate('/driver/dashboard');
      } else if (userRole === 'shipper') {
        navigate('/shipper/dashboard');
      } else if (adminRoles.includes(userRole)) {
        navigate('/admin/dashboard');
      } else {
        navigate('/');
      }
    } catch (err: any) {
      toast.error(err.message || t('error'));
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.loginAdmin(adminEmail, adminPassword);
      setCurrentRole('admin' as any);
      toast.success(t('success'));
      navigate('/admin/dashboard');
    } catch (err: any) {
      toast.error(err.message || t('error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] relative overflow-hidden p-4 md:p-6 py-12" dir="rtl">
      {/* عناصر زخرفية خلفية */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-blue-500/5 rounded-full blur-[80px] translate-y-1/4 -translate-x-1/4" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg relative z-10"
      >
        {/* زر العودة */}
        <Button
          variant="ghost"
          className="mb-6 hover:bg-white/80 rounded-2xl gap-2 font-bold text-slate-500"
          onClick={() => navigate('/')}
        >
          <ArrowRight size={18} className="rotate-0" /> {t('back')}
        </Button>

        {/* رأس الصفحة */}
        <div className="text-center mb-8">
          <motion.div 
            initial={{ scale: 0.8 }} 
            animate={{ scale: 1 }}
            className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto shadow-2xl shadow-primary/10 mb-6 border border-slate-50 relative"
          >
            <div className="absolute inset-0 bg-primary/5 rounded-3xl animate-pulse" />
            <ShieldCheck size={40} className="text-primary relative z-10" />
          </motion.div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">{t('login')}</h1>
          <p className="text-slate-500 font-medium">{t('welcome_subtitle')}</p>
        </div>

        <Card className="shadow-[0_20px_50px_rgba(0,0,0,0.05)] border-white/60 bg-white/80 backdrop-blur-xl rounded-[2.5rem] overflow-hidden border-2">
          <CardContent className="p-8 md:p-10">
            <Tabs defaultValue="user" onValueChange={setActiveTab} dir="rtl" className="w-full">
              <TabsList className="w-full grid grid-cols-2 h-14 bg-slate-100/50 p-1.5 rounded-2xl mb-8">
                <TabsTrigger value="user" className="rounded-xl font-bold text-md data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  {t('login_as_user')}
                </TabsTrigger>
                <TabsTrigger value="admin" className="rounded-xl font-bold text-md data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  {t('login_as_admin')}
                </TabsTrigger>
              </TabsList>

              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, x: activeTab === 'user' ? 10 : -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: activeTab === 'user' ? -10 : 10 }}
                  transition={{ duration: 0.2 }}
                >
                  <TabsContent value="user" className="mt-0">
                    <form onSubmit={handleUserLogin} className="space-y-5">
                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-slate-500 ms-1 uppercase">{t('email')}</Label>
                        <div className="relative group">
                          <Mail className="absolute start-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={18} />
                          <Input
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            required
                            dir="ltr"
                            className="ps-11 h-14 rounded-2xl border-slate-100 bg-slate-50/50 focus:bg-white focus:border-primary transition-all font-bold"
                            placeholder="name@company.com"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-slate-500 ms-1 uppercase">{t('password')}</Label>
                        <div className="relative group">
                          <Lock className="absolute start-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={18} />
                          <Input
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            required
                            dir="ltr"
                            className="ps-11 pe-12 h-14 rounded-2xl border-slate-100 bg-slate-50/50 focus:bg-white focus:border-primary transition-all font-bold"
                            placeholder="••••••••"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute end-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary transition-colors"
                          >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                      </div>

                      <Button 
                        type="submit" 
                        disabled={loading}
                        className="w-full h-14 rounded-2xl text-lg font-black bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 transition-all active:scale-[0.98]" 
                      >
                        {loading ? <Loader2 className="animate-spin" /> : t('login')}
                      </Button>

                      <div className="flex flex-col gap-4 text-center mt-6">
                        <Link to="/forgot-password" size="sm" className="text-sm text-primary font-bold hover:underline underline-offset-4 decoration-2">
                          {t('forgot_password')}
                        </Link>
                        <div className="relative py-2">
                          <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-100"></span></div>
                          <div className="relative flex justify-center text-xs uppercase"><span className="bg-white/50 px-2 text-slate-400 font-bold tracking-wider">أو</span></div>
                        </div>
                        <p className="text-sm font-bold text-slate-500">
                          {t('no_account')} <Link to="/register" className="text-primary font-black hover:underline underline-offset-4 decoration-2">{t('register')}</Link>
                        </p>
                      </div>
                    </form>
                  </TabsContent>

                  <TabsContent value="admin" className="mt-0">
                    <form onSubmit={handleAdminLogin} className="space-y-5">
                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-slate-500 ms-1 uppercase">{t('email')}</Label>
                        <div className="relative group">
                          <UserCircle2 className="absolute start-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition-colors" size={18} />
                          <Input
                            type="email"
                            value={adminEmail}
                            onChange={e => setAdminEmail(e.target.value)}
                            required
                            dir="ltr"
                            className="ps-11 h-14 rounded-2xl border-slate-100 bg-slate-50/50 focus:bg-white focus:border-slate-900 transition-all font-bold"
                            placeholder="admin@sas-transport.com"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-slate-500 ms-1 uppercase">{t('password')}</Label>
                        <div className="relative group">
                          <Lock className="absolute start-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition-colors" size={18} />
                          <Input
                            type={showAdminPassword ? "text" : "password"}
                            value={adminPassword}
                            onChange={e => setAdminPassword(e.target.value)}
                            required
                            dir="ltr"
                            className="ps-11 pe-12 h-14 rounded-2xl border-slate-100 bg-slate-50/50 focus:bg-white focus:border-slate-900 transition-all font-bold"
                            placeholder="••••••••"
                          />
                          <button
                            type="button"
                            onClick={() => setShowAdminPassword(!showAdminPassword)}
                            className="absolute end-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900 transition-colors"
                          >
                            {showAdminPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                      </div>

                      <Button 
                        type="submit" 
                        disabled={loading}
                        className="w-full h-14 rounded-2xl text-lg font-black bg-slate-900 hover:bg-slate-800 text-white shadow-xl shadow-slate-900/10 transition-all active:scale-[0.98]" 
                      >
                        {loading ? <Loader2 className="animate-spin" /> : "دخول المسؤولين"}
                      </Button>
                      
                      <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 mt-4 text-center">
                        <p className="text-xs text-amber-700 font-bold flex items-center justify-center gap-2">
                          <ShieldCheck size={14} /> بوابة الوصول الآمن للموظفين والمديرين فقط
                        </p>
                      </div>
                    </form>
                  </TabsContent>
                </motion.div>
              </AnimatePresence>
            </Tabs>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
