
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function checkData() {
    const { data: cats } = await supabase.from('truck_categories').select('*');
    const { data: bodies } = await supabase.from('load_body_types').select('*');

    console.log('--- Categories ---');
    console.table(cats?.map(c => ({ id: c.id, name: c.name_ar, active: c.is_active })));

    console.log('--- Body Types ---');
    console.table(bodies?.map(b => ({ id: b.id, name: b.name_ar, cat_id: b.category_id, active: b.is_active })));
}

checkData();
