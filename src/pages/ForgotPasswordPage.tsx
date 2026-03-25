import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'; // Added CardHeader, CardTitle
import { toast } from 'sonner';
import { Loader2, ArrowRight, Mail, KeySquare, User } from 'lucide-react'; // Changed ArrowLeft to ArrowRight, ShieldAlert to KeySquare, added User
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils'; // Added cn for conditional classes

export default function ForgotPasswordPage() {
  const { t, i18n } = useTranslation(); // Destructured i18n
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState(''); // Email, Username, or Phone
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) return;

    setLoading(true);
    try {
      // 1. Resolve identifier to email first (handles usernames and phone numbers)
      const resolvedEmail = await api.resolveIdentifierToEmail(identifier.trim());
      
      if (!resolvedEmail) {
        throw new Error(i18n.language === 'ar' ? 'لم نتمكن من العثور على حساب مرتبط بهذه البيانات' : 'Could not find an account with this information');
      }

      // 2. Send the actual forgot password request
      await api.forgotPassword(resolvedEmail);
      setSubmitted(true);
      toast.success(t('success'));
    } catch (err: any) {
      console.error("Forgot Password Error:", err);
      if (err.code === 'over_email_send_rate_limit' || err.message?.includes('rate limit')) {
        toast.error(i18n.language === 'ar' ? 'لقد تجاوزت الحد المسموح به لإرسال رسائل البريد. يرجى المحاولة بعد قليل.' : 'Email rate limit exceeded. Please try again later.');
      } else {
        toast.error(err.message || t('error'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] relative overflow-hidden p-6" dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <Button
          variant="ghost"
          className="mb-8 hover:bg-white/80 rounded-xl gap-2 font-bold text-slate-500"
          onClick={() => navigate('/login')}
        >
          <ArrowRight size={18} className={i18n.language === 'ar' ? "rotate-0" : "rotate-180"} /> {t('back')}
        </Button>

        <Card className="shadow-2xl shadow-slate-200/50 border-white/60 bg-white/90 backdrop-blur-xl rounded-[2.5rem] overflow-hidden border-2">
          <CardHeader className="text-center pt-10 pb-6 px-10">
            <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-6 text-primary shadow-inner">
              <KeySquare size={36} strokeWidth={2.5} />
            </div>
            <CardTitle className="text-3xl font-black text-slate-900 tracking-tight">{t('reset_password')}</CardTitle>
            <p className="text-sm font-bold text-slate-400 mt-2 leading-relaxed">
              {submitted ? t('reset_sent_desc') : t('reset_password_desc')}
            </p>
          </CardHeader>
          <CardContent className="px-10 pb-10">
            {!submitted ? (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-xs font-black text-slate-500 ms-1 uppercase tracking-wider">
                    {i18n.language === 'ar' ? 'البريد، اسم المستخدم، أو الهاتف' : 'Email, Username, or Phone'}
                  </Label>
                  <div className="relative group">
                    <User className={cn("absolute top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors", i18n.language === 'ar' ? "right-4" : "left-4")} size={20} />
                    <Input
                      type="text"
                      placeholder={i18n.language === 'ar' ? "مثال: user123 أو 050..." : "e.g. user123 or 050..."}
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      required
                      dir="ltr"
                      className={cn("h-14 rounded-2xl border-slate-100 bg-slate-50/50 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all font-bold text-lg", i18n.language === 'ar' ? "pr-12" : "pl-12")}
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-14 rounded-2xl text-lg font-black bg-primary hover:bg-primary/90 text-white shadow-xl shadow-primary/20 transition-all active:scale-[0.98]"
                  disabled={loading}
                >
                  {loading ? <Loader2 className="animate-spin" /> : t('send_reset_link')}
                </Button>
              </form>
            ) : (
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-center space-y-6"
              >
                <div className="bg-emerald-50 text-emerald-600 rounded-2xl p-6 border border-emerald-100 font-bold">
                  {t('check_email')}
                </div>
                <Button
                  onClick={() => setSubmitted(false)}
                  variant="outline"
                  className="w-full h-14 rounded-2xl font-black border-slate-100 hover:bg-slate-50"
                >
                  ← {t('back')}
                </Button>
              </motion.div>
            )}

            <div className="text-center mt-8">
              <p className="text-xs font-bold text-slate-400">
                {t('remember_password')}{' '}
                <Link to="/login" className="text-primary font-black hover:underline underline-offset-4 decoration-2">
                  {t('login')}
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
