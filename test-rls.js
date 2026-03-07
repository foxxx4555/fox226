const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function checkRLS() {
    const env = fs.readFileSync('.env.local', 'utf-8');
    const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
    const anonKey = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

    // Create an anon client
    const supabase = createClient(url, anonKey);

    // Try to query loads without auth
    const { data, error } = await supabase.from('loads').select('id, status').limit(5);

    console.log('--- ANON QUERY ---');
    console.log({ data, error });

    process.exit(0);
}

checkRLS();
