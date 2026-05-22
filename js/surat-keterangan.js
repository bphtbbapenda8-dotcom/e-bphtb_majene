/**
 * Generate Surat Keterangan Pembebasan BPHTB PDF untuk pengajuan MBR
 */
async function generateSuratKeteranganMBR(d) {
    if (typeof window.jspdf === 'undefined' && typeof window.jsPDF === 'undefined') {
        Swal.fire({ icon: 'error', title: 'Library PDF belum siap', text: 'Silakan tunggu sebentar lalu coba lagi.' });
        return;
    }

    const toRoman = (n) => ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'][n - 1] || String(n);

    // Use sequence number and date from data provided by admin
    const seqNum = d.no_urut || 1;
    const tgl = d.tanggal_surat_keterangan ? new Date(d.tanggal_surat_keterangan) : new Date();
    
    const hari       = tgl.getDate();
    const bulanAngka = tgl.getMonth() + 1;
    const bulanNama  = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'][tgl.getMonth()];
    const bulanRoman = toRoman(bulanAngka);
    const tahun      = tgl.getFullYear();

    const nomorDoc = `${String(seqNum).padStart(3,'0')}/MBR-BPHTB/${bulanRoman}/${tahun}`;

    // Load logo
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

    const { jsPDF } = window.jspdf || { jsPDF: window.jsPDF };
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });

    const pw = 210, lm = 20, rm = pw - 20, cw = rm - lm;

    const setFont     = (style, size) => { doc.setFont('times', style); doc.setFontSize(size); };
    const centerText  = (text, y, size, style) => { setFont(style || 'normal', size || 11); doc.text(text, pw / 2, y, { align: 'center' }); };
    
    // helper for multiline fields with precise indentation
    const fieldLine = (label, value, y, lw) => {
        lw = lw || 45;
        setFont('bold', 11);
        doc.text(label, lm, y);
        doc.text(':', lm + lw, y);
        setFont('normal', 11);
        const lines = doc.splitTextToSize(value || '-', cw - lw - 2);
        doc.text(lines, lm + lw + 2, y);
        return lines.length;
    };

    let y = 14;
    const logoSize = 18;
    if (logoDataUrl) {
        doc.addImage(logoDataUrl, 'PNG', lm, y - 2, logoSize, logoSize);
    }

    setFont('bold', 15);
    doc.text('PEMERINTAH KABUPATEN MAJENE', pw / 2, y + 4, { align: 'center' });
    doc.text('BADAN PENDAPATAN DAERAH', pw / 2, y + 10, { align: 'center' });
    setFont('normal', 11);
    doc.text('Alamat : Jl. Jend Gatot Subroto No. 53 Majene', pw / 2, y + 16, { align: 'center' });
    y += 20;

    doc.setLineWidth(1.0); doc.line(lm, y, rm, y);
    doc.setLineWidth(0.3); doc.line(lm, y + 1.2, rm, y + 1.2);
    y += 10;

    centerText('SURAT KETERANGAN PEMBEBASAN BPHTB', y, 13, 'bold'); 
    doc.setLineWidth(0.3); 
    doc.line(pw / 2 - 47, y + 1, pw / 2 + 47, y + 1);
    y += 6;
    centerText('Nomor: ' + nomorDoc, y, 11, 'normal'); y += 12;

    setFont('normal', 11);
    doc.text('Yang bertanda tangan di bawah ini:', lm, y); y += 7;
    
    let yT = y;
    yT += fieldLine('Nama', 'Drs. H. ABDUL RAHIM,MM., CGCAE', yT, 30) * 5.5;
    yT += fieldLine('Jabatan', 'Kepala Badan Pendapatan Daerah Kabupaten Majene', yT, 30) * 5.5;
    yT += fieldLine('Alamat Kantor', 'Jl. Jend Gatot Subroto No 53 Majene', yT, 30) * 5.5;
    y = yT + 4;

    setFont('normal', 11);
    doc.text('Dengan ini menerangkan bahwa:', lm, y); y += 7;
    
    yT = y;
    yT += fieldLine('Nama', d.nama || '-', yT, 30) * 5.5;
    yT += fieldLine('NIK', d.nik || '-', yT, 30) * 5.5;
    const tglLahirStr = d.tanggal_lahir ? new Date(d.tanggal_lahir).toLocaleDateString('id-ID') : '-';
    yT += fieldLine('Tempat/Tgl Lahir', (d.tempat_lahir || '-') + ', ' + tglLahirStr, yT, 30) * 5.5;
    yT += fieldLine('Alamat', d.alamat_wp || '-', yT, 30) * 5.5;
    y = yT + 2;

    const paragraf1 = 'adalah Masyarakat Berpenghasilan Rendah yang telah mengajukan permohonan pembebasan Bea Perolehan Hak atas Tanah dan Bangunan (BPHTB) sebagaimana diatur dalam Peraturan Bupati Majene Nomor 14 Tahun 2024.';
    const p1Lines = doc.splitTextToSize('        ' + paragraf1, cw);
    setFont('normal', 11);
    doc.text(p1Lines, lm, y, { align: 'justify', maxWidth: cw }); y += p1Lines.length * 5.5 + 2;

    const paragraf2 = 'Setelah dilakukan verifikasi administrasi dan lapangan oleh Tim Bapenda, yang bersangkutan telah memenuhi persyaratan dan dinyatakan berhak mendapatkan pembebasan BPHTB atas perolehan hak berikut ini:';
    const p2Lines = doc.splitTextToSize('        ' + paragraf2, cw);
    doc.text(p2Lines, lm, y, { align: 'justify', maxWidth: cw }); y += p2Lines.length * 5.5 + 4;

    yT = y;
    yT += fieldLine('Jenis Perolehan Hak', 'Jual Beli', yT, 50) * 5.5;
    yT += fieldLine('Nomor Perjanjian Kredit', (d.nomor_perjanjian_kredit || '-') + ' (' + (d.bank || '-') + ')', yT, 50) * 5.5;
    yT += fieldLine('NOP', d.nop || '-', yT, 50) * 5.5;
    
    let letak = [];
    if (d.letak_tanah_bangunan) letak.push(d.letak_tanah_bangunan);
    if (d.kelurahan) letak.push('Kel/Desa ' + d.kelurahan);
    if (d.kecamatan) letak.push('Kec. ' + d.kecamatan);
    yT += fieldLine('Letak Tanah/Bangunan', letak.join(', ') || '-', yT, 50) * 5.5;
    
    yT += fieldLine('Luas Tanah', (d.luas_bumi || 0) + ' m\u00B2', yT, 50) * 5.5;
    yT += fieldLine('Luas Bangunan', (d.luas_bangunan || 0) + ' m\u00B2', yT, 50) * 5.5;
    yT += fieldLine('Harga Transaksi', 'Rp. ' + (d.nilai_transaksi || 0).toLocaleString('id-ID'), yT, 50) * 5.5;
    y = yT + 2;

    const paragraf3 = 'Berdasarkan hal tersebut, maka yang bersangkutan dibebaskan dari kewajiban membayar BPHTB atas perolehan hak dimaksud. Surat ini dapat digunakan sebagai dokumen pendukung dalam proses pendaftaran peralihan hak di Kantor Pertanahan dan sebagai arsip hukum.';
    const p3Lines = doc.splitTextToSize('        ' + paragraf3, cw);
    setFont('normal', 11);
    doc.text(p3Lines, lm, y, { align: 'justify', maxWidth: cw }); y += p3Lines.length * 5.5 + 2;

    const paragraf4 = 'Demikian surat keterangan ini dibuat untuk dipergunakan sebagaimana mestinya.';
    const p4Lines = doc.splitTextToSize('        ' + paragraf4, cw);
    doc.text(p4Lines, lm, y); y += p4Lines.length * 5.5 + 8;

    // Signature
    setFont('normal', 11);
    const signatureX = pw - lm - 65;
    doc.text(`Majene, ${hari} ${bulanNama} ${tahun}`, signatureX, y); y += 5.5;
    doc.text('Kepala Badan', signatureX, y); y += 14;

    doc.text('${ttd_pengirim}', signatureX + 10, y); y += 20; // Ditambah jarak enter satu kali

    setFont('bold', 11);
    doc.text('Drs. H. ABDUL RAHIM,MM., CGCAE', signatureX, y); 
    // underline name
    const nameWidth = doc.getTextWidth('Drs. H. ABDUL RAHIM,MM., CGCAE');
    doc.setLineWidth(0.3);
    doc.line(signatureX, y + 1, signatureX + nameWidth, y + 1);
    y += 5.5;
    
    setFont('normal', 11);
    doc.text('NIP. 19670827 199002 1 002', signatureX, y);

    const safeName = d.nama ? d.nama.replace(/[^a-zA-Z0-9]/g, '_') : 'MBR';
    doc.save('Surat_Keterangan_BPHTB_' + safeName + '.pdf');
}
