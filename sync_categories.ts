import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY!);

const mapping = [
    { cat: 'تريلا', capacity: 25, length: 13, types: ['جوانب', 'برادة', 'قلابة', 'صندوق مغلق', 'تانكي', 'لوبد'] },
    { cat: 'سكس', capacity: 13, length: 8, types: ['سطحة', 'ستارة', 'جوانب عالية', 'جوانب ألماني', 'برادة', 'جامبو', 'قلابة', 'صهريج', 'لوبد', 'مقطورة حاوية', 'مغلق'] },
    { cat: 'لوري', capacity: 8, length: 6, types: ['برادة', 'جوانب', 'شبك', 'صندوق مغلق', 'بونش', 'قلابة', 'تانكي'] },
    { cat: 'دينا', capacity: 4, length: 4, types: ['برادة - ثلاجة', 'صندوق مغلق', 'جوانب', 'شبك', 'سطحة', 'بونش', 'قلابة', 'تانكي'] },
    { cat: 'بيك اب', capacity: 1, length: 2.5, types: ['عادي', 'صندوق مغلق', 'ثلاجة'] },
    { cat: 'فان', capacity: 1, length: 3, types: ['صندوق مغلق', 'ثلاجة'] },
    { cat: 'ناقلة سيارات', capacity: 15, length: 18, types: ['سطحة سحب - ونش ريكفري', 'مغلقة - مقفل', 'مفتوحة ذات طابقين'] },
    { cat: 'معدات الثقيل', capacity: 30, length: 12, types: ['معدات تحريك التربة', 'معدات النقل ومناولة المواد', 'آلات بناء الطرق', 'معدات الرفع وأعمال الأساسات', 'معدات الخرسانة والخلط'] }
];

async function sync() {
    console.log("Fetching categories...");
    const { data: cats } = await supabase.from('truck_categories').select('id, name_ar');

    if (!cats) return console.error("No categories found");

    for (const group of mapping) {
        const cat = cats.find(c => c.name_ar === group.cat);
        if (!cat) {
            console.log(`Category not found: ${group.cat}`);
            continue;
        }

        for (const typeName of group.types) {
            // Check if exists
            const { data: existing } = await supabase.from('load_body_types')
                .select('id')
                .eq('category_id', cat.id)
                .eq('name_ar', typeName)
                .maybeSingle();

            if (existing) {
                // Update
                await supabase.from('load_body_types')
                    .update({ capacity_tons: group.capacity, length_meters: group.length, is_active: true })
                    .eq('id', existing.id);
            } else {
                // Insert
                await supabase.from('load_body_types')
                    .insert({
                        category_id: cat.id,
                        name_ar: typeName,
                        capacity_tons: group.capacity,
                        length_meters: group.length,
                        is_active: true
                    });
            }
        }
        console.log(`Synced ${group.cat} types.`);
    }

    // Deactivate other load body types that are not in the new mapping
    const { data: allBodies } = await supabase.from('load_body_types').select('id, name_ar, category_id');
    let deactivatedCount = 0;
    for (const body of (allBodies || [])) {
        const catName = cats.find(c => c.id === body.category_id)?.name_ar;
        const group = mapping.find(g => g.cat === catName);
        if (!group || !group.types.includes(body.name_ar)) {
            await supabase.from('load_body_types').update({ is_active: false }).eq('id', body.id);
            deactivatedCount++;
        }
    }
    console.log(`Disabled ${deactivatedCount} unused or old types.`);
    console.log("Done synchronizing database!");
}

sync();
