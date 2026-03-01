import { Driver, Load, TruckType, TrailerType, TruckDimensions, TruckTypeInfo, TrailerTypeInfo, DimensionInfo } from '@/types';

// Saudi Cities
export const saudiCities = [
  'الرياض',
  'جدة',
  'الدمام',
  'مكة المكرمة',
  'المدينة المنورة',
  'أبها',
  'تبوك',
  'الخبر',
  'الطائف',
  'بريدة',
  'نجران',
  'جازان',
  'الجبيل',
  'ينبع',
  'حائل',
  'الأحساء',
  'الخرج',
  'القطيف',
  'خميس مشيط',
  'حفر الباطن',
];

// Truck Types with Arabic names
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

// Trailer Types with Arabic names
export const trailerTypes: TrailerTypeInfo[] = [
  { id: 'flatbed', nameAr: 'مسطح', icon: '📐' },
  { id: 'curtain', nameAr: 'ستارة', icon: '🎪' },
  { id: 'box', nameAr: 'صندوق', icon: '📦' },
  { id: 'refrigerated', nameAr: 'مبرد', icon: '🧊' },
  { id: 'lowboy', nameAr: 'لوبوي', icon: '⬇️' },
  { id: 'tank', nameAr: 'خزان', icon: '🛢️' },
];

// Truck Dimensions
export const truckDimensions: DimensionInfo[] = [
  { id: 'small', nameAr: 'صغير', specs: '3م × 2م' },
  { id: 'medium', nameAr: 'متوسط', specs: '6م × 2.5م' },
  { id: 'large', nameAr: 'كبير', specs: '12م × 2.5م' },
  { id: 'extra_large', nameAr: 'كبير جداً', specs: '16م × 2.5م' },
];

// Arabic names for random generation
const arabicFirstNames = [
  'محمد', 'أحمد', 'عبدالله', 'خالد', 'سعود', 'فهد', 'سلطان', 'عبدالرحمن',
  'ناصر', 'فيصل', 'تركي', 'بندر', 'ماجد', 'سالم', 'يوسف', 'عمر',
  'علي', 'حسين', 'إبراهيم', 'عبدالعزيز', 'صالح', 'مشعل', 'نايف', 'سعد',
];

const arabicLastNames = [
  'العتيبي', 'القحطاني', 'الشمري', 'الحربي', 'الدوسري', 'الغامدي', 'الزهراني', 'المطيري',
  'السبيعي', 'الرشيدي', 'العنزي', 'البلوي', 'الجهني', 'السلمي', 'الحمود', 'الفهد',
  'العمري', 'الشهري', 'البقمي', 'الخالدي', 'الثقفي', 'الأحمدي', 'السعيد', 'المحمد',
];

// Load descriptions
const loadDescriptions = [
  'مواد بناء - حديد وإسمنت',
  'أثاث منزلي كامل',
  'بضائع متنوعة',
  'مواد غذائية مبردة',
  'معدات صناعية',
  'سيارات للنقل',
  'مواد كيميائية',
  'منتجات زراعية',
  'أجهزة إلكترونية',
  'ملابس ومنسوجات',
  'قطع غيار سيارات',
  'مواد تعبئة وتغليف',
  'أدوات مكتبية',
  'مستلزمات طبية',
  'مواد عزل',
];

