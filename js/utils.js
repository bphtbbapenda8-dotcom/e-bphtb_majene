/**
 * utils.js — Shared utility functions
 */

/** Format angka ke Rupiah */
function fmtCurr(v) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(v || 0);
}

/** Format string ke Rupiah (untuk tampilan di input) */
function fmtRpDisplay(v) {
    const num = parseInt(String(v).replace(/\D/g, '')) || 0;
    if (!num) return '';
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(num);
}

/** Ambil angka dari string Rupiah */
function parseRp(str) {
    return parseInt(String(str).replace(/\D/g, '')) || 0;
}

/** Hanya angka */
function onlyNum(str) {
    return String(str).replace(/\D/g, '');
}

/** CSS class untuk badge status */
function statusBadge(status) {
    if (!status) return 'badge-gray';
    if (status === 'Selesai') return 'badge-green';
    if (status === 'Berkas ditolak') return 'badge-red';
    if (status.includes('Pembayaran')) return 'badge-yellow';
    if (status.includes('MBR') || status.includes('mbr')) return 'badge-purple';
    return 'badge-blue';
}

/** Convert File ke Base64 (tanpa header) */
function toBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
    });
}

/** Format tanggal ke ID locale */
function fmtDate(isoStr) {
    if (!isoStr) return '-';
    return new Date(isoStr).toLocaleDateString('id-ID', {
        day: '2-digit', month: 'long', year: 'numeric'
    });
}

/** Generate nomor pengajuan */
function generateNoPengajuan(type) {
    const prefix = type === 'mbr' ? 'MBR' : 'REQ';
    return `${prefix}-${Date.now()}`;
}

/** Catat aktivitas ke tabel activity_logs */
async function logActivity(action, details) {
    try {
        const userStr = sessionStorage.getItem('ebphtb_user_data');
        if (!userStr) return;
        const user = JSON.parse(userStr);
        
        // Ensure db is available (Supabase client from config.js)
        if (typeof db !== 'undefined') {
            await db.from('activity_logs').insert([{
                username: user.username || user.nama,
                role: user.role,
                action: action,
                details: details || '-'
            }]);
        }
    } catch(e) {
        console.error("Gagal mencatat log aktivitas:", e);
    }
}

/** Compress image blob and return Base64 Data URL */
function compressImageToDataURL(blob, maxWidth = 400, format = 'image/png', quality = 0.8) {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(blob);
        const img = new Image();
        img.onload = () => {
            URL.revokeObjectURL(url);
            let width = img.width;
            let height = img.height;
            if (width > maxWidth) {
                height = Math.round((height * maxWidth) / width);
                width = maxWidth;
            }
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (format === 'image/jpeg') {
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, width, height);
            }
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL(format, quality));
        };
        img.onerror = reject;
        img.src = url;
    });
}
