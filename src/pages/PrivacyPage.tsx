import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ArrowRight, Shield } from 'lucide-react';
import { motion } from 'framer-motion';

export default function PrivacyPage() {
    const navigate = useNavigate();
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPrivacy = async () => {
            try {
                const { data, error } = await supabase
                    .from('system_settings')
                    .select('data')
                    .eq('id', 'content_config')
                    .maybeSingle();

                if (data && (data.data as any).privacyPolicy) {
                    setContent((data.data as any).privacyPolicy);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchPrivacy();
    }, []);

    return (
        <div className="min-h-screen bg-slate-50 font-['Cairo']" dir="rtl">
            <div className="container mx-auto px-6 py-12 max-w-4xl">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-[2.5rem] shadow-2xl p-8 md:p-12 border border-slate-100"
                >
                    <div className="flex items-center justify-between mb-8 border-b border-slate-50 pb-6">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                                <Shield size={32} />
                            </div>
                            <div className="flex flex-col">
                                <h1 className="text-3xl font-black text-slate-900">سياسة الخصوصية</h1>
                                <p className="text-slate-400 font-bold text-sm">آخر تحديث في {new Date().toLocaleDateString('ar-SA')}</p>
                            </div>
                        </div>
                        <Button variant="ghost" className="gap-2 font-black text-slate-500 hover:text-primary" onClick={() => navigate(-1)}>
                            <ArrowRight size={20} /> رجوع
                        </Button>
                    </div>

                    {loading ? (
                        <div className="space-y-6 animate-pulse">
                            <div className="h-4 bg-slate-100 rounded w-3/4"></div>
                            <div className="h-4 bg-slate-100 rounded w-full"></div>
                            <div className="h-4 bg-slate-100 rounded w-full"></div>
                            <div className="h-4 bg-slate-100 rounded w-5/6"></div>
                        </div>
                    ) : (
                        <div className="max-w-none">
                            <div className="text-slate-600 leading-[2] text-xl font-bold whitespace-pre-wrap">
                                {content || "سياسة الخصوصية قيد التحديث من قبل الإدارة..."}
                            </div>
                        </div>
                    )}
                </motion.div>
            </div>
        </div>
    );
}
