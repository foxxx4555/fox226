
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://puyugteuduuuvjijurjh.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1eXVndGV1ZHV1dXZqaWp1cmpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3MjMxMzMsImV4cCI6MjA4NTI5OTEzM30.wZpkRxuEt7aa4Qc5nxWLAAAVOski7qAJzHhjLvWhIvg';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function checkLoadStats() {
    const { data, error } = await supabase
        .from('loads')
        .select('status');

    if (error) {
        console.error('Error:', error);
        return;
    }

    const stats = data.reduce((acc, load) => {
        acc[load.status] = (acc[load.status] || 0) + 1;
        return acc;
    }, {});

    console.log('Load Status Statistics:');
    console.table(stats);

    const { data: allLoads } = await supabase.from('loads').select('*');
    console.log('All Loads:');
    console.table(allLoads);
}

checkLoadStats();
