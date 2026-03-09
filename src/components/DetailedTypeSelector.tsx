import React from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { CheckCircle2, ChevronLeft } from 'lucide-react';

interface DetailedTypeSelectorProps {
    items: any[];
    selectedValue: string;
    onSelect: (id: string) => void;
    emptyMessage?: string;
    unsuitableIds?: string[];
}

const DetailedTypeSelector: React.FC<DetailedTypeSelectorProps> = ({
    items,
    selectedValue,
    onSelect,
    emptyMessage = "لا يوجد محامل متوفرة",
    unsuitableIds = []
}) => {
    if (items.length === 0) {
        return (
            <div className="py-8 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                <p className="text-slate-400 font-bold">{emptyMessage}</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
            {items.map((item) => {
                const isSelected = selectedValue === item.id;
                const isUnsuitable = unsuitableIds.includes(item.id);

                return (
                    <motion.div
                        key={item.id}
                        whileHover={isUnsuitable ? {} : { scale: 1.02 }}
                        whileTap={isUnsuitable ? {} : { scale: 0.98 }}
                        onClick={() => onSelect(item.id)}
                        className={cn(
                            "relative cursor-pointer p-6 rounded-[2rem] border-2 transition-all flex flex-col justify-between h-32 bg-white",
                            isSelected
                                ? "border-blue-500 shadow-xl shadow-blue-50 ring-4 ring-blue-50"
                                : isUnsuitable
                                    ? "border-rose-100 bg-rose-50/30 opacity-60 grayscale-[0.5]"
                                    : "border-slate-100 hover:border-blue-200 hover:bg-slate-50/50"
                        )}
                    >
                        {isUnsuitable && (
                            <div className="absolute -top-2 -right-2 bg-rose-500 text-white text-[8px] font-black px-2 py-1 rounded-full shadow-lg z-10 animate-bounce">
                                حمولة غير كافية ⚠️
                            </div>
                        )}
                        <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                                    <ChevronLeft size={16} className="text-slate-400" />
                                </div>
                                <h4 className={cn(
                                    "text-lg font-black transition-colors",
                                    isSelected ? "text-blue-700" : "text-slate-900"
                                )}>
                                    {item.name_ar}
                                </h4>
                            </div>
                            <div className={cn(
                                "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                                isSelected ? "bg-blue-600 border-blue-600 text-white" : "border-slate-200 bg-white"
                            )}>
                                {isSelected && <CheckCircle2 size={14} />}
                            </div>
                        </div>

                        <div className="flex gap-4 pr-11">
                            {item.capacity_tons && (
                                <div className="flex flex-col">
                                    <span className="text-[10px] text-slate-400 font-bold">الحمولة</span>
                                    <span className="text-sm font-black text-slate-600">{item.capacity_tons} طن</span>
                                </div>
                            )}
                            {item.length_meters && (
                                <div className="flex flex-col">
                                    <span className="text-[10px] text-slate-400 font-bold">الطول</span>
                                    <span className="text-sm font-black text-slate-600">{item.length_meters} متر</span>
                                </div>
                            )}
                        </div>
                    </motion.div>
                );
            })}
        </div>
    );
};

export default DetailedTypeSelector;
