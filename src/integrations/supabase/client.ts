import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

import { _url, _key } from './secrets.js';

// استدعاء القيم من ملف الأسرار المشفر
const supabaseUrl = _url;
const supabaseAnonKey = _key;

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