const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const configStr = fs.readFileSync('c:/xampp/htdocs/E-BPHTB/js/config.js', 'utf8');
const urlMatch = configStr.match(/SUPABASE_URL\s*:\s*['"]([^'"]+)['"]/);
const keyMatch = configStr.match(/SUPABASE_ANON_KEY\s*:\s*['"]([^'"]+)['"]/);

async function test() {
    const db = createClient(urlMatch[1], keyMatch[1]);
    const namaUser = 'BASRI PASOLANGI';
    
    // Without quotes
    let q1 = db.from('pengajuan_bphtb').select('*').or(`nama.ilike.%${namaUser}%,notaris.ilike.%${namaUser}%`);
    const r1 = await q1;
    console.log('Without quotes:', r1.data ? r1.data.length : r1.error);

    // With quotes
    let q2 = db.from('pengajuan_bphtb').select('*').or(`nama.ilike."%${namaUser}%",notaris.ilike."%${namaUser}%"`);
    const r2 = await q2;
    console.log('With quotes:', r2.data ? r2.data.length : r2.error);
    
    // With URI encoding
    let q3 = db.from('pengajuan_bphtb').select('*').or(`nama.ilike.%${encodeURIComponent(namaUser)}%,notaris.ilike.%${encodeURIComponent(namaUser)}%`);
    const r3 = await q3;
    console.log('With URI encoding:', r3.data ? r3.data.length : r3.error);
}
test();
