import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { MoveLeft, HelpCircle } from "lucide-react";
import { motion } from "framer-motion";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0c10] relative overflow-hidden p-6">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-destructive/10 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2" />

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center z-10 space-y-8 max-w-lg"
      >
        <div className="relative inline-block">
          <h1 className="text-[12rem] font-black text-white/5 leading-none">404</h1>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-24 h-24 bg-primary/20 rounded-3xl flex items-center justify-center backdrop-blur-3xl border border-white/10 animate-bounce">
              <HelpCircle size={48} className="text-primary" />
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="text-4xl font-black text-white px-4">أوبس! الصفحة غير موجودة</h2>
          <p className="text-slate-400 font-medium text-lg leading-relaxed">يبدو أنك ضللت الطريق أو أن الرابط الذي تحاول الوصول إليه غير موجود في نظامنا.</p>
        </div>

        <Button
          onClick={() => navigate('/')}
          className="h-16 px-10 rounded-2xl text-xl font-black bg-primary hover:bg-primary/90 text-white shadow-2xl shadow-primary/20 gap-3 group"
        >
          <MoveLeft className="group-hover:-translate-x-1 transition-transform" /> العودة للرئيسية
        </Button>
      </motion.div>

      <div className="absolute bottom-10 text-white/10 font-black tracking-widest uppercase text-xs">
        SAS Transport Operations • Error 404
      </div>
    </div>
  );
};

export default NotFound;
