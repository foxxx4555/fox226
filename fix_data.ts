import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY!);

async function fixData() {
    try {
        console.log("Fetching category IDs...");
        const { data: cats } = await supabase.from('truck_categories').select('id, name_ar');
        const carCarrier = cats?.find(c => c.name_ar === 'ناقلة سيارات');
        const heavyEquip = cats?.find(c => c.name_ar === 'معدات الثقيل');
        const trella = cats?.find(c => c.name_ar === 'تريلا');

        if (!carCarrier || !heavyEquip) {
            console.error("Categories not found!");
            return;
        }

        console.log("Fixing Car Carrier body types...");
        await supabase.from('load_body_types').update({ category_id: carCarrier.id, capacity_tons: 15, length_meters: 18 }).eq('name_ar', 'مفتوحة ذات طابقين');
        await supabase.from('load_body_types').update({ category_id: carCarrier.id, capacity_tons: 5, length_meters: 9 }).eq('name_ar', 'سطحة سحب (ونش ريكفري)');

        console.log("Fixing Heavy Equipment body types...");
        const heavyBodyTypes = ['معدات تحريك التربة', 'معدات النقل ومناولة المواد', 'آلات بناء الطرق', 'معدات الرفع وأعمال الأساسات', 'معدات الخرسانة والخلط'];
        await supabase.from('load_body_types').update({ category_id: heavyEquip.id, capacity_tons: 30, length_meters: 12 }).in('name_ar', heavyBodyTypes);
        await supabase.from('load_body_types').update({ category_id: heavyEquip.id, capacity_tons: 50, length_meters: 15 }).eq('name_ar', 'لوبد');

        console.log("Data linkage fixed successfully!");

        // Print confirmation
        const { data: fixedBodies } = await supabase.from('load_body_types').select('name_ar, category_id, capacity_tons').in('category_id', [carCarrier.id, heavyEquip.id]);
        console.table(fixedBodies);

    } catch (err) {
        console.error("Error:", err);
    }
}

fixData();
