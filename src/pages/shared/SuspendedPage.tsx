import { ShieldAlert, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export default function SuspendedPage() {
    const navigate = useNavigate();

    return (
        <div className="flex h-screen w-full flex-col items-center justify-center bg-rose-950 text-white gap-4 p-6 text-center" dir="rtl" style={{ zIndex: 9999 }}>
            <div className="bg-rose-500/20 p-8 rounded-full mb-6 relative">
                <Lock size={100} className="text-rose-500 animate-pulse" />
                <ShieldAlert size={40} className="text-white absolute bottom-4 right-4" />
            </div>

            <h1 className="text-5xl font-black mb-4 tracking-tight">تم إيقاف حسابك مؤقتاً</h1>

            <p className="text-rose-200/80 max-w-lg leading-relaxed font-bold text-xl mb-8">
                عذراً، لا يمكنك متابعة العمل حالياً نظراً لإيقاف حسابك من قبل الإدارة. يرجى التواصل مع فريق الدعم والإدارة المختصة لمراجعة حسابك واستعادة التفعيل.
            </p>

            {/* Button to return to login so they aren't stuck on a blank page if they refresh */}
            <Button
                onClick={() => {
                    window.location.href = '/login';
                }}
                className="mt-8 bg-black/40 hover:bg-black/60 text-white rounded-3xl h-16 px-12 font-black text-xl border border-white/10 backdrop-blur-md transition-all">
                العودة لتسجيل الدخول
            </Button>
        </div>
    );
}
