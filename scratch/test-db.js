const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://olhhuviwdqguzbsczplm.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9saGh1dml3ZHFndXpic2N6cGxtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyNzg1MzksImV4cCI6MjA5NDg1NDUzOX0.LBD3DWookXVmf43IxogU-okey6_YO4Kxqwx1BSdKtRc';

const db = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
    console.log("Checking data_bank table...");
    const { data, error } = await db.from('data_bank').select('*').limit(1);
    if (error) {
        console.log("Error querying data_bank:", error.message, error.code);
    } else {
        console.log("data_bank exists! Sample data:", data);
    }
}
run();
