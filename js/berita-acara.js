/**
 * Generate Berita Acara Verifikasi Lapangan PDF untuk pengajuan MBR
 * Menggunakan jsPDF (harus sudah di-load di halaman)
 * @param {object} d - Data row dari tabel pengajuan_mbr
 */
async function generateBeritaAcaraMBR(d) {
    if (typeof window.jspdf === 'undefined' && typeof window.jsPDF === 'undefined') {
        Swal.fire({ icon: 'error', title: 'Library PDF belum siap', text: 'Silakan tunggu sebentar lalu coba lagi.' });
        return;
    }

    // ── Roman numerals helper ─────────────────────────────────────
    const toRoman = (n) => {
        const r = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'];
        return r[n - 1] || String(n);
    };

    // ── Get sequence number (count of verified MBR records) ───────
    let seqNum = 1;
    try {
        // Count how many MBR records have been fully verified up to and including this one
        const { data: verifiedList } = await db.from('pengajuan_mbr')
            .select('no_pengajuan, created_at')
            .eq('verifikasi_berkas_status', 'disetujui')
            .eq('verifikasi_lapangan_status', 'disetujui')
            .order('created_at', { ascending: true });

        if (verifiedList && verifiedList.length > 0) {
            const idx = verifiedList.findIndex(r => r.no_pengajuan === d.no_pengajuan);
            seqNum = idx >= 0 ? idx + 1 : verifiedList.length;
        }
    } catch(e) {
        console.warn('Tidak bisa ambil nomor urut:', e);
    }

    // ── Date: gunakan tanggal verifikasi berkas (bukan hari ini) ─
    // Prioritas: tanggal_verifikasi_berkas → tanggal_verifikasi_lapangan → updated_at → created_at
    const tglSrc = d.tanggal_verifikasi_berkas
                || d.tanggal_verifikasi_lapangan
                || d.updated_at
                || d.created_at
                || new Date().toISOString();
    const tgl        = new Date(tglSrc);
    const hari       = tgl.getDate();
    const bulanAngka = tgl.getMonth() + 1;
    const bulanNama  = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'][tgl.getMonth()];
    const bulanRoman = toRoman(bulanAngka);
    const tahun      = tgl.getFullYear();

    const tahunMap = {
        2024:'Dua Ribu Dua Puluh Empat',
        2025:'Dua Ribu Dua Puluh Lima',
        2026:'Dua Ribu Dua Puluh Enam',
        2027:'Dua Ribu Dua Puluh Tujuh'
    };
    const tahunTerbilang = tahunMap[tahun] || String(tahun);

    // ── Document number: 005/Verifikasi/BPHTB-MBR/V/2026 ─────────
    const nomorDoc = `${String(seqNum).padStart(3,'0')}/Verifikasi/BPHTB-MBR/${bulanRoman}/${tahun}`;

    // ── Load logo from server ─────────────────────────────────────
    let logoDataUrl = null;
    let ttdAdminDataUrl = null;
    let ttdWawanDataUrl = null;
    let ttdThomasDataUrl = null;
    let ttdWahyuDataUrl = null;
    try {
        const resp = await fetch('logo.png');
        if (resp.ok) {
            const blob = await resp.blob();
            logoDataUrl = await compressImageToDataURL(blob, 300, 'image/png');
        }
        
        const respTtd = await fetch('ttd_admin.png');
        if (respTtd.ok) {
            const blobTtd = await respTtd.blob();
            ttdAdminDataUrl = await compressImageToDataURL(blobTtd, 300, 'image/png');
        }
        
        const respTtdWawan = await fetch('ttd_wawan.png');
        if (respTtdWawan.ok) {
            const blobTtdWawan = await respTtdWawan.blob();
            ttdWawanDataUrl = await compressImageToDataURL(blobTtdWawan, 300, 'image/png');
        }

        const respTtdThomas = await fetch('ttd_thomas.png');
        if (respTtdThomas.ok) {
            const blobTtdThomas = await respTtdThomas.blob();
            ttdThomasDataUrl = await compressImageToDataURL(blobTtdThomas, 300, 'image/png');
        }

        const respTtdWahyu = await fetch('ttd_wahyu.png');
        if (respTtdWahyu.ok) {
            const blobTtdWahyu = await respTtdWahyu.blob();
            ttdWahyuDataUrl = await compressImageToDataURL(blobTtdWahyu, 300, 'image/png');
        }
    } catch(e) {
        // Fallback: try to read from img tag already on page
        try {
            const logoImg = document.querySelector('img[src*="logo"]') || document.querySelector('img[alt*="Logo"]');
            if (logoImg && logoImg.complete && logoImg.naturalWidth > 0) {
                const canvas = document.createElement('canvas');
                canvas.width = logoImg.naturalWidth;
                canvas.height = logoImg.naturalHeight;
                canvas.getContext('2d').drawImage(logoImg, 0, 0);
                logoDataUrl = canvas.toDataURL('image/png');
            }
        } catch(e2) {}
    }

    // ── Init jsPDF ────────────────────────────────────────────────
    const { jsPDF } = window.jspdf || { jsPDF: window.jsPDF };
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });

    const pw = 210;
    const lm = 20;
    const rm = pw - 20;
    const cw = rm - lm;

    const setFont     = (style, size) => { doc.setFont('helvetica', style); doc.setFontSize(size); };
    const centerText  = (text, y, size, style) => { setFont(style || 'normal', size || 11); doc.text(text, pw / 2, y, { align: 'center' }); };
    const fieldLine   = (label, value, y, lw) => {
        lw = lw || 55;
        setFont('normal', 10);
        doc.text(label, lm + 6, y);
        doc.text(':', lm + lw, y);
        setFont('bold', 10);
        const lines = doc.splitTextToSize(value || '-', cw - lw - 6);
        doc.text(lines, lm + lw + 4, y);
        return lines.length;
    };

    let y = 12;

    // ── HEADER: Logo kiri + teks tengah ──────────────────────────
    const logoSize = 22;
    const headerTopY = y;

    if (logoDataUrl) {
        doc.addImage(logoDataUrl, 'PNG', lm, headerTopY - 2, logoSize, logoSize);
    }

    // Teks header di tengah
    setFont('bold', 13);
    doc.text('PEMERINTAH KABUPATEN MAJENE', pw / 2, y + 3, { align: 'center' });
    y += 6;
    setFont('bold', 12);
    doc.text('BADAN PENDAPATAN DAERAH', pw / 2, y + 3, { align: 'center' });
    y += 5;
    setFont('normal', 9);
    doc.text('Jl. Jend. Gatot Subroto No. 58 Majene', pw / 2, y + 3, { align: 'center' });
    y += 7;

    // Ensure enough room after logo
    if (logoDataUrl) {
        y = Math.max(y, headerTopY + logoSize + 2);
    }

    // Garis tebal bawah header
    doc.setLineWidth(0.8); doc.line(lm, y, rm, y);
    doc.setLineWidth(0.3); doc.line(lm, y + 1.2, rm, y + 1.2);
    y += 8;

    // ── JUDUL ─────────────────────────────────────────────────────
    centerText('BERITA ACARA VERIFIKASI', y, 12, 'bold'); y += 6;
    centerText('Nomor: ' + nomorDoc, y, 10, 'normal'); y += 9;

    // ── KALIMAT PEMBUKA ───────────────────────────────────────────
    setFont('normal', 10);
    const bukaText = `Pada hari ini, tanggal ${hari} bulan ${bulanNama} tahun ${tahunTerbilang}, kami yang bertanda tangan di bawah ini, Tim Verifikasi Badan Pendapatan Daerah Kabupaten Majene, telah melakukan peninjauan lapangan terhadap objek pajak BPHTB dengan data sebagai berikut:`;
    const bukaLines = doc.splitTextToSize(bukaText, cw);
    doc.text(bukaLines, lm, y);
    y += bukaLines.length * 5 + 4;

    // ── SECTION I: DATA WAJIB PAJAK ───────────────────────────────
    setFont('bold', 10);
    doc.text('I.  DATA WAJIB PAJAK / PEMOHON', lm, y); y += 6;
    fieldLine('Nama Wajib Pajak', d.nama, y);    y += 5.5;
    fieldLine('NIK', d.nik, y);                   y += 5.5;
    const alamatWP    = d.alamat_wp || d.alamat_op || '-';
    const alamatLines = doc.splitTextToSize(alamatWP, cw - 59);
    setFont('normal', 10);
    doc.text('Alamat', lm + 6, y); doc.text(':', lm + 55, y);
    setFont('bold', 10); doc.text(alamatLines, lm + 59, y);
    y += Math.max(1, alamatLines.length) * 5 + 4;

    // ── SECTION II: DATA OBJEK PAJAK ──────────────────────────────
    setFont('bold', 10);
    doc.text('II. DATA OBJEK PAJAK', lm, y); y += 6;
    fieldLine('NOP PBB', d.nop, y); y += 5.5;
    const letakText  = d.letak_tanah_bangunan || d.alamat_op || '-';
    const letakLines = doc.splitTextToSize(letakText, cw - 59);
    setFont('normal', 10);
    doc.text('Letak Objek Pajak', lm + 6, y); doc.text(':', lm + 55, y);
    setFont('bold', 10); doc.text(letakLines, lm + 59, y);
    y += Math.max(1, letakLines.length) * 5;
    fieldLine('Luas Tanah (m\u00B2)',    String(d.luas_bumi     || 0), y); y += 5.5;
    fieldLine('Luas Bangunan (m\u00B2)', String(d.luas_bangunan || 0), y); y += 5.5;
    fieldLine('Jenis Perolehan', 'JUAL BELI', y); y += 9;

    // ── SECTION III: HASIL VERIFIKASI ─────────────────────────────
    setFont('bold', 10);
    doc.text('III. HASIL VERIFIKASI', lm, y); y += 5;
    setFont('normal', 10);
    doc.text('Berdasarkan hasil Verifikasi, ditemukan fakta-fakta sebagai berikut:', lm + 6, y); y += 6;

    // Helper drawCheckbox
    const drawCheckbox = (cx, cy, checked) => {
        doc.setLineWidth(0.5);
        doc.rect(cx, cy - 3.5, 4, 4); // Box
        if (checked) {
            doc.setLineWidth(0.6);
            doc.line(cx + 0.8, cy - 1.5, cx + 1.8, cy - 0.5);
            doc.line(cx + 1.8, cy - 0.5, cx + 3.2, cy - 3.0);
        }
    };

    // Parse data from DB
    const vfBerkas = typeof d.data_verifikasi_berkas === 'string' ? JSON.parse(d.data_verifikasi_berkas || '{}') : (d.data_verifikasi_berkas || {});
    const vfLap = typeof d.data_verifikasi_lapangan === 'string' ? JSON.parse(d.data_verifikasi_lapangan || '{}') : (d.data_verifikasi_lapangan || {});
    const keleng = vfBerkas.kelengkapan || {};

    // A. Berkas
    setFont('bold', 9.5);
    doc.text('A.  Berkas', lm + 6, y); y += 6;
    setFont('normal', 9);
    
    // 1. Status Perkawinan
    doc.text('1.  Status Perkawinan', lm + 10, y);
    doc.text(':', lm + 45, y);
    drawCheckbox(lm + 48, y, vfBerkas.status_perkawinan === 'menikah'); doc.text('Menikah', lm + 54, y);
    drawCheckbox(lm + 100, y, vfBerkas.status_perkawinan === 'belum_menikah'); doc.text('Belum Menikah', lm + 106, y);
    y += 6;

    // 2. Penghasilan
    doc.text('2.  penghasilan', lm + 10, y);
    doc.text(':', lm + 45, y);
    drawCheckbox(lm + 48, y, vfBerkas.penghasilan === 'dibawah_8juta'); doc.text('dibawah Rp.8.000.000,-', lm + 54, y);
    drawCheckbox(lm + 100, y, vfBerkas.penghasilan === 'dibawah_7juta'); doc.text('dibawah Rp.7.000.000', lm + 106, y);
    y += 6;

    // 3. Kelengkapan Berkas
    doc.text('3.  Kelengkapan Berkas', lm + 10, y);
    doc.text(':', lm + 45, y);
    drawCheckbox(lm + 48, y, keleng.ktp); doc.text('KTP', lm + 54, y);
    drawCheckbox(lm + 65, y, keleng.kk); doc.text('Kartu Keluarga', lm + 71, y);
    drawCheckbox(lm + 100, y, keleng.sertifikat); doc.text('Sertifikat (SHGB)', lm + 106, y);
    y += 6;
    drawCheckbox(lm + 48, y, keleng.ajb); doc.text('AJB/Ket. Jual Beli', lm + 54, y);
    drawCheckbox(lm + 85, y, keleng.spk); doc.text('Surat Perjanjian Kredit', lm + 91, y);
    drawCheckbox(lm + 130, y, keleng.sppt); doc.text('SPPT PBB', lm + 136, y);
    y += 6;
    drawCheckbox(lm + 48, y, keleng.ket_rumah); doc.text('Surat Ket. Tidak Memiliki Rumah', lm + 54, y);
    y += 6;

    // 4. Harga
    doc.text('4.  Harga', lm + 10, y);
    doc.text(':', lm + 45, y);
    doc.text('Rp ' + (vfBerkas.harga ? parseInt(vfBerkas.harga).toLocaleString('id-ID') : (d.nilai_transaksi || 0).toLocaleString('id-ID')), lm + 48, y);
    y += 6;

    // B. Kesesuaian Data dilapangan
    setFont('bold', 9.5);
    doc.text('B.  Kesesuaian Data dengan realitas dilapangan', lm + 6, y); y += 6;
    setFont('normal', 9);

    // 1. Kondisi Fisik Tanah
    doc.text('1.  Kondisi Fisik Tanah', lm + 10, y);
    doc.text(':', lm + 60, y);
    drawCheckbox(lm + 63, y, vfLap.kondisi_tanah === 'tanah_kosong'); doc.text('Tanah Kosong', lm + 69, y);
    drawCheckbox(lm + 100, y, vfLap.kondisi_tanah === 'tanah_bangunan'); doc.text('Tanah & Bangunan', lm + 106, y);
    y += 6;

    // 2. Jenis Bangunan
    doc.text('2.  Jenis Bangunan', lm + 10, y);
    doc.text(':', lm + 60, y);
    drawCheckbox(lm + 63, y, vfLap.jenis_bangunan === 'permanen'); doc.text('Permanen', lm + 69, y);
    drawCheckbox(lm + 100, y, vfLap.jenis_bangunan === 'semi_permanen'); doc.text('Semi Permanen', lm + 106, y);
    y += 6;

    // 3. Luas Bangunan
    doc.text('3.  Luas Bangunan 36 M\u00B2', lm + 10, y);
    doc.text(':', lm + 60, y);
    drawCheckbox(lm + 63, y, vfLap.luas_bangunan === 'sesuai'); doc.text('Sesuai', lm + 69, y);
    drawCheckbox(lm + 85, y, vfLap.luas_bangunan === 'tidak_sesuai'); doc.text('Tidak Sesuai', lm + 91, y);
    y += 6;

    // 4. Luas Tanah Sesuai Dengan Sertifikat
    doc.text('4.  Luas Tanah Sesuai Dengan Sertifikat', lm + 10, y);
    doc.text(':', lm + 85, y);
    drawCheckbox(lm + 88, y, vfLap.luas_tanah === 'sesuai'); doc.text('Sesuai', lm + 94, y);
    drawCheckbox(lm + 110, y, vfLap.luas_tanah === 'tidak_sesuai'); doc.text('Tidak Sesuai', lm + 116, y);
    y += 8;

    // C. KESIMPULAN / CATATAN TIM VERIFIKASI
    setFont('bold', 10);
    doc.text('C. KESIMPULAN / CATATAN TIM VERIFIKASI', lm, y); y += 6;
    doc.setLineDash([1.5, 1.5]);
    doc.line(lm + 5, y, rm - 5, y);
    doc.setLineDash([]);
    y += 7;

    const isLayak = d.verifikasi_berkas_status === 'disetujui' && d.verifikasi_lapangan_status === 'disetujui';
    const isTidakLayak = d.verifikasi_berkas_status === 'ditolak' || d.verifikasi_lapangan_status === 'ditolak';

    // Rekomendasi Akhir
    doc.text('Rekomendasi Akhir:', lm, y);
    
    doc.setLineWidth(0.6);
    // Box 1: Hak Pertama
    doc.rect(lm + 35, y - 4, 5, 5);
    if (vfBerkas.hak_pertama) {
        doc.line(lm + 36, y - 1.5, lm + 37.5, y - 0.5); doc.line(lm + 37.5, y - 0.5, lm + 39.5, y - 3.5);
    }
    doc.text('PEROLEHAN HAK PERTAMA', lm + 45, y); y += 7;

    // Box 2: Layak
    doc.rect(lm + 35, y - 4, 5, 5);
    if (isLayak) {
        doc.line(lm + 36, y - 1.5, lm + 37.5, y - 0.5); doc.line(lm + 37.5, y - 0.5, lm + 39.5, y - 3.5);
    }
    doc.text('LAYAK DIBEBASKAN BPHTB', lm + 45, y); y += 7;

    // Box 3: Tidak Layak
    doc.rect(lm + 35, y - 4, 5, 5);
    if (isTidakLayak) {
        doc.line(lm + 36, y - 1.5, lm + 37.5, y - 0.5); doc.line(lm + 37.5, y - 0.5, lm + 39.5, y - 3.5);
    }
    doc.text('TIDAK LAYAK (Ditolak/Pajak Normal)', lm + 45, y); y += 10;

    // ── PENUTUP ───────────────────────────────────────────────────
    setFont('normal', 9);
    const penutup = 'Demikian Berita Acara ini dibuat dengan sebenarnya untuk digunakan sebagai dasar penetapan bebas BPHTB untuk Masyarakat Berpenghasilan Rendah (MBR).';
    const pLines  = doc.splitTextToSize(penutup, cw);
    doc.text(pLines, lm, y);
    y += pLines.length * 5 + 7;

    // ── TANDA TANGAN ──────────────────────────────────────────────
    setFont('bold', 10);
    doc.text('Tim Verifikasi Berkas / Lapangan:', lm, y); y += 7;

    const v1 = (d.nama_verifikator_berkas    || '................................').toUpperCase();
    const v2 = (d.nama_verifikator_lapangan  || '................................').toUpperCase();

    setFont('normal', 10);
    doc.text('1.  ' + v1, lm + 5, y);
    
    if (ttdAdminDataUrl && (v1.includes('ADMINISTRATOR') || v1.includes('ADMIN UTAMA') || v1.includes('ADYAR NAWAM FAHMI'))) {
        doc.addImage(ttdAdminDataUrl, 'PNG', lm + 131, y - 8, 20, 10);
    } else if (ttdWawanDataUrl && v1.includes('WAWAN AFWAN')) {
        doc.addImage(ttdWawanDataUrl, 'PNG', lm + 131, y - 8, 20, 10);
    } else if (ttdThomasDataUrl && v1.includes('THOMAS HASANUDDIN')) {
        doc.addImage(ttdThomasDataUrl, 'PNG', lm + 131, y - 8, 20, 10);
    } else if (ttdWahyuDataUrl && (v1.includes('MUHAMMAD WAHYU') || v1 === 'WAHYU')) {
        doc.addImage(ttdWahyuDataUrl, 'PNG', lm + 131, y - 8, 20, 10);
    }
    
    doc.text('(Tanda Tangan:', lm + 100, y);
    doc.line(lm + 131, y, rm, y);
    doc.text(')', rm + 1, y);
    y += 14;

    doc.text('2.  ' + v2, lm + 5, y);
    
    if (ttdAdminDataUrl && (v2.includes('ADMINISTRATOR') || v2.includes('ADMIN UTAMA') || v2.includes('ADYAR NAWAM FAHMI'))) {
        doc.addImage(ttdAdminDataUrl, 'PNG', lm + 131, y - 8, 20, 10);
    } else if (ttdWawanDataUrl && v2.includes('WAWAN AFWAN')) {
        doc.addImage(ttdWawanDataUrl, 'PNG', lm + 131, y - 8, 20, 10);
    } else if (ttdThomasDataUrl && v2.includes('THOMAS HASANUDDIN')) {
        doc.addImage(ttdThomasDataUrl, 'PNG', lm + 131, y - 8, 20, 10);
    } else if (ttdWahyuDataUrl && (v2.includes('MUHAMMAD WAHYU') || v2 === 'WAHYU')) {
        doc.addImage(ttdWahyuDataUrl, 'PNG', lm + 131, y - 8, 20, 10);
    }

    doc.text('(Tanda Tangan:', lm + 100, y);
    doc.line(lm + 131, y, rm, y);
    doc.text(')', rm + 1, y);

    const safeName = d.nama ? d.nama.replace(/[^a-zA-Z0-9\s]/g, '') : 'MBR';
    doc.save(safeName + '.pdf');
}
