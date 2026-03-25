import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

function getEnv() {
  const envPath = path.join(process.cwd(), '.env');
  const content = fs.readFileSync(envPath, 'utf8');
  const env: Record<string, string> = {};
  content.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const value = parts.slice(1).join('=').trim();
      env[key] = value;
    }
  });
  return env;
}

const env = getEnv();
const supabaseUrl = env['VITE_SUPABASE_URL'];
const supabaseKey = env['VITE_SUPABASE_ANON_KEY'];

console.log("Supabase URL Length:", supabaseUrl?.length);

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
      persistSession: false
  }
});

async function checkUser(id: string) {
  const cleanId = id.trim();
  
  console.log(`🔍 Searching for identifiers related to: ${cleanId}`);
  
  try {
    const { data: results, error } = await supabase
      .from('profiles')
      .select('*')
      .or(`email.eq.${cleanId},username.ilike.${cleanId},phone.ilike.%${cleanId}%`)
      .limit(5);
    
    if (error) {
      console.error("❌ Error:", error.message);
    } else if (!results || results.length === 0) {
      console.log("⚠️ No profiles found matching your search.");
    } else {
      console.log(`✅ Found ${results.length} matches:`);
      results.forEach(p => {
        console.log(`- [${p.id}] Username: "${p.username}", Email: "${p.email}", Phone: "${p.phone}", Name: "${p.full_name}"`);
      });
    }
  } catch (e: any) {
    console.error("❌ Exception:", e.message);
  }
}

checkUser(process.argv[2] || 'naserefox@gmail.com');
