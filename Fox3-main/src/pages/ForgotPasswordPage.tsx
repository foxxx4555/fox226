import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, ArrowLeft, Mail, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.forgotPassword(email);
      setSent(true);
      toast.success(t('check_email'));
    } catch (err: any) {
      toast.error(err.message || t('error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 relative overflow-hidden p-6">
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-accent/5 rounded-full blur-[120px] translate-y-1/2 -translate-x-1/2" />

      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-lg relative z-10">
        <Button
          variant="ghost"
          className="mb-8 hover:bg-white/50 rounded-2xl gap-2 font-black"
          onClick={() => navigate('/login')}
        >
          <ArrowLeft size={18} /> {t('back')}
        </Button>

        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-amber-500 rounded-3xl flex items-center justify-center mx-auto shadow-2xl shadow-amber-500/20 mb-6 rotate-3">
            <ShieldAlert size={40} className="text-white" />
          </div>
          <h1 className="text-4xl font-black tracking-tight">{t('reset_password')}</h1>
          <p className="text-muted-foreground font-medium mt-3 text-lg">{t('reset_password_desc')}</p>
        </div>

        <Card className="shadow-[0_25px_60px_-15px_rgba(0,0,0,0.1)] border-white/50 bg-white/70 backdrop-blur-2xl rounded-[2.5rem] overflow-hidden">
          <CardContent className="p-8 md:p-12">
            {sent ? (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-6 space-y-6">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 size={32} />
                </div>
                <div className="space-y-2">
                  <p className="text-2xl font-black">{t('check_email')}</p>
                  <p className="text-muted-foreground font-medium">لقد أرسلنا تعليمات استعادة كلمة المرور إلى بريدك الإلكتروني.</p>
                </div>
                <Button asChild className="w-full h-14 rounded-2xl font-black text-lg">
                  <Link to="/login">{t('login')}</Link>
                </Button>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-sm font-black uppercase ms-2 text-muted-foreground">{t('email')}</Label>
                  <div className="relative group">
                    <Mail className="absolute start-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={20} />
                    <Input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                      dir="ltr"
                      className="ps-12 h-16 rounded-2xl border-2 border-transparent bg-muted/40 focus:bg-white focus:border-primary transition-all text-lg font-bold"
                      placeholder="mail@example.com"
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full h-16 rounded-[1.5rem] text-xl font-black shadow-xl shadow-primary/20 hover:scale-[1.01] active:scale-[0.99] transition-all" disabled={loading}>
                  {loading ? <Loader2 className="animate-spin" /> : t('send_reset_link')}
                </Button>

                <div className="text-center pt-4">
                  <p className="text-sm font-bold text-muted-foreground">تذكرت كلمة المرور؟ <Link to="/login" className="text-primary hover:underline font-black">{t('login')}</Link></p>
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        <p className="text-center mt-12 text-muted-foreground/40 text-xs font-black uppercase tracking-widest">SAS Secure Authentication System</p>
      </motion.div>
    </div>
  );
}
