// src/data/saudi-locations.ts

export interface SaudiLocation {
  value: string;
  label: string;
  lat: number;
  lng: number;
}

export const saudiLocations: SaudiLocation[] = [
  // المناطق الرئيسية
  { value: "riyadh", label: "الرياض", lat: 24.7136, lng: 46.6753 },
  { value: "jeddah", label: "جدة", lat: 21.5433, lng: 39.1728 },
  { value: "mecca", label: "مكة المكرمة", lat: 21.3891, lng: 39.8579 },
  { value: "medina", label: "المدينة المنورة", lat: 24.5247, lng: 39.5692 },
  { value: "dammam", label: "الدمام", lat: 26.4207, lng: 50.0888 },
  { value: "khobar", label: "الخبر", lat: 26.2172, lng: 50.1971 },
  { value: "dhahran", label: "الظهران", lat: 26.2361, lng: 50.0393 },
  { value: "tabuk", label: "تبوك", lat: 28.3835, lng: 36.5662 },
  { value: "abha", label: "أبها", lat: 18.2164, lng: 42.5053 },
  { value: "khamis_mushait", label: "خميس مشيط", lat: 18.3095, lng: 42.7378 },
  { value: "buraidah", label: "بريدة", lat: 26.3260, lng: 43.9750 },
  { value: "hail", label: "حائل", lat: 27.5219, lng: 41.6961 },
  { value: "najran", label: "نجران", lat: 17.4924, lng: 44.1277 },
  { value: "jazan", label: "جازان", lat: 16.8894, lng: 42.5706 },
  { value: "jubail", label: "الجبيل", lat: 27.0000, lng: 49.6111 },
  { value: "yanbu", label: "ينبع", lat: 24.0232, lng: 38.1900 },
  { value: "taif", label: "الطائف", lat: 21.2854, lng: 40.4245 },
  { value: "hofuf", label: "الهفوف (الأحساء)", lat: 25.3642, lng: 49.5873 },
  { value: "hafar_al_batin", label: "حفر الباطن", lat: 28.4342, lng: 45.9636 },
  { value: "arar", label: "عرعر", lat: 30.9833, lng: 41.0167 },
  { value: "sakaka", label: "سكاكا", lat: 29.9697, lng: 40.2064 },
  { value: "al_bahah", label: "الباحة", lat: 20.0129, lng: 41.4677 },
  
  // محافظات ومدن أخرى
  { value: "unaizah", label: "عنيزة", lat: 26.0854, lng: 43.9768 },
  { value: "al_kharj", label: "الخرج", lat: 24.1500, lng: 47.3000 },
  { value: "al_qatif", label: "القطيف", lat: 26.5633, lng: 49.9964 },
  { value: "al_majmaah", label: "المجمعة", lat: 25.9122, lng: 45.3477 },
  { value: "al_ras", label: "الرس", lat: 25.8694, lng: 43.4973 },
  { value: "wadi_ad_dawasir", label: "وادي الدواسر", lat: 20.4667, lng: 44.8000 },
  { value: "bishah", label: "بيشة", lat: 19.9913, lng: 42.6053 },
  { value: "al_qunfudhah", label: "القنفذة", lat: 19.1281, lng: 41.0787 },
  { value: "rabigh", label: "رابغ", lat: 22.7986, lng: 39.0349 },
  { value: "sharonah", label: "شرورة", lat: 17.4733, lng: 47.1127 },
  { value: "al_ula", label: "العلا", lat: 26.6167, lng: 37.9167 },
  { value: "dawadmi", label: "الدوادمي", lat: 24.5071, lng: 44.3980 },
  { value: "zulfi", label: "الزلفي", lat: 26.2995, lng: 44.8114 },
  { value: "khafji", label: "الخفجي", lat: 28.4409, lng: 48.4947 },
  // يمكنك إضافة المزيد هنا حسب الحاجة
];
