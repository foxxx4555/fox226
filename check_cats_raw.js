const { createClient } = require('@supabase/supabase-js');

const supabase = createClient('https://puyugteuduuuvjijurjh.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1eXVndGV1ZHV1dXZqaWp1cmpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3MjMxMzMsImV4cCI6MjA4NTI5OTEzM30.wZpkRxuEt7aa4Qc5nxWLAAAVOski7qAJzHhjLvWhIvg');

async function checkData() {
    const { data: cats, error } = await supabase.from('truck_categories').select('id, name_ar');
    if (error) console.error(error);
    console.log("Categories in DB:");
    cats?.forEach(c => console.log(`'${c.name_ar}'`, c.id));
}

checkData();
