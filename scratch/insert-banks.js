const SUPABASE_URL = 'https://olhhuviwdqguzbsczplm.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9saGh1dml3ZHFndXpic2N6cGxtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyNzg1MzksImV4cCI6MjA5NDg1NDUzOX0.LBD3DWookXVmf43IxogU-okey6_YO4Kxqwx1BSdKtRc';

const banks = [
    { nama_bank: 'BANK TABUNGAN NEGARA', kode_bank: 'BTN' },
    { nama_bank: 'BANK SULSELBAR', kode_bank: 'BPD SULSELBAR' },
    { nama_bank: 'BANK RAKYAT INDONESIA', kode_bank: 'BRI' },
    { nama_bank: 'BANK MANDIRI', kode_bank: 'MANDIRI' },
    { nama_bank: 'BANK NEGARA INDONESIA', kode_bank: 'BNI' }
];

async function run() {
    console.log("Inserting default banks to data_bank...");
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/data_bank`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': 'Bearer ' + SUPABASE_KEY,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify(banks)
        });
        
        const resText = await response.text();
        console.log("Response status:", response.status);
        console.log("Response body:", resText);
    } catch (err) {
        console.error("Error inserting banks:", err);
    }
}
run();
