export type UserRole = 'driver' | 'shipper' | 'super_admin' | 'operations' | 'carrier_manager' | 'support' | 'finance' | 'analytics';
export type LoadStatus = 'available' | 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type TruckType = 'trella' | 'lorry' | 'dyna' | 'pickup' | 'refrigerated' | 'tanker' | 'flatbed' | 'container';
export type TrailerType = 'flatbed' | 'curtain' | 'box' | 'refrigerated' | 'lowboy' | 'tank';
export type TruckDimensions = 'small' | 'medium' | 'large' | 'extra_large';
export type BodyType = 'flatbed' | 'curtain' | 'box' | 'refrigerated' | 'lowboy' | 'tank';

export interface UserProfile {
  id: string;
  full_name: string;
  email?: string;
  phone?: string;
  country_code?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
  // --- حقول الموقع الحي المضافة ---
  latitude?: number;
  longitude?: number;
  last_seen_at?: string;
  user_roles?: { role: UserRole }[];
}

export interface Load {
  id: string;
  owner_id: string;
  driver_id?: string;
  type: string;
  package_type?: string;
  origin: string;
  destination: string;
  origin_lat?: number;
  origin_lng?: number;
  dest_lat?: number;
  dest_lng?: number;
  pickup_date?: string;
  weight: number;
  price: number;
  distance: number;
  estimated_time?: string;
  description?: string;
  truck_type_required?: TruckType;
  truck_size?: string;
  body_type?: BodyType;
  receiver_name?: string;
  receiver_phone?: string;
  receiver_address?: string;
  status: LoadStatus;
  created_at: string;
  updated_at: string;
  owner?: { full_name: string; phone: string; avatar_url?: string; };
  driver?: { full_name: string; phone: string; avatar_url?: string; };
  profiles?: { full_name: string; phone: string };
}

export interface Truck {
  id: string;
  owner_id: string;
  plate_number: string;
  brand?: string;
  model_year?: string;
  truck_type?: TruckType;
  capacity?: string;
  created_at: string;
}

export interface SubDriver {
  id: string;
  carrier_id: string;
  driver_name: string;
  driver_phone?: string;
  id_number?: string;
  license_number?: string;
  assigned_truck_id?: string;
  created_at: string;
}

export interface AdminStats {
  totalUsers: number;
  totalDrivers: number;
  totalShippers: number;
  activeLoads: number;
  completedTrips: number;
}

export interface TruckTypeInfo { id: string; nameAr: string; icon: string; }
export interface TrailerTypeInfo { id: string; nameAr: string; icon: string; }
export interface DimensionInfo { id: string; nameAr: string; specs: string; }

export interface Driver {
  id: string;
  full_name: string;
  phone: string;
  avatar_url?: string;
  truckType?: TruckType;
  rating?: number;
  completedTrips?: number;
  isAvailable?: boolean;
  currentCity?: string;
  latitude?: number; // مضاف للتتبع
  longitude?: number; // مضاف للتتبع
}
