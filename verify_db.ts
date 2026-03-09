import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY!);

async function checkData() {
    const { data: cats, error: err1 } = await supabase.from('truck_categories').select('id, name_ar');
    const { data: bodies, error: err2 } = await supabase.from('load_body_types').select('id, name_ar, category_id');

    console.log("Categories:", cats?.slice(0, 5));
    console.log("Bodies:", bodies?.slice(0, 5));
    console.log("Bodies without category:", bodies?.filter(b => !b.category_id).length);

    // Check Trella
    const trella = cats?.find(c => c.name_ar === 'تريلا');
    if (trella) {
        console.log("Trella body types:", bodies?.filter(b => b.category_id === trella.id).map(b => b.name_ar));
    }
}

checkData();
