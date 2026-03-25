import { supabase } from './src/integrations/supabase/client';

async function checkUser() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .or('phone.eq.2642546264,phone.eq.02642546264')
    .maybeSingle();
  
  if (error) {
    console.error("❌ User check failed:", error.message);
  } else if (!data) {
    console.log("⚠️ No user found with identifier 2642546264");
    
    // لنحاول جلب أي مستخدم لرؤية شكل البيانات
    const { data: recent } = await supabase.from('profiles').select('*').limit(1);
    console.log("Sample Profile:", recent);
  } else {
    console.log("✅ User found:", JSON.stringify(data, null, 2));
  }
}

checkUser();
