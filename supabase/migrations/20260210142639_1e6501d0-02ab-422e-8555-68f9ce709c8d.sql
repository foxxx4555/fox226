
-- Create roles enum
CREATE TYPE public.app_role AS ENUM ('admin', 'driver', 'shipper');

-- Create load status enum
CREATE TYPE public.load_status AS ENUM ('available', 'pending', 'in_progress', 'completed', 'cancelled');

-- Create truck type enum
CREATE TYPE public.truck_type AS ENUM ('trella', 'lorry', 'dyna', 'pickup', 'refrigerated', 'tanker', 'flatbed', 'container');

-- Create body type enum
CREATE TYPE public.body_type AS ENUM ('flatbed', 'curtain', 'box', 'refrigerated', 'lowboy', 'tank');

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  country_code TEXT DEFAULT '+966',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Get user role function
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- Driver details table
CREATE TABLE public.driver_details (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  truck_type truck_type,
  body_type body_type,
  dimensions TEXT DEFAULT 'medium',
  plate_number TEXT,
  current_city TEXT,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.driver_details ENABLE ROW LEVEL SECURITY;

-- Trucks table
CREATE TABLE public.trucks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plate_number TEXT NOT NULL,
  brand TEXT,
  model_year TEXT,
  truck_type truck_type,
  capacity TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.trucks ENABLE ROW LEVEL SECURITY;

-- Sub drivers table
CREATE TABLE public.sub_drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  carrier_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  driver_name TEXT NOT NULL,
  driver_phone TEXT,
  id_number TEXT,
  license_number TEXT,
  assigned_truck_id UUID REFERENCES public.trucks(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.sub_drivers ENABLE ROW LEVEL SECURITY;

-- Loads table
CREATE TABLE public.loads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES auth.users(id),
  type TEXT DEFAULT 'general',
  package_type TEXT,
  origin TEXT NOT NULL,
  destination TEXT NOT NULL,
  origin_lat DOUBLE PRECISION,
  origin_lng DOUBLE PRECISION,
  dest_lat DOUBLE PRECISION,
  dest_lng DOUBLE PRECISION,
  pickup_date DATE,
  weight DECIMAL DEFAULT 0,
  price DECIMAL DEFAULT 0,
  distance DECIMAL DEFAULT 0,
  estimated_time TEXT,
  description TEXT,
  truck_type_required truck_type,
  truck_size TEXT,
  body_type body_type,
  receiver_name TEXT,
  receiver_phone TEXT,
  receiver_address TEXT,
  status load_status NOT NULL DEFAULT 'available',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.loads ENABLE ROW LEVEL SECURITY;

-- Load bids/offers table
CREATE TABLE public.load_bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  load_id UUID NOT NULL REFERENCES public.loads(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  price DECIMAL NOT NULL,
  message TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(load_id, driver_id)
);
ALTER TABLE public.load_bids ENABLE ROW LEVEL SECURITY;

-- Support tickets table
CREATE TABLE public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'open',
  priority TEXT DEFAULT 'medium',
  assigned_to UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- Products table (for shippers)
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT,
  unit TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Receivers table (for shippers)
CREATE TABLE public.receivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.receivers ENABLE ROW LEVEL SECURITY;

-- Ratings table
CREATE TABLE public.ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  load_id UUID REFERENCES public.loads(id),
  rated_by UUID NOT NULL REFERENCES auth.users(id),
  rated_user UUID NOT NULL REFERENCES auth.users(id),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_loads_updated_at BEFORE UPDATE ON public.loads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tickets_updated_at BEFORE UPDATE ON public.support_tickets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'phone', '')
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'shipper')
  );
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS Policies

-- Profiles
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- User roles
CREATE POLICY "Users can view own role" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Driver details
CREATE POLICY "Drivers can manage own details" ON public.driver_details FOR ALL USING (auth.uid() = id);
CREATE POLICY "Anyone can view driver details" ON public.driver_details FOR SELECT TO authenticated USING (true);

-- Trucks
CREATE POLICY "Owners can manage own trucks" ON public.trucks FOR ALL USING (auth.uid() = owner_id);
CREATE POLICY "Admins can view all trucks" ON public.trucks FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Sub drivers
CREATE POLICY "Carriers can manage own sub drivers" ON public.sub_drivers FOR ALL USING (auth.uid() = carrier_id);

-- Loads
CREATE POLICY "Anyone authenticated can view available loads" ON public.loads FOR SELECT TO authenticated USING (true);
CREATE POLICY "Shippers can create loads" ON public.loads FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners can update own loads" ON public.loads FOR UPDATE TO authenticated USING (auth.uid() = owner_id OR auth.uid() = driver_id);
CREATE POLICY "Admins can manage all loads" ON public.loads FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Load bids
CREATE POLICY "Drivers can create bids" ON public.load_bids FOR INSERT TO authenticated WITH CHECK (auth.uid() = driver_id);
CREATE POLICY "Users can view related bids" ON public.load_bids FOR SELECT TO authenticated USING (true);
CREATE POLICY "Drivers can update own bids" ON public.load_bids FOR UPDATE TO authenticated USING (auth.uid() = driver_id);

-- Support tickets
CREATE POLICY "Users can manage own tickets" ON public.support_tickets FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all tickets" ON public.support_tickets FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Products
CREATE POLICY "Owners can manage own products" ON public.products FOR ALL USING (auth.uid() = owner_id);

-- Receivers
CREATE POLICY "Owners can manage own receivers" ON public.receivers FOR ALL USING (auth.uid() = owner_id);

-- Ratings
CREATE POLICY "Authenticated can create ratings" ON public.ratings FOR INSERT TO authenticated WITH CHECK (auth.uid() = rated_by);
CREATE POLICY "Anyone can view ratings" ON public.ratings FOR SELECT TO authenticated USING (true);

-- Enable realtime for loads
ALTER PUBLICATION supabase_realtime ADD TABLE public.loads;
ALTER PUBLICATION supabase_realtime ADD TABLE public.load_bids;
