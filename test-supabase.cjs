const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://puyugteuduuuvjijurjh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1eXVndGV1ZHV1dXZqaWp1cmpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3MjMxMzMsImV4cCI6MjA4NTI5OTEzM30.wZpkRxuEt7aa4Qc5nxWLAAAVOski7qAJzHhjLvWhIvg'
);

async function testQuery() {
  console.log('Testing getAllTransactions syntax 1...');
  let res1 = await supabase
    .from('financial_transactions')
    .select(`
      *,
      wallet:wallets(user_id, profiles(full_name, phone))
    `)
    .limit(1);
  console.log('res1:', res1.error || res1.data);

  console.log('Testing getAllTransactions syntax 2...');
  let res2 = await supabase
    .from('financial_transactions')
    .select(`
      *,
      wallet:wallets(user_id, profile:profiles!user_id(full_name, phone))
    `)
    .limit(1);
  console.log('res2:', res2.error || res2.data);

  console.log('Testing getAllTransactions syntax 3...');
  let res3 = await supabase
    .from('financial_transactions')
    .select(`
      *,
      wallet:wallets(*, profile:profiles(*))
    `)
    .limit(1);
  console.log('res3:', res3.error || res3.data);

  console.log('Testing getAllTransactions syntax 4...');
  let res4 = await supabase
    .from('financial_transactions')
    .select(`
      *,
      wallet:wallets(*, profiles(*))
    `)
    .limit(1);
  console.log('res4:', res4.error || res4.data);
}

testQuery();
