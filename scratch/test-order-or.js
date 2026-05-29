const { createClient } = require('@supabase/supabase-js'); 
const db = createClient('https://olhhuviwdqguzbsczplm.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9saGh1dml3ZHFndXpic2N6cGxtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyNzg1MzksImV4cCI6MjA5NDg1NDUzOX0.LBD3DWookXVmf43IxogU-okey6_YO4Kxqwx1BSdKtRc'); 
db.from('pengajuan_bphtb').select('*').order('created_at', { ascending: false }).or('nama.ilike."%BASRI PASOLANGI%",notaris.ilike."%BASRI PASOLANGI%"').then(r => console.log('Rows:', r.data ? r.data.length : r.error));
