const fs = require('fs');
const config = fs.readFileSync('c:/xampp/htdocs/E-BPHTB/js/config.js', 'utf8');
const urlMatch = config.match(/SUPABASE_URL\s*:\s*['"]([^'"]+)['"]/);
const keyMatch = config.match(/SUPABASE_ANON_KEY\s*:\s*['"]([^'"]+)['"]/);

async function run() {
    let out = [];
    if(urlMatch && keyMatch) {
        const SUPABASE_URL = urlMatch[1];
        const SUPABASE_KEY = keyMatch[1];
        
        // Fetch all data
        const r = await fetch(SUPABASE_URL + '/rest/v1/pengajuan_bphtb?select=no_pengajuan,nama,jenis_perolehan,nilai_transaksi,total_njop,pajak,pajak_ditetapkan,alur_berkas', {
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
        });
        const data = await r.json();
        
        for (const item of data) {
            let npoptkp = 80000000;
            const jp = String(item.jenis_perolehan).toLowerCase();
            if (jp === 'waris' || jp === 'hibah_wasiat' || jp === 'hibah wasiat') {
                npoptkp = 300000000;
            }
            
            const npo = Math.max(item.total_njop || 0, item.nilai_transaksi || 0);
            const pkp = npo - npoptkp;
            let calculatedPajak = pkp > 0 ? Math.floor(pkp * 0.05) : 0;
            
            // Only recalculate for jual_beli for now, since other types might be manual or different
            if (jp !== 'jual_beli' && jp !== 'jual beli') {
                calculatedPajak = 0; // The frontend sets to 0 for non jual beli until Verifikator Lapangan fills it.
            }

            // Check if the current pajak in DB is 0, but it should be > 0 (for Jual Beli)
            // Or if we just want to fix ALL records that seem inconsistent.
            // Wait! If the status is 'Berkas ditolak', it SHOULD preserve the WP's initial tax estimation.
            // If it's already > 0, we might leave it alone to avoid overriding manual admin edits.
            // But if it is 0 and calculatedPajak > 0, we MUST fix it.
            
            if (item.pajak === 0 && calculatedPajak > 0 && jp.includes('jual')) {
                out.push(`Fixing ${item.nama} (${item.no_pengajuan}): was 0, now ${calculatedPajak} (NPO: ${npo})`);
                const updateRes = await fetch(`${SUPABASE_URL}/rest/v1/pengajuan_bphtb?no_pengajuan=eq.${item.no_pengajuan}`, {
                    method: 'PATCH',
                    headers: { 
                        'apikey': SUPABASE_KEY, 
                        'Authorization': 'Bearer ' + SUPABASE_KEY,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=minimal'
                    },
                    body: JSON.stringify({ pajak: calculatedPajak })
                });
                out.push('Update status: ' + updateRes.status);
            }
        }
        out.push('Done checking all records.');
    } else {
        out.push("no config");
    }
    fs.writeFileSync('c:/xampp/htdocs/E-BPHTB/out.txt', out.join('\n'));
}
run();
