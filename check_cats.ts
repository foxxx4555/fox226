import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_KEY || process.env.VITE_SUPABASE_ANON_KEY!);

async function checkData() {
    const { data: cats, error: err1 } = await supabase.from('truck_categories').select('id, name_ar');
    console.log("Categories in DB:");
    cats?.forEach(c => console.log(`'${c.name_ar}'`, c.id));
}

checkData();
