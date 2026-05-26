const fs = require('fs');
const config = fs.readFileSync('c:/xampp/htdocs/E-BPHTB/js/config.js', 'utf8');
const urlMatch = config.match(/SUPABASE_URL\s*=\s*['"]([^'"]+)['"]/);
const keyMatch = config.match(/SUPABASE_ANON_KEY\s*=\s*['"]([^'"]+)['"]/);
async function run() {
    if(urlMatch && keyMatch) {
        console.log('Fetching...');
        const r = await fetch(urlMatch[1] + '/rest/v1/pengajuan_bphtb?select=nama,jenis_perolehan,nilai_transaksi,total_njop,pajak,pajak_ditetapkan,alur_berkas', {
            headers: { 'apikey': keyMatch[1], 'Authorization': 'Bearer ' + keyMatch[1] }
        });
        const data = await r.json();
        console.log('Data length:', data.length);
        const yumi = data.find(d => d.nama && d.nama.toLowerCase().includes('yumi'));
        console.log('Yumi data:', JSON.stringify(yumi, null, 2));
    }
}
run();
