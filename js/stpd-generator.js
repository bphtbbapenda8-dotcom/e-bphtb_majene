/**
 * Generate STPD PDF and return Base64 string (without data URI header)
 * @param {object} d - Data row
 * @param {number} denda - Nominal denda
 */
async function generateSTPDPDF(d, denda) {
    if (typeof window.jspdf === 'undefined' && typeof window.jsPDF === 'undefined') {
        throw new Error('Library PDF belum siap.');
    }

    const { jsPDF } = window.jspdf || { jsPDF: window.jsPDF };
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });

    let logoDataUrl = null;
    try {
        const resp = await fetch('logo.png');
        if (resp.ok) {
            const blob = await resp.blob();
            logoDataUrl = await compressImageToDataURL(blob, 300, 'image/png');
        }
    } catch(e) {}
    
    if (!logoDataUrl) {
        try {
             const logoImg = document.querySelector('img[src*="logo"]') || document.querySelector('img[alt*="Logo"]');
             if (logoImg && logoImg.complete && logoImg.naturalWidth > 0) {
                 const canvas = document.createElement('canvas');
                 canvas.width = logoImg.naturalWidth;
                 canvas.height = logoImg.naturalHeight;
                 canvas.getContext('2d').drawImage(logoImg, 0, 0);
                 logoDataUrl = canvas.toDataURL('image/png');
             }
        } catch(e) {}
    }

    const pw = 210;
    const lm = 20;
    const rm = pw - 20;
    const cw = rm - lm;

    const setFont = (style, size) => { doc.setFont('helvetica', style); doc.setFontSize(size); };
    const centerText = (text, y, size, style) => { setFont(style || 'normal', size || 11); doc.text(text, pw / 2, y, { align: 'center' }); };

    let y = 20;

    // Header
    const logoSize = 25;
    if (logoDataUrl) {
        doc.addImage(logoDataUrl, 'PNG', lm, y - 5, logoSize, logoSize);
    }

    setFont('bold', 14);
    doc.text('PEMERINTAH KABUPATEN MAJENE', pw / 2, y + 2, { align: 'center' });
    y += 6;
    setFont('bold', 14);
    doc.text('BADAN PENDAPATAN DAERAH', pw / 2, y + 2, { align: 'center' });
    y += 6;
    setFont('normal', 10);
    doc.text('Alamat: Jl Jend Gatot Subroto no 48 Majene', pw / 2, y + 2, { align: 'center' });
    y += 8;

    doc.setLineWidth(0.8); doc.line(lm, y, rm, y);
    doc.setLineWidth(0.3); doc.line(lm, y + 1.2, rm, y + 1.2);
    y += 10;

    // Title
    centerText('SURAT TAGIHAN PAJAK DAERAH (STPD)', y, 14, 'bold');
    doc.setLineWidth(0.5);
    const titleWidth = doc.getTextWidth('SURAT TAGIHAN PAJAK DAERAH (STPD)');
    doc.line((pw - titleWidth)/2, y + 1, (pw + titleWidth)/2, y + 1);
    y += 6;
    
    const thnStpd = new Date().getFullYear();
    centerText(`NOMOR: STPD /        / ${thnStpd}`, y, 12, 'bold');
    y += 15;

    // Body text
    setFont('normal', 11);
    const p1 = 'Berdasarkan Peraturan Bupati Majene Nomor 16 Tahun 2025, dilakukan penagihan sanksi administrasi kepada:';
    const lines1 = doc.splitTextToSize(p1, cw);
    doc.text(lines1, lm, y);
    y += lines1.length * 6 + 5;

    // Fields
    const fCol1 = lm;
    const fCol2 = lm + 40;
    const fCol3 = lm + 43;

    const fillLine = (lbl, val, cY) => {
        doc.text(lbl, fCol1, cY);
        doc.text(':', fCol2, cY);
        doc.text(val || '-', fCol3, cY);
        
        doc.setLineDash([1, 1], 0);
        doc.line(fCol3, cY + 1.5, rm, cY + 1.5);
        doc.setLineDash([]);
    };

    const safeNama = d.nama || '-';
    const safeAlamat = d.alamat_wp || d.alamat_op || '-';
    
    fillLine('Nama Wajib Pajak', safeNama, y); y += 8;
    fillLine('Alamat Wajib Pajak', safeAlamat, y); y += 8;
    fillLine('Tanggal Kwitansi', '', y); y += 8;
    fillLine('Tanggal Lapor', '', y); y += 12;

    const p2 = 'Hasil penelitian menunjukkan adanya keterlambatan penyampaian SPTPD melebihi batas waktu 15 (lima belas) hari kerja setelah berakhirnya masa pajak.';
    const lines2 = doc.splitTextToSize(p2, cw);
    doc.text(lines2, lm, y);
    y += lines2.length * 6 + 5;

    // Table
    const tCol1W = 15;
    const tCol3W = 40;
    const tCol2W = cw - tCol1W - tCol3W;

    doc.setLineWidth(0.3);
    // Draw table header
    doc.rect(lm, y, tCol1W, 10);
    doc.rect(lm + tCol1W, y, tCol2W, 10);
    doc.rect(rm - tCol3W, y, tCol3W, 10);

    setFont('bold', 11);
    doc.text('No', lm + tCol1W/2, y + 6, { align: 'center' });
    doc.text('Uraian Sanksi Administrasi', lm + tCol1W + tCol2W/2, y + 6, { align: 'center' });
    doc.text('Jumlah (Rp)', rm - tCol3W/2, y + 6, { align: 'center' });
    y += 10;

    // Table row 1
    doc.rect(lm, y, tCol1W, 10);
    doc.rect(lm + tCol1W, y, tCol2W, 10);
    doc.rect(rm - tCol3W, y, tCol3W, 10);
    
    setFont('normal', 11);
    doc.text('1', lm + tCol1W/2, y + 6, { align: 'center' });
    doc.text('Denda Keterlambatan Pelaporan SPTPD', lm + tCol1W + 5, y + 6);
    doc.text(denda.toLocaleString('id-ID') + ',00', rm - 5, y + 6, { align: 'right' });
    y += 10;

    // Table total
    doc.rect(lm, y, tCol1W + tCol2W, 10);
    doc.rect(rm - tCol3W, y, tCol3W, 10);
    setFont('bold', 11);
    doc.text('TOTAL HARUS DIBAYAR', lm + (tCol1W + tCol2W)/2, y + 6, { align: 'center' });
    doc.text(denda.toLocaleString('id-ID') + ',00', rm - 5, y + 6, { align: 'right' });
    y += 15;

    // Terbilang
    const terbilang = (angka) => {
        const angka_huruf = ["", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam", "Tujuh", "Delapan", "Sembilan", "Sepuluh", "Sebelas"];
        let result = "";
        if (angka < 12) {
            result = angka_huruf[angka];
        } else if (angka < 20) {
            result = terbilang(angka - 10) + " Belas";
        } else if (angka < 100) {
            result = terbilang(Math.floor(angka / 10)) + " Puluh " + terbilang(angka % 10);
        } else if (angka < 200) {
            result = "Seratus " + terbilang(angka - 100);
        } else if (angka < 1000) {
            result = terbilang(Math.floor(angka / 100)) + " Ratus " + terbilang(angka % 100);
        } else if (angka < 2000) {
            result = "Seribu " + terbilang(angka - 1000);
        } else if (angka < 1000000) {
            result = terbilang(Math.floor(angka / 1000)) + " Ribu " + terbilang(angka % 1000);
        } else if (angka < 1000000000) {
            result = terbilang(Math.floor(angka / 1000000)) + " Juta " + terbilang(angka % 1000000);
        }
        return result.trim();
    };

    setFont('bold', 11);
    doc.text(`Terbilang: # ${terbilang(denda)} Rupiah #`, lm, y);
    y += 20;

    // Footer
    const hari = new Date().getDate();
    const bln = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'][new Date().getMonth()];
    const thn = new Date().getFullYear();

    setFont('normal', 11);
    doc.text(`Majene, ${hari} ${bln} ${thn}`, rm - 30, y, { align: 'center' }); y += 6;
    doc.text('a.n Kepala Badan Pendapatan Daerah,', rm - 30, y, { align: 'center' }); y += 5;
    doc.text('Sekretaris', rm - 30, y, { align: 'center' });
    y += 25;
    
    setFont('bold', 11);
    doc.text('HASRI,S.Kom,M.Kom', rm - 30, y, { align: 'center' });
    const nmW = doc.getTextWidth('HASRI,S.Kom,M.Kom');
    doc.setLineWidth(0.5); doc.line((rm - 30) - nmW/2, y + 1, (rm - 30) + nmW/2, y + 1);
    y += 5;
    setFont('normal', 11);
    doc.text('NIP.197904012009021005', rm - 30, y, { align: 'center' });

    // Download as PDF
    doc.save('STPD_' + safeNama.replace(/[^a-zA-Z0-9]/g, '_') + '.pdf');
}
