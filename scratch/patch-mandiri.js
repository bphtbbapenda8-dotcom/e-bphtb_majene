const fs = require('fs');
const config = fs.readFileSync('c:/xampp/htdocs/E-BPHTB/js/config.js', 'utf8');
const urlMatch = config.match(/SUPABASE_URL\s*:\s*['"]([^'"]+)['"]/);
const keyMatch = config.match(/SUPABASE_ANON_KEY\s*:\s*['"]([^'"]+)['"]/);

async function run() {
    if (urlMatch && keyMatch) {
        const url = urlMatch[1];
        const key = keyMatch[1];
        
        const reqs = ['REQ-1780045432395', 'REQ-1780046720510'];
        
        for (const req of reqs) {
            const res = await fetch(`${url}/rest/v1/pengajuan_bphtb?no_pengajuan=eq.${req}`, {
                method: 'PATCH',
                headers: {
                    'apikey': key,
                    'Authorization': 'Bearer ' + key,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=minimal'
                },
                body: JSON.stringify({ notaris: 'mandiri/perseorangan - BASRI PASOLANGI' })
            });
            console.log(`Updated ${req}: ${res.status}`);
        }
    }
}
run();