// Helper functions
function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomNumber(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generatePhone(): string {
  return `05${randomNumber(0, 9)}${randomNumber(1000000, 9999999)}`;
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

function calculateDistance(origin: string, destination: string): number {
  // Simulated distances between cities (in km)
  const distances: Record<string, Record<string, number>> = {
    'الرياض': { 'جدة': 950, 'الدمام': 400, 'أبها': 950, 'تبوك': 1200, 'المدينة المنورة': 850 },
    'جدة': { 'الرياض': 950, 'مكة المكرمة': 80, 'المدينة المنورة': 420, 'أبها': 700, 'تبوك': 900 },
    'الدمام': { 'الرياض': 400, 'الخبر': 20, 'الجبيل': 100, 'الأحساء': 150 },
  };
  
  if (distances[origin]?.[destination]) {
    return distances[origin][destination];
  }
  if (distances[destination]?.[origin]) {
    return distances[destination][origin];
  }
  return randomNumber(100, 1500);
}

function calculateTime(distance: number): string {
  const hours = Math.ceil(distance / 80);
  if (hours < 1) return 'أقل من ساعة';
  if (hours === 1) return 'ساعة واحدة';
  if (hours === 2) return 'ساعتان';
  if (hours <= 10) return `${hours} ساعات`;
  return `${hours} ساعة`;
}

// Generate Drivers
export function generateDrivers(count: number = 150): Driver[] {
  const drivers: Driver[] = [];
  
  for (let i = 0; i < count; i++) {
    const truckType = randomElement(truckTypes).id;
    const trailerType = randomElement(trailerTypes).id;
    const dimensions = randomElement(truckDimensions).id;
    
    drivers.push({
      id: generateId(),
      name: `${randomElement(arabicFirstNames)} ${randomElement(arabicLastNames)}`,
      phone: generatePhone(),
      truckType,
      trailerType,
      dimensions,
      rating: Number((3.5 + Math.random() * 1.5).toFixed(1)),
      completedTrips: randomNumber(5, 500),
      isAvailable: Math.random() > 0.3,
      currentCity: randomElement(saudiCities),
      registrationDate: new Date(Date.now() - randomNumber(30, 365) * 24 * 60 * 60 * 1000).toISOString(),
    });
  }
  
  return drivers;
}

// Generate Loads
export function generateLoads(count: number = 150): Load[] {
  const loads: Load[] = [];
  const statuses: Load['status'][] = ['available', 'pending', 'in_progress', 'completed'];
  
  for (let i = 0; i < count; i++) {
    const origin = randomElement(saudiCities);
    let destination = randomElement(saudiCities);
    while (destination === origin) {
      destination = randomElement(saudiCities);
    }
    
    const distance = calculateDistance(origin, destination);
    const truckType = randomElement(truckTypes).id;
    
    loads.push({
      id: generateId(),
      ownerId: generateId(),
      ownerName: `${randomElement(arabicFirstNames)} ${randomElement(arabicLastNames)}`,
      ownerPhone: generatePhone(),
      origin,
      destination,
      distance,
      estimatedTime: calculateTime(distance),
      weight: randomNumber(500, 30000),
      description: randomElement(loadDescriptions),
      price: randomNumber(500, 15000),
      truckTypeRequired: truckType,
      status: randomElement(statuses),
      createdAt: new Date(Date.now() - randomNumber(0, 7) * 24 * 60 * 60 * 1000).toISOString(),
      expiresAt: new Date(Date.now() + randomNumber(1, 14) * 24 * 60 * 60 * 1000).toISOString(),
    });
  }
  
  return loads;
}

// Pre-generated data for consistent usage
export const mockDrivers = generateDrivers(150);
export const mockLoads = generateLoads(150);

// Get available loads only
export const availableLoads = mockLoads.filter(load => load.status === 'available');

// Get available drivers only
export const availableDrivers = mockDrivers.filter(driver => driver.isAvailable);

// Admin stats
export const adminStats = {
  totalUsers: mockDrivers.length + 50, // 50 shippers
  totalDrivers: mockDrivers.length,
  totalShippers: 50,
  activeLoads: mockLoads.filter(l => l.status === 'in_progress').length,
  completedTrips: mockLoads.filter(l => l.status === 'completed').length,
  pendingLoads: mockLoads.filter(l => l.status === 'pending').length,
};

// Get truck type info by id
export function getTruckTypeInfo(id: TruckType): TruckTypeInfo | undefined {
  return truckTypes.find(t => t.id === id);
}

// Get trailer type info by id
export function getTrailerTypeInfo(id: TrailerType): TrailerTypeInfo | undefined {
  return trailerTypes.find(t => t.id === id);
}

// Get dimension info by id
export function getDimensionInfo(id: TruckDimensions): DimensionInfo | undefined {
  return truckDimensions.find(d => d.id === id);
}
