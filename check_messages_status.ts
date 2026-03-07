import { createClient } from '@supabase/supabase-js';

async function checkStatus() {
    try {
        const supabaseUrl = 'https://puyugteuduuuvjijurjh.supabase.co';
        const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1eXVndGV1ZHV1dXZqaWp1cmpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3MjMxMzMsImV4cCI6MjA4NTI5OTEzM30.wZpkRxuEt7aa4Qc5nxWLAAAVOski7qAJzHhjLvWhIvg';

        const supabase = createClient(supabaseUrl, supabaseAnonKey);

        console.log('--- Checking contact_messages ---');
        const { data: messages, error: msgError } = await supabase
            .from('contact_messages')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(5);

        if (msgError) console.error('Error fetching messages:', msgError.message);
        else console.log('Found', messages.length, 'recent messages.');

        console.log('--- Checking email settings in system_settings ---');
        const { data: config, error: configError } = await supabase
            .from('system_settings')
            .select('*')
            .eq('id', 'content_config')
            .single();

        if (configError) console.error('Error fetching config:', configError.message);
        else {
            const data = config.data;
            console.log('EmailJS Service ID:', data.emailjsServiceId || 'MISSING');
            console.log('EmailJS Template ID:', data.emailjsTemplateId || 'MISSING');
            console.log('EmailJS Public Key:', data.emailjsPublicKey || 'MISSING');
        }

    } catch (err) {
        console.error('Unexpected error:', err);
    }
}

checkStatus();
