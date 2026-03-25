import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

import { _url, _key } from './secrets.js';

// استدعاء القيم من ملف الأسرار المشفر
const supabaseUrl = _url;
const supabaseAnonKey = _key;

// تصدير نسخة واحدة ثابتة (Singleton) لمنع تحذير Multiple Instances
// نستخدم window لضمان بقاء نسخة واحدة حتى مع إعادة التحميل أثناء التطوير (HMR)
const getSupabaseInstance = () => {
    const globalScope = typeof window !== 'undefined' ? window : global;
    const key = '_supabase_instance';
    
    if (!(globalScope as any)[key]) {
        (globalScope as any)[key] = createClient<Database>(supabaseUrl, supabaseAnonKey, {
            auth: {
                storage: localStorage,
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: true,
            }
        });
    }
    return (globalScope as any)[key];
};

export const supabase = getSupabaseInstance();