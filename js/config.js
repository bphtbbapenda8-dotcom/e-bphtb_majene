/**
 * config.js — Supabase & Google Apps Script configuration
 */

const CONFIG = {
    SUPABASE_URL: 'https://olhhuviwdqguzbsczplm.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9saGh1dml3ZHFndXpic2N6cGxtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyNzg1MzksImV4cCI6MjA5NDg1NDUzOX0.LBD3DWookXVmf43IxogU-okey6_YO4Kxqwx1BSdKtRc',
    SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbym65SfztVw7MriaMG-T9bW3NuanBHvrtjvTYFN_0wQD9wZAoP2GIjqwUoJcTPpHZZZ/exec',
};

// Initialize Supabase client globally
const db = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
