import { useEffect, useState, useMemo, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../services/api';
import AppLayout from '../../components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { cn } from '../../lib/utils';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from "../../components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandList, CommandItem, CommandInput } from "../../components/ui/command";
import { toast } from 'sonner';
import { Loader2, ChevronsUpDown, Package, Info, Search, MapPin, CheckCircle2, User, Users, ChevronRight, ChevronLeft, Calendar, Truck, Warehouse, Star, Activity, Navigation as NavIcon } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../integrations/supabase/client';
import TypeSelectorGrid from '@/components/TypeSelectorGrid';
import DetailedTypeSelector from '@/components/DetailedTypeSelector';

// إضافة أداة معالجة الأرقام لتفادي مشاكل الفواصل
const parseSafeNumber = (val: string | number | null | undefined): number => {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return val;
  const cleaned = val.toString().replace(/,/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
};

const SAUDI_CITIES = [
  { value: "riyadh", label: "الرياض", lat: 24.7136, lng: 46.6753 },
  { value: "jeddah", label: "جدة", lat: 21.5433, lng: 39.1728 },
  { value: "mecca", label: "مكة المكرمة", lat: 21.3891, lng: 39.8579 },
  { value: "medina", label: "المدينة المنورة", lat: 24.5247, lng: 39.5692 },
  { value: "dammam", label: "الدمام", lat: 26.4207, lng: 50.0888 },
  { value: "khobar", label: "الخبر", lat: 26.2172, lng: 50.1971 },
  { value: "dhahran", label: "الظهران", lat: 26.2361, lng: 50.1103 },
  { value: "ahsa", label: "الأحساء", lat: 25.3263, lng: 49.5932 },
  { value: "qatif", label: "القطيف", lat: 26.5492, lng: 50.0075 },
  { value: "jubail", label: "الجبيل", lat: 27.0117, lng: 49.6583 },
  { value: "hafr_al_batin", label: "حفر الباطن", lat: 28.4328, lng: 45.9708 },
  { value: "khafji", label: "الخفجي", lat: 28.4381, lng: 48.4908 },
  { value: "taif", label: "الطائف", lat: 21.2854, lng: 40.4211 },
  { value: "tabuk", label: "تبوك", lat: 28.3835, lng: 36.5662 },
  { value: "abha", label: "أبها", lat: 18.2164, lng: 42.5053 },
  { value: "khamis_mushait", label: "خميس مشيط", lat: 18.3064, lng: 42.7292 },
  { value: "buraidah", label: "بريدة", lat: 26.3260, lng: 43.9750 },
  { value: "unaizah", label: "عنيزة", lat: 26.0847, lng: 43.9917 },
  { value: "hail", lat: 27.5219, lng: 41.6961, label: "حائل" },
  { value: "sakaka", label: "سكاكا", lat: 29.9697, lng: 40.2064 },
  { value: "arar", label: "عرعر", lat: 30.9753, lng: 41.0381 },
  { value: "najran", label: "نجران", lat: 17.5656, lng: 44.2289 },
  { value: "jizan", label: "جيزان", lat: 16.8892, lng: 42.5706 },
  { value: "bahah", label: "الباحة", lat: 20.0129, lng: 41.4677 },
  { value: "yanbu", label: "ينبع", lat: 24.0891, lng: 38.0637 },
  { value: "rabigh", label: "رابغ", lat: 22.7986, lng: 39.0347 },
  { value: "duwadmi", label: "الدوادمي", lat: 24.5075, lng: 44.3917 },
  { value: "kharj", label: "الخرج", lat: 24.1500, lng: 47.3000 },
  { value: "quwayiyah", label: "القويعية", lat: 24.0533, lng: 45.2631 },
  { value: "majamah", label: "المجمعة", lat: 25.9000, lng: 45.3333 },
  { value: "zulfi", label: "الزلفي", lat: 26.2917, lng: 44.8250 },
  { value: "shaqra", label: "شقراء", lat: 25.2422, lng: 45.2478 },
  { value: "huraymila", label: "حريملاء", lat: 25.1278, lng: 46.1214 },
  { value: "afif", label: "عفيف", lat: 23.9067, lng: 42.9172 },
  { value: "layla", label: "ليلى", lat: 22.2817, lng: 46.7264 },
  { value: "bisha", label: "بيشة", lat: 19.9861, lng: 42.6075 },
  { value: "qunfudhah", label: "القنفذة", lat: 19.1264, lng: 41.0789 },
  { value: "lith", label: "الليث", lat: 20.1500, lng: 40.2667 },
  { value: "khulays", label: "خليص", lat: 22.1489, lng: 39.3131 },
  { value: "sharurah", label: "شرورة", lat: 17.4833, lng: 47.1167 },
  { value: "turaif", label: "طريف", lat: 31.6725, lng: 38.6631 },
  { value: "qurayyat", label: "القريات", lat: 31.3314, lng: 37.3422 },
  { value: "daumat_al_jandal", label: "دومة الجندل", lat: 29.8147, lng: 39.8689 },
  { value: "abu_arish", label: "أبو عريش", lat: 16.9678, lng: 42.8306 },
  { value: "samitah", label: "صامطة", lat: 16.5911, lng: 42.9431 },
];

function calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// سيتم جلب هذه القيم من قاعدة البيانات الآن
const DEFAULT_PRICING_CONFIG = {
  short_distance_limit: 0,
  short_distance_price: 0,
  long_distance_limit: 0,
  long_distance_price: 0,
  vat_rate: 15,
  commission: 10,
};

export default function ShipperPostLoad() {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const { state } = useLocation();
  const templateLoad = state?.templateLoad;
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const totalSteps = 4;

  const [openOrigin, setOpenOrigin] = useState(false);
  const [openDest, setOpenDest] = useState(false);
  const [openProduct, setOpenProduct] = useState(false);
  const [openReceiver, setOpenReceiver] = useState(false);
  const [openTruckCat, setOpenTruckCat] = useState(false);
  const [openBodyType, setOpenBodyType] = useState(false);
  const [savedLocations, setSavedLocations] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [receivers, setReceivers] = useState<any[]>([]);

  const today = new Date().toISOString().split('T')[0];

  const [distance, setDistance] = useState<number | null>(null);
  const [priceBreakdown, setPriceBreakdown] = useState({
    base: 0,
    distanceCost: 0,
    kmRate: 0,
    vat: 0,
    total: 0
  });
  const [pricingConfig, setPricingConfig] = useState(DEFAULT_PRICING_CONFIG);
  const [truckCategories, setTruckCategories] = useState<any[]>([]);
  const [bodyTypes, setBodyTypes] = useState<any[]>([]);
  const [typePricing, setTypePricing] = useState<any[]>([]);
  const [commodities, setCommodities] = useState<any[]>([]);

  const [form, setForm] = useState({
    origin: '',
    destination: '',
    weight: '',
    price: '',
    package_type: '',
    pickup_date: today,
    truck_category: '', // This will store the truck_category_id
    body_type: '',      // This will store the body_type_id
    commodity_id: '',   // This will store the shipment_commodity_id
    receiver_name: '',
    receiver_phone: '',
    qty: '',
    unit: '',
    goods_value: '',
    insurance_value: '',
    payment_method: 'الدفع عند الاستلام',
  });

  const filteredBodyTypes = form.truck_category
    ? bodyTypes.filter(bt => bt.category_id === form.truck_category)
    : bodyTypes;

  const unsuitableBodyTypeIds = useMemo(() => {
    if (typePricing.length === 0 || !form.weight) return [];
    const shipperWeight = Number(form.weight);
    return bodyTypes.filter(bt => {
      const pricing = typePricing.find(p => p.body_type_id === bt.id && p.truck_category_id === form.truck_category);
      if (pricing) {
        const adminCapacity = Number(pricing.capacity_text || '0');
        return shipperWeight > adminCapacity;
      }
      return false;
    }).map(bt => bt.id);
  }, [typePricing, form.weight, form.truck_category, bodyTypes]);

  const unsuitableTruckCategoryIds = useMemo(() => {
    if (typePricing.length === 0 || !form.weight) return [];
    const shipperWeight = Number(form.weight);
    return truckCategories.filter(cat => {
      const catPricing = typePricing.filter(p => p.truck_category_id === cat.id);
      if (catPricing.length === 0) return false;
      const maxCatCapacity = Math.max(...catPricing.map(p => Number(p.capacity_text || '0')));
      return shipperWeight > maxCatCapacity;
    }).map(cat => cat.id);
  }, [typePricing, form.weight, truckCategories]);

  const isWeightConflict = form.body_type && unsuitableBodyTypeIds.includes(form.body_type);

  const fetchData = async () => {
    if (userProfile?.id) {
      try {
        const [locs, prods, recs] = await Promise.all([
          api.getSavedLocations(userProfile.id),
          api.getProducts(userProfile.id),
          api.getReceivers(userProfile.id)
        ]);
        setSavedLocations(locs || []);
        setProducts(prods || []);
        setReceivers(recs || []);
      } catch (err) {
        console.error("Error fetching data:", err);
      }
    }
  };

  // جلب إعدادات التسعير والفئات من قاعدة البيانات
  const fetchConfigs = useCallback(async () => {
    try {
      const [settingsRes, trucksRes, bodiesRes, pricingRes, commoditiesRes] = await Promise.all([
        supabase.from('system_settings').select('data').eq('id', 'pricing_config').maybeSingle(),
        supabase.from('truck_categories').select('*').eq('is_active', true).order('name_ar'),
        supabase.from('load_body_types').select('*').eq('is_active', true).order('name_ar'),
        supabase.from('shipment_type_pricing').select('*'),
        supabase.from('shipment_commodities').select('*').eq('is_active', true).order('name_ar')
      ]);

      if (settingsRes.data?.data) {
        const config = settingsRes.data.data as any;
        setPricingConfig({
          short_distance_limit: config.short_distance_limit || DEFAULT_PRICING_CONFIG.short_distance_limit,
          short_distance_price: config.short_distance_price || DEFAULT_PRICING_CONFIG.short_distance_price,
          long_distance_limit: config.long_distance_limit || DEFAULT_PRICING_CONFIG.long_distance_limit,
          long_distance_price: config.long_distance_price || DEFAULT_PRICING_CONFIG.long_distance_price,
          vat_rate: config.vat_rate ?? DEFAULT_PRICING_CONFIG.vat_rate,
          commission: config.commission ?? DEFAULT_PRICING_CONFIG.commission,
        });
      }

      setTruckCategories(trucksRes.data || []);
      setBodyTypes(bodiesRes.data || []);
      setTypePricing(pricingRes.data || []);
      console.log("البيانات اللي جت من قاعدة البيانات اهي يا بطل (shipment_type_pricing):", pricingRes.data);
      const fetchedCommodities = commoditiesRes?.data || [];
      setCommodities(fetchedCommodities);

      if (fetchedCommodities.length > 0 && !form.commodity_id) {
        setForm(prev => ({ ...prev, commodity_id: fetchedCommodities[0].id }));
      }

    } catch (err) {
      console.error("فشل في جلب الإعدادات:", err);
    }
  }, [form.commodity_id]);

  useEffect(() => {
    fetchData();
    fetchConfigs();

    // إعداد الاشتراك اللحظي لتحديث الأسعار فوراً عند تغييرها في الإدارة
    const channel = supabase
      .channel('pricing-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'system_settings', filter: "id=eq.pricing_config" },
        () => {
          console.log("⚡ تحديث لحظي لإعدادات النظام...");
          fetchConfigs();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'shipment_type_pricing' },
        () => {
          console.log("⚡ تحديث لحظي لأسعار الفئات...");
          fetchConfigs();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'route_pricing' },
        () => {
          console.log("⚡ تحديث لحظي للمسارات المخصصة...");
          fetchConfigs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userProfile?.id, fetchConfigs]);

  useEffect(() => {
    if (templateLoad && truckCategories.length > 0) {
      const truckCat = truckCategories.find(c => c.name_ar === templateLoad.truck_type_required || c.id === templateLoad.truck_type_required);
      const bodyCat = bodyTypes.find(b => b.name_ar === templateLoad.body_type || b.id === templateLoad.body_type);

      setForm({
        origin: templateLoad.origin || '',
        destination: templateLoad.destination || '',
        weight: templateLoad.weight?.toString() || '',
        price: templateLoad.price?.toString() || '',
        package_type: templateLoad.package_type || '',
        pickup_date: today,
        truck_category: truckCat?.id || '',
        body_type: bodyCat?.id || '',
        commodity_id: templateLoad.commodity_id || '',
        receiver_name: templateLoad.receiver_name || '',
        receiver_phone: templateLoad.receiver_phone?.replace('+966', '') || '',
        qty: templateLoad.quantity?.toString() || '',
        unit: templateLoad.unit || '',
        goods_value: templateLoad.goods_value?.toString() || '',
        insurance_value: templateLoad.insurance_value?.toString() || '',
        payment_method: templateLoad.payment_method || 'الدفع عند الاستلام',
      });
      toast.success("تم استيراد بيانات الشحنة السابقة بنجاح");
    }
  }, [templateLoad, truckCategories, bodyTypes]);

  useEffect(() => {
    if (form.origin && form.destination) {
      const normalize = (s: string) => s.replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').trim();

      const findCity = (input: string) => {
        const normalizedInput = normalize(input);
        // أولاً: البحث عن تطابق كامل
        let city = SAUDI_CITIES.find(c => normalize(c.label) === normalizedInput);
        if (city) return city;

        // ثانياً: البحث عما إذا كان اسم المدينة موجوداً داخل النص (للمواقع المحفوظة)
        city = SAUDI_CITIES.find(c => normalizedInput.includes(normalize(c.label)));
        return city;
      };

      const originCity = findCity(form.origin);
      const destCity = findCity(form.destination);

      if (originCity && destCity) {
        const dist = calculateHaversineDistance(originCity.lat, originCity.lng, destCity.lat, destCity.lng);

        // --- منطق التسعير الجديد هنا ---
        const filteredBodyTypes = bodyTypes.filter(bt => !form.truck_category || bt.category_id === form.truck_category);
        const selectedCategoryName = truckCategories.find(c => c.id === form.truck_category)?.name_ar;
        const selectedBodyTypeName = bodyTypes.find(b => b.id === form.body_type)?.name_ar;

        const applyPricing = async () => {
          let suggestedPrice = 0;

          try {
            // 1. البحث عن مسار مخصص في قاعدة البيانات
            const { data: routeData } = await supabase
              .from('route_pricing' as any)
              .select('*')
              .or(`and(origin_city.ilike.${originCity.label},destination_city.ilike.${destCity.label}),and(origin_city.ilike.${destCity.label},destination_city.ilike.${originCity.label})`)
              .eq('is_active', true)
              .maybeSingle();

            const route = routeData as any;

            // تقريب المسافة المقطوعة لأقرب عدد صحيح (لحل مشكلة الفواصل العشرية)
            const rawDistance = route?.distance_km || dist;
            const roundedDistance = Math.round(rawDistance);

            // التحقق من وجود سعر مخصص لتركيبة (الفئة + البودي)
            const typeOverride = typePricing.find(p => p.truck_category_id === form.truck_category && p.body_type_id === form.body_type && p.is_active !== false);

            // تحديد "السعر الأساسي": إما من المسار المخصص أو من إعدادات الفئة أو الدرج الأساسي (Fallback)
            const typeBasePrice = (typeOverride?.base_price && typeOverride.base_price > 0) ? typeOverride.base_price : 0;
            const defaultKmPrice = roundedDistance <= (pricingConfig.short_distance_limit || 100)
              ? (pricingConfig.short_distance_price || 5)
              : (pricingConfig.long_distance_limit ? pricingConfig.long_distance_price : (pricingConfig.short_distance_price || 3));

            // إذا لم يوجد سعر فئة أو سعر مسار، نعتمد على سعر الكيلومتر من المحرك الأساسي (الدرج الأول)
            const basePrice = (route?.manual_price && route.manual_price > 0)
              ? route.manual_price
              : typeBasePrice;

            // تحديد "سعر الكيلو": من إعدادات الفئة أو من المحرك الأساسي (الافتراضي)
            const kmPrice = (typeOverride?.price_per_km && typeOverride.price_per_km > 0)
              ? typeOverride.price_per_km
              : defaultKmPrice;

            const minPrice = typeOverride?.min_price || 0;

            // الحسبة النهائية
            let calculated = basePrice + (roundedDistance * kmPrice);
            suggestedPrice = Math.max(calculated, minPrice);

            console.log(`🚛 Applied Pricing: Base:${basePrice} + (Dist:${roundedDistance} * Rate:${kmPrice}) = ${calculated}, Final Max(Calc, Min:${minPrice}) = ${suggestedPrice} SAR`);

            suggestedPrice = Math.round(suggestedPrice);
            setDistance(roundedDistance);

            // تحديث تفاصيل السعر للعرض (إضافة العمولة)
            const commission = suggestedPrice * (pricingConfig.commission / 100);
            const priceWithCommission = suggestedPrice + commission;
            const vat = priceWithCommission * (pricingConfig.vat_rate / 100);

            setPriceBreakdown({
              base: basePrice,
              kmRate: kmPrice,
              distanceCost: roundedDistance * kmPrice,
              commission: commission,
              vat: vat,
              total: priceWithCommission + vat,
              baseRaw: suggestedPrice
            } as any);

            setForm(p => ({ ...p, price: Math.round(priceWithCommission).toString() }));
          } catch (err) {
            console.error("Error applying pricing:", err);
            // Fallback to basic calculation
            const roundedDist = Math.round(dist);
            const kmRate = roundedDist <= pricingConfig.short_distance_limit ? pricingConfig.short_distance_price : pricingConfig.long_distance_price;
            const fallbackPrice = roundedDist * kmRate;

            const fallbackCommission = fallbackPrice * (pricingConfig.commission / 100);
            const fallbackPriceWithComm = fallbackPrice + fallbackCommission;
            const fallbackVat = fallbackPriceWithComm * (pricingConfig.vat_rate / 100);

            setPriceBreakdown({
              base: 0,
              kmRate: kmRate,
              distanceCost: fallbackPrice,
              commission: fallbackCommission,
              vat: fallbackVat,
              total: fallbackPriceWithComm + fallbackVat,
              baseRaw: fallbackPrice
            } as any);

            setDistance(roundedDist);
            setForm(p => ({ ...p, price: Math.round(fallbackPriceWithComm).toString() }));
          }
        };

        applyPricing();
      } else {
        setDistance(null);
      }
    } else {
      setDistance(null);
    }
  }, [form.origin, form.destination, form.truck_category, form.body_type]); // Removed pricingConfig and typePricing from deps to prevent infinite loops

  const nextStep = () => { if (step < totalSteps) setStep(step + 1); };
  const prevStep = () => { if (step > 1) setStep(step - 1); };

  const isCurrentStepValid = () => {
    if (step === 1) return form.origin !== '' && form.destination !== '' && form.pickup_date !== '';
    if (step === 2) {
      const basicValid = form.truck_category !== '' && form.body_type !== '' && (form.weight !== '' || form.qty !== '') && form.package_type !== '';
      return basicValid && !isWeightConflict;
    }
    if (step === 3) return form.receiver_name !== '' && form.receiver_phone.length >= 8;
    if (step === 4) return form.price !== '' && parseFloat(form.price) > 0;
    return false;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step !== totalSteps) {
      if (isCurrentStepValid()) nextStep();
      return;
    }

    if (!userProfile?.id) {
      toast.error("يرجى تسجيل الدخول أولاً");
      return;
    }

    setLoading(true);
    try {
      let phone = form.receiver_phone.trim();
      if (phone.startsWith('0')) phone = phone.substring(1);

      const selectedTruck = truckCategories.find(c => c.id === form.truck_category);
      const selectedBody = bodyTypes.find(b => b.id === form.body_type);
      const selectedCommodity = commodities.find(c => c.id === form.commodity_id);

      // Mapping Arabic names to DB Enums (to avoid "invalid input value for enum")
      const truckTypeMap: Record<string, any> = {
        'تريلا': 'trella',
        'تريلا ستارة': 'trella',
        'تريلا مبردة': 'refrigerated',
        'لوري': 'lorry',
        'دينا': 'dyna',
        'بيك اب': 'pickup',
        'وانيت': 'pickup',
        'صهريج': 'tanker',
        'سطحة': 'flatbed',
        'كونتينر': 'container'
      };

      const bodyTypeMap: Record<string, any> = {
        'سطحة': 'flatbed',
        'ستارة': 'curtain',
        'صندوق': 'box',
        'ثلاجة': 'refrigerated',
        'جوانب': 'curtain',
        'لوبد': 'lowboy',
        'تانك': 'tank',
        'خزان': 'tank'
      };

      const dbTruckType = truckTypeMap[selectedTruck?.name_ar || ''] || 'trella';
      const dbBodyType = bodyTypeMap[selectedBody?.name_ar || ''] || 'flatbed';
      const dbShipmentType = selectedCommodity?.name_ar || 'other';

      // حساب السعر النهائي المحمل بالضريبة للتخزين في القاعدة
      const basePrice = parseSafeNumber(form.price);
      const vatAmount = basePrice * (pricingConfig.vat_rate / 100);
      const totalGrossPrice = Math.round(basePrice + vatAmount);

      const finalPayload = {
        origin: form.origin,
        destination: form.destination,
        weight: parseSafeNumber(form.weight),
        price: totalGrossPrice,
        package_type: form.package_type,
        pickup_date: form.pickup_date,
        body_type: dbBodyType,
        receiver_name: form.receiver_name,
        receiver_phone: '+966' + phone,
        status: 'available',
        truck_type_required: dbTruckType,
        description: `شحنة من ${form.origin} إلى ${form.destination}`,
        quantity: parseSafeNumber(form.qty),
        unit: form.unit,
        goods_value: parseSafeNumber(form.goods_value),
        insurance_value: parseSafeNumber(form.insurance_value),
        payment_method: form.payment_method,
        type: dbShipmentType
      };

      await api.postLoad(finalPayload, userProfile.id);
      toast.success("تم نشر الشحنة بنجاح ✅");
      navigate('/shipper/dashboard');
    } catch (err: any) {
      toast.error(`فشل النشر: ${err.message || "حدث خطأ غير متوقع"}`);
    } finally {
      setLoading(false);
    }
  };

  if (!AppLayout) return <div>Loading Layout...</div>;

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto pb-10 pt-4 px-4">
        {/* Step Indicator */}
        <div className="mb-8 relative">
          <div className="flex items-center justify-between mb-2 absolute w-full top-6 z-0 px-8">
            <div className={`h-1 flex-1 rounded-full transition-all duration-500 ${step >= 2 ? 'bg-primary' : 'bg-slate-200'}`}></div>
            <div className={`h-1 flex-1 rounded-full transition-all duration-500 ${step >= 3 ? 'bg-primary' : 'bg-slate-200'} mx-2`}></div>
            <div className={`h-1 flex-1 rounded-full transition-all duration-500 ${step >= 4 ? 'bg-primary' : 'bg-slate-200'}`}></div>
          </div>
          <div className="flex justify-between relative z-10">
            {[1, 2, 3, 4].map((indicator) => (
              <div key={indicator} className="flex flex-col items-center gap-2">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-black transition-all duration-500 flex-shrink-0 ${step === indicator ? 'bg-primary text-white scale-110 shadow-lg border-4 border-white' : step > indicator ? 'bg-emerald-500 text-white border-4 border-white' : 'bg-white text-slate-400 border-4 border-slate-100'}`}>
                  {step > indicator ? <CheckCircle2 size={24} /> : indicator}
                </div>
              </div>
            ))}
          </div>
        </div>

        <Card className="rounded-[2.5rem] shadow-xl border-none overflow-hidden bg-white">
          <CardHeader className="bg-slate-50 border-b p-8 text-center">
            <CardTitle className="text-2xl font-black text-slate-800">
              {step === 1 ? 'حدد مسار الرحلة' : step === 2 ? 'تفاصيل الحمولة' : step === 3 ? 'بيانات المستلم' : 'التسعير والنشر'}
            </CardTitle>
          </CardHeader>

          <CardContent className="p-8 md:p-12">
            <form onSubmit={handleSubmit}>
              <AnimatePresence mode="wait">
                <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>

                  {step === 1 && (
                    <div className="space-y-8">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                          <Label className="font-bold flex items-center gap-2"><MapPin size={18} className="text-primary" /> من</Label>
                          <Popover open={openOrigin} onOpenChange={setOpenOrigin}>
                            <PopoverTrigger asChild>
                              <Button variant="outline" className="w-full h-16 rounded-2xl font-bold justify-between">{form.origin || "اختر المدينة"}</Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[300px] p-0 rounded-2xl overflow-hidden shadow-2xl border-none">
                              <Command>
                                <div className="p-2 border-b bg-slate-50 flex items-center justify-between">
                                  <span className="text-[10px] font-black text-slate-400 mr-2">العناوين المقترحة</span>
                                  <Button variant="ghost" size="sm" onClick={() => navigate('/shipper/locations')} className="text-[10px] h-6 text-primary">+ إضافة جديد</Button>
                                </div>
                                <CommandList>
                                  {savedLocations.length > 0 && (
                                    <CommandGroup heading="المواقع المحفوظة">
                                      {savedLocations.map(loc => (
                                        <CommandItem key={loc.id} onSelect={() => { setForm(p => ({ ...p, origin: loc.address_details })); setOpenOrigin(false); }}>
                                          <div className="flex items-center gap-2">
                                            <Warehouse size={14} className="text-rose-500" />
                                            <div className="flex flex-col">
                                              <span className="font-bold text-xs">{loc.location_name}</span>
                                              <span className="text-[10px] text-slate-400 line-clamp-1">{loc.address_details}</span>
                                            </div>
                                          </div>
                                        </CommandItem>
                                      ))}
                                    </CommandGroup>
                                  )}
                                  <CommandGroup heading="المدن الرئيسية">
                                    {SAUDI_CITIES.map(c => (
                                      <CommandItem key={c.value} onSelect={() => { setForm(p => ({ ...p, origin: c.label })); setOpenOrigin(false); }}>{c.label}</CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                        </div>
                        <div className="space-y-3">
                          <Label className="font-bold flex items-center gap-2"><MapPin size={18} className="text-emerald-500" /> إلى</Label>
                          <Popover open={openDest} onOpenChange={setOpenDest}>
                            <PopoverTrigger asChild>
                              <Button variant="outline" className="w-full h-16 rounded-2xl font-bold justify-between">{form.destination || "اختر المدينة"}</Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[300px] p-0 rounded-2xl overflow-hidden shadow-2xl border-none">
                              <Command>
                                <div className="p-2 border-b bg-slate-50 flex items-center justify-between">
                                  <span className="text-[10px] font-black text-slate-400 mr-2">العناوين المقترحة</span>
                                  <Button variant="ghost" size="sm" onClick={() => navigate('/shipper/locations')} className="text-[10px] h-6 text-primary">+ إضافة جديد</Button>
                                </div>
                                <CommandList>
                                  {savedLocations.length > 0 && (
                                    <CommandGroup heading="المواقع المحفوظة">
                                      {savedLocations.map(loc => (
                                        <CommandItem key={loc.id} onSelect={() => { setForm(p => ({ ...p, destination: loc.address_details })); setOpenDest(false); }}>
                                          <div className="flex items-center gap-2">
                                            <Warehouse size={14} className="text-rose-500" />
                                            <div className="flex flex-col">
                                              <span className="font-bold text-xs">{loc.location_name}</span>
                                              <span className="text-[10px] text-slate-400 line-clamp-1">{loc.address_details}</span>
                                            </div>
                                          </div>
                                        </CommandItem>
                                      ))}
                                    </CommandGroup>
                                  )}
                                  <CommandGroup heading="المدن الرئيسية">
                                    {SAUDI_CITIES.map(c => (
                                      <CommandItem key={c.value} onSelect={() => { setForm(p => ({ ...p, destination: c.label })); setOpenDest(false); }}>{c.label}</CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>

                      {distance && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="bg-emerald-50 p-6 rounded-3xl border-2 border-emerald-100 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-emerald-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                              <NavIcon className="animate-pulse" size={24} />
                            </div>
                            <div>
                              <p className="text-emerald-800 font-black text-lg">المسافة المحسوبة: {Math.round(distance)} كم</p>
                              <p className="text-emerald-600 text-xs font-bold">بناءً على المسار الفعلي بين المدينتين</p>
                            </div>
                          </div>
                          <div className="text-left">
                            <p className="text-emerald-500 text-[10px] font-black uppercase tracking-wider">السعر التقديري</p>
                            <p className="text-2xl font-black text-emerald-700">{form.price || 0} <span className="text-xs">ر.س</span></p>
                          </div>
                        </motion.div>
                      )}

                      <div className="space-y-3">
                        <Label className="font-bold flex items-center gap-2"><Calendar size={18} /> موعد التحميل</Label>
                        <Input type="date" value={form.pickup_date} min={today} onChange={e => setForm(p => ({ ...p, pickup_date: e.target.value }))} className="h-16 rounded-2xl" />
                      </div>
                    </div>
                  )}

                  {step === 2 && (
                    <div className="space-y-12">
                      {/* Section 1: Weight & Product Selection (Now First) */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-8 border-b">
                        <div className="space-y-4">
                          <Label className="text-lg font-black text-slate-700">الوزن بالطن</Label>
                          <div className="space-y-2">
                            <Input
                              type="number"
                              min="0"
                              value={form.weight}
                              onChange={e => setForm(p => ({ ...p, weight: e.target.value }))}
                              className={cn(
                                "h-16 rounded-2xl transition-all duration-300",
                                isWeightConflict ? "border-rose-400 focus:ring-rose-200 bg-rose-50/5 text-rose-600 font-black" : (form.weight ? "border-emerald-400 bg-emerald-50/5" : "")
                              )}
                              placeholder="0.0"
                            />
                            {isWeightConflict && (
                              <p className="text-[10px] font-black text-rose-500 mr-2 flex items-center gap-1">
                                <Info size={12} /> الوزن يتجاوز سعة الشاحنة المختارة
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="space-y-4">
                          <Label className="text-lg font-black text-slate-700">نوع البضاعة / المنتج</Label>
                          <Popover open={openProduct} onOpenChange={setOpenProduct}>
                            <PopoverTrigger asChild>
                              <Button variant="outline" className="w-full h-16 rounded-2xl font-bold justify-between">
                                {form.package_type || "اختر المنتج"}
                                <Search size={18} className="text-slate-400" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[300px] p-0 rounded-2xl overflow-hidden shadow-2xl border-none">
                              <Command>
                                <div className="p-2 border-b bg-slate-50 flex items-center justify-between">
                                  <span className="text-[10px] font-black text-slate-400 mr-2">منتجاتك المسجلة</span>
                                  <Button variant="ghost" size="sm" onClick={() => navigate('/shipper/products')} className="text-[10px] h-6 text-primary">+ إضافة جديد</Button>
                                </div>
                                <CommandList>
                                  {products.length > 0 ? (
                                    <CommandGroup>
                                      {products.map(p => (
                                        <CommandItem key={p.id} onSelect={() => {
                                          setForm(prev => ({
                                            ...prev,
                                            package_type: p.name,
                                            unit: p.unit || ''
                                          }));
                                          setOpenProduct(false);
                                        }}>
                                          <div className="flex items-center gap-2">
                                            <Package size={14} className="text-blue-500" />
                                            <span className="font-bold text-xs">{p.name}</span>
                                          </div>
                                        </CommandItem>
                                      ))}
                                    </CommandGroup>
                                  ) : (
                                    <div className="p-4 text-center text-xs text-slate-400 font-bold">لا يوجد منتجات محفوظة</div>
                                  )}
                                </CommandList>
                                <div className="p-2 border-t bg-slate-50">
                                  <Input
                                    placeholder="أو اكتب نوعاً جديداً..."
                                    className="h-9 text-xs"
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        setForm(prev => ({ ...prev, package_type: (e.target as HTMLInputElement).value }));
                                        setOpenProduct(false);
                                      }
                                    }}
                                  />
                                </div>
                              </Command>
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>

                      {/* Section 1.5: Quantity, Unit, Goods Value, Insurance */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-8 border-b border-t border-slate-100 pt-8 mt-8">
                        <div className="space-y-3">
                          <Label className="font-bold text-slate-700">الكمية (العدد)</Label>
                          <Input type="number" min="0" value={form.qty} onChange={e => setForm(p => ({ ...p, qty: e.target.value }))} className="h-16 rounded-2xl" placeholder="مثال: 50" />
                        </div>
                        <div className="space-y-3">
                          <Label className="font-bold text-slate-700">الوحدة</Label>
                          <Input value={form.unit} onChange={e => setForm(p => ({ ...p, unit: e.target.value }))} className="h-16 rounded-2xl" placeholder="مثال: كرتون، حبة، طبلية" />
                        </div>
                        <div className="space-y-3">
                          <Label className="font-bold text-slate-700">قيمة البضاعة (ر.س)</Label>
                          <Input type="number" min="0" value={form.goods_value} onChange={e => setForm(p => ({ ...p, goods_value: e.target.value }))} className="h-16 rounded-2xl" placeholder="مثال: 10000" />
                        </div>
                        <div className="space-y-3">
                          <Label className="font-bold text-slate-700">التأمين على الشحنة (ر.س)</Label>
                          <Input type="number" min="0" value={form.insurance_value} onChange={e => setForm(p => ({ ...p, insurance_value: e.target.value }))} className="h-16 rounded-2xl" placeholder="مثال: 150 (اختياري)" />
                        </div>
                      </div>

                      {/* Section 2: Truck Category Selection (Conditional on Weight) */}
                      <AnimatePresence>
                        {form.weight && parseFloat(form.weight) > 0 && (
                          <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="space-y-12"
                          >
                            <div className="space-y-6">
                              <Label className="text-xl font-black text-slate-800 flex items-center gap-3">
                                <Truck className="text-primary" size={24} />
                                اختر حجم الشاحنة المناسب
                              </Label>
                              <TypeSelectorGrid
                                items={truckCategories}
                                selectedValue={form.truck_category}
                                onSelect={(id) => setForm(p => ({ ...p, truck_category: id, body_type: '' }))}
                                emptyMessage="لا يوجد فئات متاحة حالياً"
                                variant="large-horizontal"
                                unsuitableIds={unsuitableTruckCategoryIds}
                              />
                            </div>

                            {/* Section 3: Detailed Body Type Selection */}
                            <AnimatePresence>
                              {form.truck_category && (
                                <motion.div
                                  initial={{ opacity: 0, y: 20 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -10 }}
                                  className="space-y-6"
                                >
                                  <Label className="text-xl font-black text-slate-800 flex items-center gap-3">
                                    <span className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                                      <Star size={20} />
                                    </span>
                                    حدد نوع وتفاصيل الشاحنة
                                  </Label>

                                  <DetailedTypeSelector
                                    items={filteredBodyTypes}
                                    selectedValue={form.body_type}
                                    onSelect={(id) => setForm(p => ({ ...p, body_type: id }))}
                                    unsuitableIds={unsuitableBodyTypeIds}
                                  />

                                  <AnimatePresence>
                                    {isWeightConflict && (
                                      <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="bg-rose-50 border-2 border-rose-100 p-4 rounded-2xl flex items-center gap-3 text-rose-600 animate-pulse"
                                      >
                                        <Info size={20} />
                                        <div className="flex-1">
                                          <p className="font-black text-sm text-right">عفواً، الوزن المحدد ({form.weight} طن) أكبر من سعة هذه الشاحنة!</p>
                                          <p className="text-[10px] font-bold text-right">برجاء اختيار شاحنة أكبر أو تقليل الوزن.</p>
                                        </div>
                                      </motion.div>
                                    )}
                                  </AnimatePresence>

                                  {form.body_type && (
                                    <motion.div
                                      initial={{ opacity: 0, scale: 0.95 }}
                                      animate={{ opacity: 1, scale: 1 }}
                                      className="bg-primary/5 p-4 rounded-3xl border border-primary/10 flex items-center justify-between"
                                    >
                                      <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-primary/10 text-primary rounded-2xl flex items-center justify-center">
                                          <Activity size={20} />
                                        </div>
                                        <div>
                                          <p className="text-primary font-black">السعر التقديري لهذا المحمل</p>
                                          <p className="text-[10px] text-slate-500 font-bold">بناءً على المسار والمسافة المقطوعة</p>
                                        </div>
                                      </div>
                                      <div className="text-left">
                                        <p className="text-2xl font-black text-primary">{form.price || 0} <span className="text-xs">ر.س</span></p>
                                      </div>
                                    </motion.div>
                                  )}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  {step === 3 && (
                    <div className="space-y-6">
                      <div className="space-y-4">
                        <Label className="font-bold">اسم المستلم</Label>
                        <Popover open={openReceiver} onOpenChange={setOpenReceiver}>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full h-16 rounded-2xl font-bold justify-between">
                              {form.receiver_name || "اختر المستلم"}
                              <User size={18} className="text-slate-400" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[300px] p-0 rounded-2xl overflow-hidden shadow-2xl border-none">
                            <Command>
                              <div className="p-2 border-b bg-slate-50 flex items-center justify-between">
                                <span className="text-[10px] font-black text-slate-400 mr-2">قائمة المستلمين المعتمدين</span>
                                <Button variant="ghost" size="sm" onClick={() => navigate('/shipper/receivers')} className="text-[10px] h-6 text-primary">+ إضافة جديد</Button>
                              </div>
                              <CommandList>
                                {receivers.length > 0 ? (
                                  <CommandGroup>
                                    {receivers.map(r => (
                                      <CommandItem key={r.id} onSelect={() => {
                                        setForm(prev => ({
                                          ...prev,
                                          receiver_name: r.name,
                                          receiver_phone: r.phone || ''
                                        }));
                                        setOpenReceiver(false);
                                      }}>
                                        <div className="flex items-center gap-2">
                                          <User size={14} className="text-emerald-500" />
                                          <div className="flex flex-col">
                                            <span className="font-bold text-xs">{r.name}</span>
                                            <span className="text-[10px] text-slate-400">{r.phone}</span>
                                          </div>
                                        </div>
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                ) : (
                                  <div className="p-4 text-center text-xs text-slate-400 font-bold">لا يوجد مستلمين محفوظين</div>
                                )}
                              </CommandList>
                              <div className="p-2 border-t bg-slate-50">
                                <Input
                                  placeholder="أو اكتب اسماً جديداً..."
                                  className="h-9 text-xs"
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      setForm(prev => ({ ...prev, receiver_name: (e.target as HTMLInputElement).value }));
                                      setOpenReceiver(false);
                                    }
                                  }}
                                />
                              </div>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div className="space-y-4">
                        <Label className="font-bold">رقم جوال المستلم</Label>
                        <Input value={form.receiver_phone} onChange={e => setForm(p => ({ ...p, receiver_phone: e.target.value }))} className="h-16 rounded-2xl" placeholder="5xxxxxxxx" />
                      </div>
                    </div>
                  )}

                  {step === 4 && (
                    <div className="space-y-8 max-w-lg mx-auto">
                      {/* ملخص المسافة والتحليلات */}
                      <div className="bg-blue-50/50 p-6 rounded-[2rem] border border-blue-100/50 text-center animate-in fade-in slide-in-from-bottom-2">
                        <p className="text-blue-600 font-bold text-sm mb-1">المسافة المقدرة للرحلة</p>
                        <div className="flex items-center justify-center gap-2">
                          <span className="text-3xl font-black text-blue-700">{Math.round(distance || 0)}</span>
                          <span className="text-lg font-bold text-blue-500">كم</span>
                        </div>
                      </div>

                      {/* تفصيل السعر والضريبة - تصميم فاخر مستوحى من اللوجستيات الذكية */}
                      <Card className="rounded-[2.5rem] border-none shadow-2xl bg-[#0f172a] text-white overflow-hidden animate-in zoom-in-95 duration-500">
                        <CardHeader className="bg-white/5 border-b border-white/10 p-8">
                          <CardTitle className="text-xl font-black text-center flex items-center justify-center gap-3">
                            <Activity className="text-amber-400" size={20} />
                            تفاصيل السعر والضريبة
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-8 space-y-6">
                          <div className="space-y-4">
                            {priceBreakdown.base > 0 && (
                              <div className="flex justify-between items-center pb-4 border-b border-white/5">
                                <span className="text-slate-400 font-bold text-sm">السعر الأساسي</span>
                                <span className="text-lg font-black text-white">{priceBreakdown.base.toLocaleString()} <span className="text-[10px]">ر.س</span></span>
                              </div>
                            )}

                            {priceBreakdown.kmRate > 0 && (
                              <div className="flex justify-between items-center pb-4 border-b border-white/5">
                                <div className="flex flex-col">
                                  <span className="text-slate-400 font-bold text-sm">تكلفة المسافة</span>
                                  <span className="text-[10px] text-blue-400 font-bold">{Math.round(distance || 0)} كم × {priceBreakdown.kmRate} ر.س</span>
                                </div>
                                <span className="text-lg font-black text-white">{Math.round(priceBreakdown.distanceCost || 0).toLocaleString()} <span className="text-[10px]">ر.س</span></span>
                              </div>
                            )}

                            <div className="flex justify-between items-center pb-4 border-b border-white/5">
                              <span className="text-slate-400 font-bold text-sm">عمولة المنصة ({pricingConfig.commission}%)</span>
                              <span className="text-lg font-black text-amber-500">+{Math.round((priceBreakdown as any).commission || 0).toLocaleString()} <span className="text-[10px]">ر.س</span></span>
                            </div>

                            <div className="flex justify-between items-center pb-4 border-b border-white/10">
                              <span className="text-slate-400 font-bold text-sm">ضريبة القيمة المضافة ({pricingConfig.vat_rate}%)</span>
                              <span className="text-lg font-black text-rose-400">{Math.round(priceBreakdown.vat).toLocaleString()} <span className="text-[10px]">ر.س</span></span>
                            </div>

                            <div className="flex justify-between items-center pt-2">
                              <div className="flex flex-col">
                                <span className="text-amber-400 font-black text-lg">الإجمالي النهائي</span>
                                <span className="text-[10px] text-slate-500 font-bold">شامل الضريبة</span>
                              </div>
                              <div className="text-right">
                                <span className="text-4xl font-black text-white">{Math.round(priceBreakdown.total).toLocaleString()}</span>
                                <span className="text-xs text-white mr-1">ر.س</span>
                              </div>
                            </div>
                          </div>

                          <div className="pt-6 border-t border-white/10 space-y-4">
                            <Label className="font-bold text-slate-300 text-xs block mb-1">طريقة الدفع للمندوب</Label>
                            <Select value={form.payment_method} onValueChange={val => setForm(p => ({ ...p, payment_method: val }))}>
                              <SelectTrigger className="h-14 rounded-2xl bg-white/10 border-white/10 font-bold text-white transition-all hover:bg-white/20">
                                <SelectValue placeholder="اختر طريقة الدفع" />
                              </SelectTrigger>
                              <SelectContent className="rounded-xl font-bold">
                                <SelectItem value="الدفع عند الاستلام">الدفع عند الاستلام</SelectItem>
                                <SelectItem value="تحويل بنكي">تحويل بنكي</SelectItem>
                                <SelectItem value="محفظة SAS">محفظة SAS</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </CardContent>
                      </Card>

                      <p className="text-center text-[10px] text-slate-400 font-bold px-10">
                        * السعر أعلاه هو السعر الإجمالي الذي سيدفعه الشاحن، شاملاً كافة الرسوم والضرائب الحكومية المطبقة.
                      </p>
                    </div>
                  )}

                </motion.div>
              </AnimatePresence>

              <div className="flex items-center justify-between mt-12 pt-6 border-t">
                <Button type="button" variant="ghost" onClick={prevStep} className={`h-14 px-6 font-bold ${step === 1 ? 'invisible' : ''}`}><ChevronRight className="ml-2" /> رجوع</Button>
                <Button type="submit" disabled={loading || !isCurrentStepValid()} className={`h-14 px-10 rounded-xl font-black text-lg ${step === totalSteps ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-primary'}`}>
                  {loading ? <Loader2 className="animate-spin text-white" /> : step === totalSteps ? "نشر الشحنة الآن" : "التالي"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}