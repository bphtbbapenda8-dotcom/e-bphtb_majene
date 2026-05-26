/**
 * Generate Berita Acara BPHTB Reguler
 * Menggunakan jsPDF (harus sudah di-load di halaman)
 * @param {object} d - Data row dari tabel pengajuan_bphtb
 */
async function generateBeritaAcaraReguler(d) {
    if (typeof window.jspdf === 'undefined' && typeof window.jsPDF === 'undefined') {
        Swal.fire({ icon: 'error', title: 'Library PDF belum siap', text: 'Silakan tunggu sebentar lalu coba lagi.' });
        return;
    }

    // ── Roman numerals helper ─────────────────────────────────────
    const toRoman = (n) => {
        const r = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'];
        return r[n - 1] || String(n);
    };

    // ── Get sequence number ───────
    let seqNum = 1;
    try {
        const { data: verifiedList } = await db.from('pengajuan_bphtb')
            .select('no_pengajuan, created_at')
            .in('alur_berkas', ['Pembayaran', 'Pembayaran sedang diverifikasi', 'Selesai'])
            .order('created_at', { ascending: true });

        if (verifiedList && verifiedList.length > 0) {
            const idx = verifiedList.findIndex(r => r.no_pengajuan === d.no_pengajuan);
            seqNum = idx >= 0 ? idx + 1 : verifiedList.length;
        }
    } catch(e) {
        console.warn('Tidak bisa ambil nomor urut:', e);
    }

    // ── Date ─
    const tglSrc = d.updated_at || d.created_at || new Date().toISOString();
    const tgl        = new Date(tglSrc);
    const hari       = String(tgl.getDate()).padStart(2, '0');
    const bulanAngka = tgl.getMonth() + 1;
    const bulanNama  = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'][tgl.getMonth()];
    const bulanRoman = toRoman(bulanAngka);
    const tahun      = tgl.getFullYear();
    const hariNama   = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'][tgl.getDay()];

    const tahunMap = {
        2024:'Dua Ribu Dua Puluh Empat',
        2025:'Dua Ribu Dua Puluh Lima',
        2026:'Dua Ribu Dua Puluh Enam',
        2027:'Dua Ribu Dua Puluh Tujuh'
    };
    const tahunTerbilang = tahunMap[tahun] || String(tahun);

    // ── Document number ─────────
    const nomorDoc = `${String(seqNum).padStart(3,'0')}/Verifikasi/BPHTB-REG/${bulanRoman}/${tahun}`;

    // ── Load logo from server ─────────────────────────────────────
    let logoDataUrl = null;
    try {
        const resp = await fetch('logo.png');
        if (resp.ok) {
            const blob = await resp.blob();
            logoDataUrl = await compressImageToDataURL(blob, 300, 'image/png');
        }
    } catch(e) {
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
    
    // Helper to format currency
    const fmtRupiah = (val) => {
        if (!val) return '0';
        return parseInt(val).toLocaleString('id-ID');
    };

    let y = 15;

    // ── HEADER: Logo kiri + teks tengah ──────────────────────────
    const logoSize = 22;
    const headerTopY = y;

    if (logoDataUrl) {
        doc.addImage(logoDataUrl, 'PNG', lm, headerTopY - 2, logoSize, logoSize);
    }

    setFont('bold', 13);
    doc.text('PEMERINTAH KABUPATEN MAJENE', pw / 2, y + 3, { align: 'center' });
    y += 5;
    setFont('bold', 12);
    doc.text('BADAN PENDAPATAN DAERAH', pw / 2, y + 3, { align: 'center' });
    y += 4;
    setFont('normal', 9);
    doc.text('Jl. Jend. Gatot Subroto No. 58 Majene', pw / 2, y + 3, { align: 'center' });
    y += 5;

    if (logoDataUrl) {
        y = Math.max(y, headerTopY + logoSize + 1);
    }

    // Garis tebal bawah header
    doc.setLineWidth(0.8); doc.line(lm, y, rm, y);
    doc.setLineWidth(0.3); doc.line(lm, y + 1.2, rm, y + 1.2);
    y += 8;

    // ── JUDUL ─────────────────────────────────────────────────────
    centerText('BERITA ACARA HASIL VERIFIKASI ADMINISTRASI DAN LAPANGAN', y, 11, 'bold'); y += 5;
    centerText('BEA PEROLEHAN HAK ATAS TANAH DAN BANGUNAN (BPHTB)', y, 11, 'bold'); y += 6;
    centerText('NOMOR: ' + nomorDoc, y, 11, 'bold'); y += 8;

    // ── KALIMAT PEMBUKA ───────────────────────────────────────────
    setFont('normal', 9.5);
    const bukaText = `Pada hari ini, ${hariNama} tanggal ${hari} bulan ${bulanNama} tahun ${tahunTerbilang}, kami yang bertandatangan di bawah ini, Tim Verifikasi BPHTB berdasarkan Keputusan Kepala Badan Pendapatan Daerah Kabupaten Majene Nomor [...], telah melakukan pemeriksaan administrasi berkas dan peninjauan lapangan atas objek pajak BPHTB dengan data sebagai berikut:`;
    const bukaLines = doc.splitTextToSize(bukaText, cw);
    doc.text(bukaLines, lm, y);
    y += bukaLines.length * 4.5 + 3;

    // ── I. DATA SUBJEK DAN OBJEK PAJAK ────────────────────────────
    setFont('bold', 9.5);
    doc.text('I. DATA SUBJEK DAN OBJEK PAJAK (BERDASARKAN LAPORAN WP/PPAT)', lm, y); y += 6;

    const fieldLine = (num, label, value, yPos) => {
        setFont('normal', 9.5);
        doc.text(num + '.', lm + 4, yPos);
        doc.text(label, lm + 10, yPos);
        doc.text(':', lm + 55, yPos);
        setFont('bold', 9.5);
        const lines = doc.splitTextToSize(value || '-', cw - 60);
        doc.text(lines, lm + 58, yPos);
        return lines.length;
    };

    y += fieldLine('1', 'Nama Wajib Pajak', d.nama, y) * 5;
    y += fieldLine('2', 'NIK / NPWPD', d.nik, y) * 5;
    y += fieldLine('3', 'Alamat Wajib Pajak', d.alamat_wp || '-', y) * 5;
    y += fieldLine('4', 'NOP PBB', d.nop, y) * 5;
    y += fieldLine('5', 'Letak Objek Pajak', d.alamat_op || d.letak_tanah_bangunan || '-', y) * 5;
    y += fieldLine('6', 'Jenis Perolehan Hak', String(d.jenis_perolehan || '-').replace(/_/g, ' ').toUpperCase(), y) * 5;
    y += fieldLine('7', 'Nama Penjual / Pemilik Asal', d.nama_penjual || '-', y) * 5;
    y += fieldLine('8', 'Nama Notaris / PPAT', d.notaris || '-', y) * 5;
    y += 2;

    // ── II. HASIL VERIFIKASI ADMINISTRASI (BERKAS) ────────────────
    setFont('bold', 9.5);
    doc.text('II. HASIL VERIFIKASI ADMINISTRASI (BERKAS)', lm, y); y += 5;
    
    setFont('normal', 9.5);
    const textBerkas = 'Berdasarkan hasil penelitian kelengkapan berkas pendukung yang diunggah/diserahkan melalui aplikasi e-BPHTB / manual, Tim menyatakan:';
    const linesBerkas = doc.splitTextToSize(textBerkas, cw);
    doc.text(linesBerkas, lm, y);
    y += linesBerkas.length * 4.5 + 2;

    const isLengkap = ['Pembayaran', 'Pembayaran sedang diverifikasi', 'Selesai'].includes(d.alur_berkas);

    doc.text('1.  Kelengkapan Dokumen', lm + 4, y); doc.text(':', lm + 55, y);
    setFont('bold', 9.5); doc.text(isLengkap ? '[ LENGKAP ]' : '[ LENGKAP / TIDAK LENGKAP ]', lm + 58, y); setFont('normal', 9.5);
    y += 5;

    doc.text('2.  Kesesuaian Dokumen :', lm + 4, y); y += 5;
    doc.text('o  Identitas pada KTP dengan sertifikat/alas hak', lm + 10, y); doc.text(':', lm + 85, y);
    setFont('bold', 9.5); doc.text(isLengkap ? '[ SESUAI ]' : '[ SESUAI / TIDAK SESUAI ]', lm + 88, y); setFont('normal', 9.5);
    y += 5;
    
    doc.text('o  Bukti transaksi (Kuitansi/Perjanjian) dengan SSPD', lm + 10, y); doc.text(':', lm + 85, y);
    setFont('bold', 9.5); doc.text(isLengkap ? '[ SESUAI ]' : '[ SESUAI / TIDAK SESUAI ]', lm + 88, y); setFont('normal', 9.5);
    y += 5;

    doc.text('3.  Perolehan Hak Pertama', lm + 4, y); doc.text(':', lm + 55, y);
    setFont('bold', 9.5); doc.text(d.is_hak_pertama ? '[ Ya ]' : '[ Ya / Tidak ]', lm + 58, y); setFont('normal', 9.5);
    y += 7;

    // Check if need new page
    if (y > 230) { doc.addPage(); y = 20; }

    // ── III. HASIL VERIFIKASI LAPANGAN (FISIK/OBJEK) ──────────────
    setFont('bold', 9.5);
    doc.text('III. HASIL VERIFIKASI LAPANGAN (FISIK/OBJEK)', lm, y); y += 5;
    
    setFont('normal', 9.5);
    const textLap = 'Berdasarkan hasil peninjauan dan pengukuran langsung di lokasi objek pajak, ditemukan data fisik pembanding sebagai berikut:';
    const linesLap = doc.splitTextToSize(textLap, cw);
    doc.text(linesLap, lm, y);
    y += linesLap.length * 4.5 + 3;

    // Draw Table
    const colWidths = [35, 45, 45, 45];
    const rowHeight = 12;
    const headerHeight = 12;
    let ty = y;

    doc.setLineWidth(0.2);
    // Header
    doc.rect(lm, ty, colWidths[0], headerHeight);
    doc.rect(lm + colWidths[0], ty, colWidths[1], headerHeight);
    doc.rect(lm + colWidths[0] + colWidths[1], ty, colWidths[2], headerHeight);
    doc.rect(lm + colWidths[0] + colWidths[1] + colWidths[2], ty, colWidths[3], headerHeight);

    setFont('bold', 9);
    doc.text('Komponen\nPenilaian', lm + colWidths[0]/2, ty + 5, {align: 'center'});
    doc.text('Berdasarkan\nSSPD (Dilaporkan\nWP)', lm + colWidths[0] + colWidths[1]/2, ty + 4, {align: 'center'});
    doc.text('Berdasarkan\nTemuan Fisik\nLapangan', lm + colWidths[0] + colWidths[1] + colWidths[2]/2, ty + 4, {align: 'center'});
    doc.text('Kesimpulan Tim\nVerifikasi', lm + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3]/2, ty + 5, {align: 'center'});
    ty += headerHeight;

    setFont('normal', 9);
    const drawRow = (c1, c2, c3, c4) => {
        doc.rect(lm, ty, colWidths[0], rowHeight);
        doc.rect(lm + colWidths[0], ty, colWidths[1], rowHeight);
        doc.rect(lm + colWidths[0] + colWidths[1], ty, colWidths[2], rowHeight);
        doc.rect(lm + colWidths[0] + colWidths[1] + colWidths[2], ty, colWidths[3], rowHeight);
        
        doc.text(c1, lm + 3, ty + 6);
        doc.text(c2, lm + colWidths[0] + 3, ty + 6);
        doc.text(c3, lm + colWidths[0] + colWidths[1] + 3, ty + 6);
        doc.text(c4, lm + colWidths[0] + colWidths[1] + colWidths[2] + 3, ty + 6);
        ty += rowHeight;
    };

    drawRow('Luas Tanah (M\u00B2)', String(d.luas_bumi||''), String(d.luas_bumi||''), '[ Sesuai / Selisih ]');
    drawRow('Luas Bangunan (M\u00B2)', String(d.luas_bangunan||''), String(d.luas_bangunan||''), '[ Sesuai / Selisih ]');
    drawRow('Kondisi Bangunan', '.........', '.........', '[ Kosong / Rumah Tinggal\n/ Ruko / Konstruksi ]');
    drawRow('Nilai Transaksi /\nNPOP', 'Rp. ' + fmtRupiah(d.nilai_transaksi), 'Rp. ' + fmtRupiah(d.nilai_transaksi), '[ Wajar / Di bawah harga\npasar ]');

    y = ty + 5;
    doc.setFont('helvetica', 'italic'); doc.setFontSize(9.5);
    doc.text('Catatan Temuan Lapangan:', lm, y); y += 5;
    doc.setLineDash([0.5, 0.5]);
    doc.line(lm, y, rm, y); y += 6;
    doc.line(lm, y, rm, y); y += 6;
    doc.line(lm, y, rm, y); y += 6;
    doc.setLineDash([]);

    if (y > 230) { doc.addPage(); y = 20; }

    // ── IV. KESIMPULAN DAN PERHITUNGAN ────────────────────────────
    setFont('bold', 9.5);
    doc.text('IV. KESIMPULAN DAN PERHITUNGAN PENETAPAN BPHTB', lm, y); y += 5;
    
    setFont('normal', 9.5);
    const textKesimpulan = 'Berdasarkan hasil verifikasi administrasi dan lapangan tersebut di atas, maka Tim Verifikasi BPHTB menetapkan besaran nilai sebagai dasar pengenaan pajak yang sah sebagai berikut:';
    const linesKesimpulan = doc.splitTextToSize(textKesimpulan, cw);
    doc.text(linesKesimpulan, lm, y);
    y += linesKesimpulan.length * 4.5 + 2;

    const npop = Math.max(d.total_njop || 0, d.nilai_transaksi || 0);
    const npoptkp = 60000000; // Standar default, kalau di DB ada npoptkp bisa d.npoptkp
    let npopkp = npop - npoptkp;
    if (npopkp < 0) npopkp = 0;
    const bphtb = Math.floor(npopkp * 0.05);

    doc.text('1. Nilai Perolehan Objek Pajak (NPOP) ditetapkan', lm + 4, y); doc.text(': Rp. ' + fmtRupiah(npop), lm + 95, y); y += 5;
    doc.text('2. Nilai Perolehan Objek Pajak Tidak Kena Pajak', lm + 4, y); doc.text(': Rp. ' + fmtRupiah(npoptkp), lm + 95, y); y += 5;
    doc.text('3. Nilai Perolehan Objek Pajak Kena Pajak (NPOPKP)', lm + 4, y); doc.text(': Rp. ' + fmtRupiah(npopkp), lm + 95, y); y += 5;
    doc.text('4. BPHTB Terutang (5% x NPOPKP)', lm + 4, y); doc.text(': Rp. ' + fmtRupiah(bphtb), lm + 95, y); y += 5;
    doc.text('5. TOTAL BPHTB YANG HARUS DIBAYAR', lm + 4, y); 
    setFont('bold', 9.5);
    doc.text(': Rp. ' + fmtRupiah(d.pajak_ditetapkan || bphtb), lm + 95, y); 
    setFont('normal', 9.5);
    y += 8;

    setFont('bold', 9.5);
    doc.text('Rekomendasi Tim:', lm, y); y += 5;

    // Checkboxes
    const drawCheckText = (cy, text, isChecked) => {
        doc.setLineWidth(0.3);
        doc.rect(lm, cy - 3.5, 4, 4);
        if (isChecked) {
            doc.line(lm + 0.8, cy - 1.5, lm + 1.8, cy - 0.5);
            doc.line(lm + 1.8, cy - 0.5, lm + 3.2, cy - 3.0);
        }
        setFont('normal', 9);
        const lines = doc.splitTextToSize(text, cw - 6);
        doc.text(lines, lm + 6, cy);
        return lines.length * 4.5 + 2;
    };

    y += drawCheckText(y, 'DISETUJUI sesuai pelaporan awal Wajib Pajak.', isLengkap);
    y += drawCheckText(y, 'DIKOREKSI / DISESUAIKAN berdasarkan nilai pasar wajar / luas fisik hasil temuan lapangan (Wajib Pajak melakukan pembayaran sesuai hasil koreksi).', false);
    y += drawCheckText(y, 'DITOLAK karena dokumen tidak valid / tidak sesuai peruntukan fasilitas MBR.', d.alur_berkas === 'Berkas ditolak');

    y += 4;
    const penutup = 'Demikian Berita Acara ini dibuat dalam rangkap yang cukup untuk dipergunakan sebagaimana mestinya sebagai dasar penetapan Surat Setoran Pajak Daerah (SSPD) BPHTB Kabupaten Majene.';
    const pLines  = doc.splitTextToSize(penutup, cw);
    doc.text(pLines, lm, y);
    y += pLines.length * 4.5 + 5;

    if (y > 240) { doc.addPage(); y = 20; }

    doc.text('Majene, .........................................', pw / 2 + 10, y); y += 8;

    setFont('bold', 9.5);
    doc.text('Tim Verifikasi Berkas / Lapangan:', lm, y); y += 10;

    setFont('normal', 9.5);
    doc.text('1.', lm + 5, y);
    doc.text('2.', pw / 2 + 10, y);
    
    y += 18; 

    doc.text('(Tanda Tangan:', lm + 5, y);
    doc.line(lm + 32, y, lm + 75, y);
    doc.text(')', lm + 76, y);

    doc.text('(Tanda Tangan:', pw / 2 + 10, y);
    doc.line(pw / 2 + 37, y, pw / 2 + 80, y);
    doc.text(')', pw / 2 + 81, y);

    const safeName = d.nama ? d.nama.replace(/[^a-zA-Z0-9\s]/g, '') : 'REGULER';
    doc.save('Berita_Acara_Reguler_' + safeName + '.pdf');
}
