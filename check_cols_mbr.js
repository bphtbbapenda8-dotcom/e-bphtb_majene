import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const configStr = fs.readFileSync('js/config.js', 'utf8')
const matches = configStr.match(/const SUPABASE_URL = '(.*?)';\s*const SUPABASE_ANON_KEY = '(.*?)';/)
const supabase = createClient(matches[1], matches[2])

async function run() {
    const { data } = await supabase.from('pengajuan_mbr').select('*').limit(1)
    console.log(Object.keys(data[0]))
}
run()
