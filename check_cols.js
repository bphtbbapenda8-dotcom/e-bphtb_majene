const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://olhhuviwdqguzbsczplm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9saGh1dml3ZHFndXpic2N6cGxtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyNzg1MzksImV4cCI6MjA5NDg1NDUzOX0.LBD3DWookXVmf43IxogU-okey6_YO4Kxqwx1BSdKtRc';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumns() {
    const { data, error } = await supabase.from('pengajuan_mbr').select('*').limit(1);
    if (error) {
        console.error('Error fetching data:', error);
        return;
    }
    if (data.length > 0) {
        console.log(Object.keys(data[0]));
    } else {
        console.log('No data found, cannot infer columns.');
    }
}

checkColumns();
