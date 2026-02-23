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
import { Loader2, ArrowLeft, Mail, Lock, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';

export default function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { setUserProfile, setCurrentRole } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  const handleUserLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { profile, role } = await api.loginByEmail(email, password);
      if (profile) setUserProfile(profile);
      if (role) setCurrentRole(role);
      toast.success(t('success'));
      if (role === 'driver') navigate('/driver/dashboard');
      else if (role === 'shipper') navigate('/shipper/dashboard');
      else if (role === 'admin') navigate('/admin/dashboard');
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
      setCurrentRole('admin');
      toast.success(t('success'));
      navigate('/admin/dashboard');
    } catch (err: any) {
      toast.error(err.message || t('error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 relative overflow-hidden p-6">
      {/* Decorative blobs */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-accent/5 rounded-full blur-[120px] translate-y-1/2 -translate-x-1/2" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg relative z-10"
      >
        <Button
          variant="ghost"
          className="mb-8 hover:bg-white/50 rounded-2xl gap-2 font-bold"
          onClick={() => navigate('/')}
        >
          <ArrowLeft size={18} /> {t('back')}
        </Button>

        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-primary rounded-3xl flex items-center justify-center mx-auto shadow-2xl shadow-primary/20 mb-6 rotate-6 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent" />
            <ShieldCheck size={40} className="text-white relative z-10" />
          </div>
          <h1 className="text-4xl font-black tracking-tight text-foreground mb-3">{t('login')}</h1>
          <p className="text-muted-foreground font-medium">{t('welcome_subtitle')}</p>
        </div>

        <Card className="shadow-[0_20px_50px_rgba(0,0,0,0.1)] border-white/50 bg-white/70 backdrop-blur-2xl rounded-[2.5rem] overflow-hidden">
          <CardContent className="p-8 md:p-10">
            <Tabs defaultValue="user" dir="rtl" className="w-full">
              <TabsList className="w-full grid grid-cols-2 h-14 bg-muted/50 p-1.5 rounded-2xl mb-10">
                <TabsTrigger value="user" className="rounded-xl font-bold text-base transition-all">{t('login_as_user')}</TabsTrigger>
                <TabsTrigger value="admin" className="rounded-xl font-bold text-base transition-all">{t('login_as_admin')}</TabsTrigger>
              </TabsList>

              <TabsContent value="user">
                <form onSubmit={handleUserLogin} className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-bold ms-1">{t('email')}</Label>
                    <div className="relative group">
                      <Mail className="absolute start-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={18} />
                      <Input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        required
                        dir="ltr"
                        className="ps-12 h-14 rounded-2xl border-2 border-transparent bg-muted/50 focus:bg-white focus:border-primary transition-all text-base font-medium"
                        placeholder="mail@example.com"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-bold ms-1">{t('password')}</Label>
                    <div className="relative group">
                      <Lock className="absolute start-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={18} />
                      <Input
                        type="password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        required
                        dir="ltr"
                        className="ps-12 h-14 rounded-2xl border-2 border-transparent bg-muted/50 focus:bg-white focus:border-primary transition-all text-base font-medium"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>

                  <Button type="submit" className="w-full h-14 rounded-2xl text-lg font-black shadow-lg shadow-primary/20 hover:scale-[1.01] active:scale-[0.99] transition-all" disabled={loading}>
                    {loading ? <Loader2 className="animate-spin" /> : t('login')}
                  </Button>

                  <div className="pt-4 flex flex-col gap-4 text-center">
                    <Link to="/forgot-password" size="sm" className="text-sm text-primary font-bold hover:underline">{t('forgot_password')}</Link>
                    <div className="h-px bg-border/50 w-full" />
                    <p className="text-sm font-semibold text-muted-foreground">
                      {t('no_account')} <Link to="/register" className="text-primary font-black hover:underline underline-offset-4">{t('register')}</Link>
                    </p>
                  </div>
                </form>
              </TabsContent>

              <TabsContent value="admin">
                <form onSubmit={handleAdminLogin} className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-bold ms-1">{t('email')}</Label>
                    <div className="relative group">
                      <Mail className="absolute start-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={18} />
                      <Input
                        type="email"
                        value={adminEmail}
                        onChange={e => setAdminEmail(e.target.value)}
                        required
                        dir="ltr"
                        className="ps-12 h-14 rounded-2xl border-2 border-transparent bg-muted/50 focus:bg-white focus:border-primary transition-all text-base"
                        placeholder="admin@sas.com"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-bold ms-1">{t('password')}</Label>
                    <div className="relative group">
                      <Lock className="absolute start-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={18} />
                      <Input
                        type="password"
                        value={adminPassword}
                        onChange={e => setAdminPassword(e.target.value)}
                        required
                        dir="ltr"
                        className="ps-12 h-14 rounded-2xl border-2 border-transparent bg-muted/50 focus:bg-white focus:border-primary transition-all text-base"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>

                  <Button type="submit" className="w-full h-14 rounded-2xl text-lg font-black bg-slate-900 hover:bg-slate-800 text-white shadow-xl shadow-slate-900/10" disabled={loading}>
                    {loading ? <Loader2 className="animate-spin" /> : t('login')}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
