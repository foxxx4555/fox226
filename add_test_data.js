
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://puyugteuduuuvjijurjh.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1eXVndGV1ZHV1dXZqaWp1cmpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3MjMxMzMsImV4cCI6MjA4NTI5OTEzM30.wZpkRxuEt7aa4Qc5nxWLAAAVOski7qAJzHhjLvWhIvg';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function addTestLoad() {
    const shipperId = '81ac6a69-2a07-453a-ae78-1cf1433ec651';

    const testLoad = {
        owner_id: shipperId,
        origin: 'الرياض',
        destination: 'جدة',
        package_type: 'مواد بناء',
        weight: 25,
        price: 1500,
        status: 'available',
        pickup_date: new Date().toISOString(),
        description: 'شحنة تجريبية للاختبار'
    };

    const { data, error } = await supabase
        .from('loads')
        .insert(testLoad)
        .select();

    if (error) {
        console.error('Error adding test load:', error);
        return;
    }

    console.log('Successfully added test load:', data[0].id);
}

addTestLoad();
