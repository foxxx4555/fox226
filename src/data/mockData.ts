import { TruckType, TrailerType, TruckDimensions, TruckTypeInfo, TrailerTypeInfo, DimensionInfo } from '@/types';

export const saudiCities = [
    'الرياض', 'جدة', 'الدمام', 'مكة المكرمة', 'المدينة المنورة', 'أبها', 'تبوك', 'الخبر',
    'الطائف', 'بريدة', 'نجران', 'جازان', 'الجبيل', 'ينبع', 'حائل', 'الأحساء', 'الخرج', 'القطيف'
];

export const truckTypes: TruckTypeInfo[] = [
    { id: 'trella', nameAr: 'تريلا', icon: '🚛' },
    { id: 'lorry', nameAr: 'لوري', icon: '🚚' },
    { id: 'dyna', nameAr: 'دينا', icon: '🛻' },
    { id: 'pickup', nameAr: 'بيك أب', icon: '🚗' },
    { id: 'refrigerated', nameAr: 'مبرد', icon: '❄️' },
    { id: 'tanker', nameAr: 'صهريج', icon: '🛢️' },
    { id: 'flatbed', nameAr: 'سطحة', icon: '🏗️' },
    { id: 'container', nameAr: 'حاوية', icon: '📦' },
];

export const trailerTypes: TrailerTypeInfo[] = [
    { id: 'flatbed', nameAr: 'مسطح', icon: '📐' },
    { id: 'curtain', nameAr: 'ستارة', icon: '🎪' },
    { id: 'box', nameAr: 'صندوق', icon: '📦' },
    { id: 'refrigerated', nameAr: 'مبرد', icon: '🧊' },
    { id: 'lowboy', nameAr: 'لوبوي', icon: '⬇️' },
    { id: 'tank', nameAr: 'خزان', icon: '🛢️' },
];

export const truckDimensions: DimensionInfo[] = [
    { id: 'small', nameAr: 'صغير', specs: '3م × 2م' },
    { id: 'medium', nameAr: 'متوسط', specs: '6م × 2.5م' },
    { id: 'large', nameAr: 'كبير', specs: '12م × 2.5م' },
    { id: 'extra_large', nameAr: 'كبير جداً', specs: '16م × 2.5م' },
];

export function getTruckTypeInfo(id: TruckType | string): TruckTypeInfo | undefined {
    return truckTypes.find(t => t.id === id);
}

export function getTrailerTypeInfo(id: TrailerType | string): TrailerTypeInfo | undefined {
    return trailerTypes.find(t => t.id === id);
}

export function getDimensionInfo(id: TruckDimensions | string): DimensionInfo | undefined {
    return truckDimensions.find(d => d.id === id);
}
