// Script untuk menambah kolom submitted_by_id via Supabase Management API
// Menggunakan service role key dari config.js

const fs = require('fs');
const configStr = fs.readFileSync('c:/xampp/htdocs/E-BPHTB/js/config.js', 'utf8');
const urlMatch = configStr.match(/SUPABASE_URL\s*:\s*['"]([^'"]+)['"]/);
const keyMatch = configStr.match(/SUPABASE_ANON_KEY\s*:\s*['"]([^'"]+)['"]/);

const SUPABASE_URL = urlMatch[1]; // https://olhhuviwdqguzbsczplm.supabase.co
const ANON_KEY = keyMatch[1];

// Basri's auth_id
const BASRI_AUTH_ID = '3a0e478a-50c3-40bb-8a89-054618e7cbd4';

async function run() {
    // Patch existing Basri records using PATCH via REST API
    // Kolom baru harus dibuat dulu lewat Supabase Dashboard SQL Editor
    // Cek dulu apakah kolom sudah ada
    const test = await fetch(`${SUPABASE_URL}/rest/v1/pengajuan_bphtb?select=submitted_by_id&limit=1`, {
        headers: { 'apikey': ANON_KEY }
    });
    const testData = await test.json();
    
    if (testData.code === '42703') {
        console.log('KOLOM BELUM ADA. Silakan jalankan SQL berikut di Supabase Dashboard dulu:');
        console.log('');
        console.log('ALTER TABLE pengajuan_bphtb ADD COLUMN IF NOT EXISTS submitted_by_id TEXT;');
        console.log('ALTER TABLE pengajuan_mbr ADD COLUMN IF NOT EXISTS submitted_by_id TEXT;');
        console.log('');
        console.log('Lalu jalankan script ini kembali.');
        return;
    }

    console.log('Kolom sudah ada! Melakukan patch data Basri...');
    
    // Patch semua record yang notarisnya mengandung BASRI PASOLANGI
    const patchRes = await fetch(`${SUPABASE_URL}/rest/v1/pengajuan_bphtb?notaris=ilike.*BASRI%20PASOLANGI*`, {
        method: 'PATCH',
        headers: {
            'apikey': ANON_KEY,
            'Authorization': 'Bearer ' + ANON_KEY,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        },
        body: JSON.stringify({ submitted_by_id: BASRI_AUTH_ID })
    });
    
    const patchData = await patchRes.json();
    console.log('Patch result status:', patchRes.status);
    console.log('Patched records:', JSON.stringify(patchData));
}

run().catch(console.error);
