-- Jalankan SQL ini di Supabase SQL Editor:
-- https://supabase.com/dashboard/project/olhhuviwdqguzbsczplm/sql

-- 1. Tambah kolom submitted_by_id ke pengajuan_bphtb
ALTER TABLE pengajuan_bphtb ADD COLUMN IF NOT EXISTS submitted_by_id TEXT;

-- 2. Tambah kolom submitted_by_id ke pengajuan_mbr
ALTER TABLE pengajuan_mbr ADD COLUMN IF NOT EXISTS submitted_by_id TEXT;

-- 3. Patch data Basri yang sudah ada (auth_id Basri = '3a0e478a-50c3-40bb-8a89-054618e7cbd4')
UPDATE pengajuan_bphtb 
SET submitted_by_id = '3a0e478a-50c3-40bb-8a89-054618e7cbd4'
WHERE notaris ILIKE '%BASRI PASOLANGI%';
