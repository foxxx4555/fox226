
import { supabase } from './src/integrations/supabase/client';

async function checkInvoices() {
    console.log('--- Checking Invoices for Admin ---');

    const { data, error } = await supabase.from('invoices').select(`
    *,
    shipper:profiles(full_name, phone)
  `);

    if (error) {
        console.error('Error fetching invoices:', error);
    } else {
        console.log(`Found ${data.length} invoices.`);
        if (data.length > 0) {
            console.log('Sample invoice:', data[0]);
        }
    }

    console.log('--- Checking Invoice Items ---');
    const { data: items, error: itemError } = await supabase.from('invoice_items').select('*');
    if (itemError) {
        console.error('Error fetching invoice items:', itemError);
    } else {
        console.log(`Found ${items.length} invoice items.`);
    }
}

checkInvoices();
