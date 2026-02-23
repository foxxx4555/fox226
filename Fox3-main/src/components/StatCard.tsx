import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  color?: 'primary' | 'secondary' | 'accent' | 'destructive';
  trend?: {
    value: string;
    isPositive: boolean;
  };
}

const colorMap = {
  primary: 'from-primary/10 via-primary/5 to-transparent border-primary/20',
  secondary: 'from-secondary/10 via-secondary/5 to-transparent border-secondary/20',
  accent: 'from-accent/10 via-accent/5 to-transparent border-accent/20',
  destructive: 'from-destructive/10 via-destructive/5 to-transparent border-destructive/20',
};

const iconColorMap = {
  primary: 'bg-primary shadow-primary/30',
  secondary: 'bg-secondary shadow-secondary/30',
  accent: 'bg-accent shadow-accent/30',
  destructive: 'bg-destructive shadow-destructive/30',
};

export default function StatCard({ title, value, icon, color = 'primary', trend }: StatCardProps) {
  const { t } = useTranslation();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -5, shadow: "0 25px 50px -12px rgba(0, 0, 0, 0.1)" }}
      className={cn(
        "relative overflow-hidden rounded-[2.5rem] border bg-card p-7 transition-all duration-300",
        "bg-gradient-to-br",
        colorMap[color]
      )}
    >
      <div className="flex items-start justify-between relative z-10">
        <div className="space-y-4">
          <div className="space-y-1">
            <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">{title}</p>
            <p className="text-4xl font-black tracking-tight">{value}</p>
          </div>

          {trend && (
            <div className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold",
              trend.isPositive ? "bg-emerald-500/10 text-emerald-600" : "bg-destructive/10 text-destructive"
            )}>
              {trend.isPositive ? '↑' : '↓'} {trend.value}
              <span className="text-muted-foreground/60 font-medium ms-1">{t('vs_last_month')}</span>
            </div>
          )}
        </div>

        <div className={cn(
          "p-5 rounded-3xl text-white shadow-2xl transition-transform duration-300",
          iconColorMap[color]
        )}>
          {icon}
        </div>
      </div>

      {/* Decorative background element */}
      <div className={cn(
        "absolute -right-8 -bottom-8 w-32 h-32 blur-3xl opacity-20 -z-0",
        color === 'primary' && "bg-primary",
        color === 'secondary' && "bg-secondary",
        color === 'accent' && "bg-accent",
        color === 'destructive' && "bg-destructive",
      )} />
    </motion.div>
  );
}
