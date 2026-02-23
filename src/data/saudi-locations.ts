export interface SaudiLocation {
    value: string;
    label: string;
    lat: number;
    lng: number;
}

export const saudiLocations: SaudiLocation[] = [
    { value: "riyadh", label: "الرياض", lat: 24.7136, lng: 46.6753 },
    { value: "jeddah", label: "جدة", lat: 21.5433, lng: 39.1728 },
    { value: "mecca", label: "مكة المكرمة", lat: 21.3891, lng: 39.8579 },
    { value: "medina", label: "المدينة المنورة", lat: 24.5247, lng: 39.5692 },
    { value: "dammam", label: "الدمام", lat: 26.4207, lng: 50.0888 },
    { value: "khobar", label: "الخبر", lat: 26.2172, lng: 50.1971 },
    { value: "tabuk", label: "تبوك", lat: 28.3835, lng: 36.5662 },
    { value: "buraidah", label: "بريدة", lat: 26.3260, lng: 43.9750 },
    { value: "hail", label: "حائل", lat: 27.5219, lng: 41.6961 },
    { value: "abha", label: "أبها", lat: 18.2164, lng: 42.5053 },
];
