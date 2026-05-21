<?php
$config = file_get_contents('js/config.js');
preg_match('/SUPABASE_URL\s*=\s*[\'"]([^\'"]+)[\'"]/', $config, $urlMatch);
preg_match('/SUPABASE_ANON_KEY\s*=\s*[\'"]([^\'"]+)[\'"]/', $config, $keyMatch);

if (!$urlMatch || !$keyMatch) {
    die("Could not find Supabase credentials\n");
}

$url = $urlMatch[1];
$key = $keyMatch[1];

// We can query the REST API if we have a table or we can just run a POST to the /rest/v1/RPC if there's a custom function.
// Since we don't have SQL execution access via REST directly without an RPC, let's just query the table with limit=0 to get its headers.
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url . "/rest/v1/pengajuan_mbr?limit=1");
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "apikey: " . $key,
    "Authorization: Bearer " . $key,
    "Prefer: return=representation"
]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

$response = curl_exec($ch);
curl_close($ch);

echo $response;
