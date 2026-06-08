<?php
header('Content-Type: text/plain');

$supabase_url = 'https://olhhuviwdqguzbsczplm.supabase.co';
$supabase_key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9saGh1dml3ZHFndXpic2N6cGxtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyNzg1MzksImV4cCI6MjA5NDg1NDUzOX0.LBD3DWookXVmf43IxogU-okey6_YO4Kxqwx1BSdKtRc';

$banks = [
    [ 'nama_bank' => 'BANK TABUNGAN NEGARA', 'kode_bank' => 'BTN' ],
    [ 'nama_bank' => 'BANK SULSELBAR', 'kode_bank' => 'BPD SULSELBAR' ],
    [ 'nama_bank' => 'BANK RAKYAT INDONESIA', 'kode_bank' => 'BRI' ],
    [ 'nama_bank' => 'BANK MANDIRI', 'kode_bank' => 'MANDIRI' ],
    [ 'nama_bank' => 'BANK NEGARA INDONESIA', 'kode_bank' => 'BNI' ]
];

echo "Inserting default banks to data_bank...\n";

$ch = curl_init("$supabase_url/rest/v1/data_bank");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "apikey: $supabase_key",
    "Authorization: Bearer $supabase_key",
    "Content-Type: application/json",
    "Prefer: return=representation"
]);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($banks));

$response = curl_exec($ch);
$status = curl_getinfo($ch, CURLINFO_HTTP_CODE);

if (curl_errno($ch)) {
    echo 'Error: ' . curl_error($ch) . "\n";
} else {
    echo "HTTP Status: $status\n";
    echo "Response: $response\n";
}

curl_close($ch);
?>
