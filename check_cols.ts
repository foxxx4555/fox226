import { supabase } from './src/integrations/supabase/client';

async function checkColumns() {
    const { data, error } = await supabase.from('profiles').select('*').limit(1);
    if (error) {
        console.error('Error selecting from profiles:', error);
        return;
    }
    if (data && data.length > 0) {
        console.log('Columns in profiles:', Object.keys(data[0]));
    } else {
        // If no rows, check table info
        const { data: cols, error: err } = await supabase.rpc('get_table_columns', { table_name: 'profiles' });
        if (err) {
            console.error('Error getting columns via RPC:', err);
        } else {
            console.log('Columns via RPC:', cols);
        }
    }
}

checkColumns();
