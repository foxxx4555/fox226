import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// استدعاء القيم من ملف البيئة .env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// تصدير نسخة واحدة ثابتة (Singleton) لمنع تحذير Multiple Instances
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
    // ملاحظة: إذا كنت في لوحة الأدمن وتضيف مستخدمين، 
    // يفضل التأكد من أن persistSession: true مفعلة فقط في تسجيل دخولك الأساسي
  }
});