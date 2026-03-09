import React from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';

interface TypeSelectorGridProps {
    items: any[];
    selectedValue: string;
    onSelect: (id: string) => void;
    title?: string;
    emptyMessage?: string;
    columns?: number;
    variant?: 'default' | 'large-horizontal' | 'compact';
    unsuitableIds?: string[];
}

const TypeSelectorGrid: React.FC<TypeSelectorGridProps> = ({
    items,
    selectedValue,
    onSelect,
    title,
    emptyMessage = "لا يوجد نتائج",
    columns = 2,
    variant = 'default',
    unsuitableIds = []
}) => {
    if (items.length === 0) {
        return (
            <div className="py-8 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                <p className="text-slate-400 font-bold">{emptyMessage}</p>
            </div>
        );
    }

    const getIcon = (item: any) => {
        if (item.icon) return item.icon;
        const name = item.name_ar || "";
        if (name.includes('تريلا')) return '🚛';
        if (name.includes('سكس')) return '🚚';
        if (name.includes('لوري')) return '🚛';
        if (name.includes('دينا')) return '🚚';
        if (name.includes('بيك اب')) return '🛻';
        if (name.includes('ناقلة سيارات') || name.includes('سيارات')) return '🚗';
        if (name.includes('ثقيل') || name.includes('معدات')) return '🏗️';
        if (name.includes('برادة') || name.includes('ثلاجة')) return '❄️';
        return '📦';
    };

    return (
        <div className="space-y-4">
            {title && (
                <h4 className="text-sm font-black text-slate-500 uppercase tracking-widest px-1">
                    {title}
                </h4>
            )}
            <div className={cn(
                "grid gap-4",
                variant === 'large-horizontal'
                    ? "grid-cols-2 md:grid-cols-5"
                    : columns === 2 ? "grid-cols-2" : columns === 3 ? "grid-cols-2 md:grid-cols-3" : "grid-cols-1 md:grid-cols-2"
            )}>
                {items.map((item) => {
                    const isSelected = selectedValue === item.id;
                    const isUnsuitable = unsuitableIds.includes(item.id);
                    const icon = getIcon(item);
                    return (
                        <motion.div
                            key={item.id}
                            whileHover={isUnsuitable ? {} : { scale: 1.05 }}
                            whileTap={isUnsuitable ? {} : { scale: 0.95 }}
                            onClick={() => onSelect(item.id)}
                            className={cn(
                                "relative group cursor-pointer p-6 rounded-[2rem] border-2 transition-all flex flex-col items-center justify-center text-center gap-4 bg-white",
                                variant === 'large-horizontal' ? "h-40" : "h-28",
                                isSelected
                                    ? "border-blue-500 shadow-xl shadow-blue-50/50 ring-4 ring-blue-50"
                                    : isUnsuitable
                                        ? "border-rose-100 bg-rose-50/10 opacity-60 grayscale-[0.8]"
                                        : "border-transparent hover:border-blue-200 hover:bg-slate-50/50"
                            )}
                        >
                            {isUnsuitable && (
                                <div className="absolute -top-2 bg-rose-500 text-white text-[8px] font-black px-2 py-1 rounded-full shadow-lg z-10 animate-bounce">
                                    حمولة غير متوفرة ⚠️
                                </div>
                            )}
                            <div className={cn(
                                "rounded-2xl flex items-center justify-center transition-all duration-300",
                                variant === 'large-horizontal' ? "text-5xl" : "w-12 h-12 text-2xl bg-slate-100",
                                isSelected ? "scale-110" : "group-hover:scale-110",
                                isUnsuitable && "opacity-40"
                            )}>
                                {icon}
                            </div>
                            <span className={cn(
                                "text-sm font-black transition-colors",
                                isSelected ? "text-blue-700" : "text-slate-600"
                            )}>
                                {item.name_ar}
                            </span>

                            {isSelected && (
                                <div className="absolute top-4 right-4 bg-blue-600 text-white p-1 rounded-full shadow-lg">
                                    <CheckCircle2 size={16} />
                                </div>
                            )}
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
};

export default TypeSelectorGrid;
