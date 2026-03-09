import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY!);

async function checkSchema() {
    const { data, error } = await supabase.rpc('get_columns_info', { table_name: 'financial_transactions' }).maybeSingle();
    // Alternative:
    const { data: qry, error: err } = await supabase.from('financial_transactions').select('*').limit(1);
    console.log("Columns:", qry && qry.length > 0 ? Object.keys(qry[0]) : "No data to infer schema from");
}

checkSchema();
