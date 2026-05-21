<?php
$config = file_get_contents('js/config.js');
preg_match('/SUPABASE_URL\s*=\s*[\'"]([^\'"]+)[\'"]/', $config, $urlMatch);
preg_match('/SUPABASE_ANON_KEY\s*=\s*[\'"]([^\'"]+)[\'"]/', $config, $keyMatch);

if (!$urlMatch || !$keyMatch) {
    die("Could not find Supabase credentials\n");
}

$url = $urlMatch[1];
$key = $keyMatch[1];

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url . "/rest/v1/pengajuan_bphtb?select=no_pengajuan,nama,alur_berkas,jenis_pengajuan,created_at&limit=10");
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "apikey: " . $key,
    "Authorization: Bearer " . $key
]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

$response = curl_exec($ch);
curl_close($ch);

echo $response;
