
import { supabase } from './src/integrations/supabase/client';

async function checkColumn() {
  const { data, error } = await supabase
    .from('profiles')
    .select('username')
    .limit(1);
  
  if (error) {
    console.error("❌ Column check failed:", error.message);
  } else {
    console.log("✅ Column 'username' exists.");
  }
}

checkColumn();
