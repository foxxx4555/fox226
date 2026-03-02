import { supabase } from './src/integrations/supabase/client';

async function checkSchema() {
    console.log("Checking financial_transactions...");
    const { data, error } = await (supabase as any)
        .from('financial_transactions')
        .select('*')
        .limit(1);

    if (error) {
        console.error("Error fetching transactions:", error);
    } else {
        console.log("Transaction sample:", data);
        if (data && data.length > 0) {
            console.log("Available columns:", Object.keys(data[0]));
        }
    }

    console.log("\nChecking wallets...");
    const { data: wallets, error: wError } = await (supabase as any)
        .from('wallets')
        .select('*')
        .limit(1);

    if (wError) {
        console.error("Error fetching wallets:", wError);
    } else {
        console.log("Wallet sample:", wallets);
        if (wallets && wallets.length > 0) {
            console.log("Available columns:", Object.keys(wallets[0]));
        }
    }
}

checkSchema();
