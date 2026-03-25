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
import { Loader2, ArrowRight, Mail, Lock, ShieldCheck, Eye, EyeOff, UserCircle2, Link2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function LoginPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { setUserProfile, setCurrentRole, setAuth } = useAppStore();

  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("user");

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showAdminPassword, setShowAdminPassword] = useState(false);

  const handleUserLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const input = email.trim();
      
      // البحث عن الإيميل الحقيقي المرتبط بما كتبه المستخدم (سواء اسم أو هاتف أو إيميل)
      const loginEmail = await api.resolveIdentifierToEmail(input);
      
      if (!loginEmail) {
        throw new Error(i18n.language === 'ar' ? 'بيانات الدخول غير صحيحة' : 'Invalid login credentials');
      }

      console.log("Found login email:", loginEmail);

      // تسجيل الدخول بالإيميل الذي وجدناه
      const { profile, role } = await api.loginByEmail(loginEmail, password);

      if (profile && role) {
        setAuth(profile, role);
      } else {
        if (profile) setUserProfile(profile);
        if (role) setCurrentRole(role);
      }

      // logic for invite code removed as per user request

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
      console.error("❌ Login Error Details:", err);
      toast.error(err.message || t('error'));
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const input = adminEmail.trim();
      const loginEmail = await api.resolveIdentifierToEmail(input);
      
      if (!loginEmail) {
        throw new Error(i18n.language === 'ar' ? 'بيانات المشرف غير صحيحة' : 'Admin credentials not found');
      }

      console.log("Attempting admin login for:", loginEmail);
      await api.loginAdmin(loginEmail, adminPassword);
      setCurrentRole('admin' as any);
      toast.success(t('success'));
      navigate('/admin/dashboard');
    } catch (err: any) {
      console.error("❌ Admin Login Error:", err);
      toast.error(err.message || t('error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] relative overflow-hidden p-4 md:p-6 py-12" dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
      {/* عناصر زخرفية خلفية */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-blue-500/5 rounded-full blur-[80px] translate-y-1/4 -translate-x-1/4" />

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm relative z-10"
      >
        {/* زر العودة - مضغوط */}
        <div className="flex justify-between items-center mb-4">
          <Button
            variant="ghost"
            size="sm"
            className="hover:bg-white/80 rounded-xl gap-1 font-bold text-slate-500 text-[10px]"
            onClick={() => navigate('/')}
          >
            <ArrowRight size={14} className={i18n.language === 'ar' ? "rotate-0" : "rotate-180"} /> {t('back')}
          </Button>
        </div>


        <Card className="shadow-2xl shadow-slate-200/50 border-white/60 bg-white/90 backdrop-blur-xl rounded-[2rem] overflow-hidden border-2">
          <CardContent className="p-0">
            <div className="flex flex-col md:flex-row items-center">
              {/* Logo Section - Side Position */}
              <div className="w-full md:w-1/3 bg-slate-50/50 p-6 flex flex-col items-center justify-center border-b md:border-b-0 md:border-l border-slate-100">
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="w-24 h-24 bg-white rounded-2xl flex items-center justify-center shadow-lg border border-slate-50 relative overflow-hidden mb-4"
                >
                  <img src="/logo.png" className="w-16 h-16 object-contain relative z-10 p-1" alt="Logo" />
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
                </motion.div>
                <h1 className="text-lg font-black text-slate-900 tracking-tight text-center">{t('login_title')}</h1>
                <p className="text-[9px] font-bold text-slate-400 text-center">{t('login_subtitle')}</p>
              </div>

              {/* Form Section */}
              <div className="w-full md:w-2/3 p-6 md:p-8">
                <Tabs defaultValue="user" onValueChange={setActiveTab} dir={i18n.language === 'ar' ? 'rtl' : 'ltr'} className="w-full">
                  <TabsList className="w-full grid grid-cols-2 h-10 bg-slate-100/50 p-1 rounded-xl mb-4">
                <TabsTrigger value="user" className="rounded-lg font-bold text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  {t('user_login')}
                </TabsTrigger>
                <TabsTrigger value="admin" className="rounded-lg font-bold text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  {t('admin_login_tab')}
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
                    <form onSubmit={handleUserLogin} className="space-y-4">
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-black text-slate-400 ms-1 uppercase">{t('username_or_email')}</Label>
                        <div className="relative group">
                          <UserCircle2 className={cn("absolute top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors", i18n.language === 'ar' ? "right-4" : "left-4")} size={16} />
                          <Input
                            type="text"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            required
                            dir="ltr"
                            className={cn("h-12 rounded-xl border-slate-100 bg-slate-50/50 focus:bg-white focus:border-primary transition-all font-bold text-sm", i18n.language === 'ar' ? "pr-11" : "pl-11")}
                            placeholder={t('username_placeholder')}
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-black text-slate-400 ms-1 uppercase">{t('password')}</Label>
                        <div className="relative group">
                          <Lock className={cn("absolute top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors", i18n.language === 'ar' ? "right-4" : "left-4")} size={16} />
                          <Input
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            required
                            dir="ltr"
                            className={cn("h-12 rounded-xl border-slate-100 bg-slate-50/50 focus:bg-white focus:border-primary transition-all font-bold text-sm", i18n.language === 'ar' ? "pr-11 pl-12" : "pl-11 pr-12")}
                            placeholder="••••••••"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className={cn("absolute top-1/2 -translate-y-1/2 text-slate-300 hover:text-primary transition-colors", i18n.language === 'ar' ? "left-4" : "right-4")}
                          >
                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </div>

                      {/* Invite Code removed to avoid scroll */}

                      <Button
                        type="submit"
                        disabled={loading}
                        className="w-full h-12 rounded-xl text-md font-black bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 transition-all active:scale-[0.98]"
                      >
                        {loading ? <Loader2 className="animate-spin" /> : t('login')}
                      </Button>

                      <div className="flex flex-col gap-3 text-center mt-5">
                        <Link to="/forgot-password" title={t('forgot_password')} className="text-[11px] text-primary font-bold hover:underline underline-offset-4 decoration-2">
                          {t('forgot_password')}
                        </Link>
                        
                        <div className="relative py-1 mt-2">
                          <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-100"></span></div>
                          <div className="relative flex justify-center text-[9px] uppercase"><span className="bg-white/50 px-2 text-slate-300 font-black tracking-wider">{t('or')}</span></div>
                        </div>
                        <p className="text-[11px] font-bold text-slate-400">
                          {t('no_account')} <Link to="/register" className="text-primary font-black hover:underline underline-offset-4 decoration-2">{t('register')}</Link>
                        </p>
                      </div>
                    </form>
                  </TabsContent>

                  <TabsContent value="admin" className="mt-0">
                    <form onSubmit={handleAdminLogin} className="space-y-4">
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-black text-slate-400 ms-1 uppercase">{t('username_or_email')}</Label>
                        <div className="relative group">
                          <UserCircle2 className={cn("absolute top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-slate-900 transition-colors", i18n.language === 'ar' ? "right-4" : "left-4")} size={16} />
                          <Input
                            type="text"
                            value={adminEmail}
                            onChange={e => setAdminEmail(e.target.value)}
                            required
                            dir="ltr"
                            className={cn("h-12 rounded-xl border-slate-100 bg-slate-50/50 focus:bg-white focus:border-slate-900 transition-all font-bold text-sm", i18n.language === 'ar' ? "pr-11" : "pl-11")}
                            placeholder={t('username_placeholder')}
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-black text-slate-400 ms-1 uppercase">{t('password')}</Label>
                        <div className="relative group">
                          <Lock className={cn("absolute top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-slate-900 transition-colors", i18n.language === 'ar' ? "right-4" : "left-4")} size={16} />
                          <Input
                            type={showAdminPassword ? "text" : "password"}
                            value={adminPassword}
                            onChange={e => setAdminPassword(e.target.value)}
                            required
                            dir="ltr"
                            className={cn("h-12 rounded-xl border-slate-100 bg-slate-50/50 focus:bg-white focus:border-slate-900 transition-all font-bold text-sm", i18n.language === 'ar' ? "pr-11 pl-12" : "pl-11 pr-12")}
                            placeholder="••••••••"
                          />
                          <button
                            type="button"
                            onClick={() => setShowAdminPassword(!showAdminPassword)}
                            className={cn("absolute top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-900 transition-colors", i18n.language === 'ar' ? "left-4" : "right-4")}
                          >
                            {showAdminPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </div>

                      <Button
                        type="submit"
                        disabled={loading}
                        className="w-full h-12 rounded-xl text-md font-black bg-slate-900 hover:bg-slate-800 text-white shadow-xl shadow-slate-900/10 transition-all active:scale-[0.98]"
                      >
                        {loading ? <Loader2 className="animate-spin" /> : t('admin_login_btn')}
                      </Button>

                      <div className="bg-amber-50/50 border border-amber-100 rounded-lg p-3 mt-3 text-center">
                        <p className="text-[9px] text-amber-700 font-bold flex items-center justify-center gap-2">
                          <ShieldCheck size={12} /> {t('admin_portal_desc')}
                        </p>
                      </div>
                    </form>
                  </TabsContent>
                </motion.div>
              </AnimatePresence>
                </Tabs>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
