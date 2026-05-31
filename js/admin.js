/**
 * admin.js — Alpine.js component for Akses Admin (BPHTB & MBR)
 * Used by: admin-bphtb.html and admin-mbr.html
 * @param {string} type - 'bphtb' or 'mbr'
 */

function adminApp(type) {
    return {
        type,
        data: [],
        loading: false,
        filterNotaris: '',
        filterStatus: '',
        searchWP: '',
        showManageModal: false,
        selectedBerkas: null,

        // Modal Surat Keterangan
        showSuratModal: false,
        suratTanggal: '',
        suratNoUrut: '',

        // File upload objects (Main Resi)
        resiFileObj: null,
        resiFileName: '',

        // File upload objects (STPD Berkas)
        stpdFileObj: null,
        stpdFileName: '',

        // File upload objects (STPD Resi)
        stpdResiFileObj: null,
        stpdResiFileName: '',

        // File upload objects (Surat Keterangan Selesai)
        suratSelesaiFileObj: null,
        suratSelesaiFileName: '',

        // Form tindakan admin
        adminForm: {
            alur_berkas: '',
            pajak: 0,
            dispPajak: '',
            no_validasi: '',
            catatan_penolakan: '',

            // STPD states
            isStpdActive: false,
            stpd_denda: 100000,
            dispStpdDenda: '100.000',
            stpd_no_register: '',
            stpd_tanggal_kwitansi: '',
            stpd_status: ''
        },

        get listNotaris() { return LIST_NOTARIS; },
        get isMbr() { return this.type === 'mbr'; },
        get accentColor() { return this.isMbr ? 'green' : 'blue'; },

        init() {
            this.fetchData();
        },

        async fetchData() {
            this.loading = true;
            this.data = [];
            try {
                let q;
                if (this.isMbr) {
                    q = db.from('pengajuan_mbr')
                        .select('*')
                        .order('created_at', { ascending: false });
                } else {
                    q = db.from('pengajuan_bphtb')
                        .select('*')
                        .order('created_at', { ascending: false });
                }

                if (this.filterNotaris) {
                    if (this.filterNotaris === 'mandiri/perseorangan') {
                        q = q.ilike('notaris', 'mandiri/perseorangan%');
                    } else {
                        q = q.eq('notaris', this.filterNotaris);
                    }
                }
                if (this.filterStatus) {
                    q = q.eq('alur_berkas', this.filterStatus);
                }

                const result = await q;
                if (result.error) throw new Error(result.error.message);

                let rawData = result.data || [];
                if (this.searchWP.trim()) {
                    const search = this.searchWP.toLowerCase().trim();
                    rawData = rawData.filter(item => 
                        (item.nama && item.nama.toLowerCase().includes(search)) || 
                        (item.no_pengajuan && item.no_pengajuan.toLowerCase().includes(search)) ||
                        (item.nik && item.nik.toLowerCase().includes(search))
                    );
                }
                this.data = rawData;
            } catch (err) {
                console.error('[Admin] fetchData error:', err);
                Swal.fire({
                    icon: 'error',
                    title: 'Gagal Memuat Data',
                    html: `<div style="text-align:left;font-size:.875rem">${err.message}</div>`,
                    confirmButtonColor: '#dc2626'
                });
            } finally {
                this.loading = false;
            }
        },

        resetFilter() {
            this.filterNotaris = '';
            this.filterStatus = '';
            this.searchWP = '';
            this.fetchData();
        },

        openManageModal(item) {
            this.selectedBerkas = item;
            
            // Populate form
            this.adminForm.alur_berkas = item.alur_berkas || 'Berkas sedang diverifikasi';
            this.adminForm.pajak = item.pajak || 0;
            this.adminForm.dispPajak = item.pajak ? fmtRpDisplay(item.pajak) : '';
            this.adminForm.no_validasi = item.no_validasi || '';
            this.adminForm.catatan_penolakan = item.catatan_penolakan || '';

            // Populate STPD states
            this.adminForm.isStpdActive = (item.stpd_denda > 0) || !!item.url_berkas_stpd || !!item.stpd_status;
            this.adminForm.stpd_denda = item.stpd_denda ? item.stpd_denda : 100000;
            this.adminForm.dispStpdDenda = fmtRpDisplay(this.adminForm.stpd_denda);
            this.adminForm.stpd_status = item.stpd_status || '';
            this.adminForm.stpd_no_register = item.stpd_no_register || '';
            this.adminForm.stpd_tanggal_kwitansi = item.stpd_tanggal_kwitansi || '';

            // Reset upload file handlers
            this.resiFileObj = null;
            this.resiFileName = '';
            this.stpdFileObj = null;
            this.stpdFileName = '';
            this.stpdResiFileObj = null;
            this.stpdResiFileName = '';
            this.suratSelesaiFileObj = null;
            this.suratSelesaiFileName = '';

            this.showManageModal = true;
        },

        onPajakInput(e) {
            const raw = onlyNum(e.target.value);
            this.adminForm.pajak = parseInt(raw) || 0;
            this.adminForm.dispPajak = fmtRpDisplay(raw);
        },

        onStpdDendaInput(e) {
            const raw = onlyNum(e.target.value);
            this.adminForm.stpd_denda = parseInt(raw) || 0;
            this.adminForm.dispStpdDenda = fmtRpDisplay(raw);
        },

        // ── Handle file selections ─────────────────────────────────
        handleResiFile(e) {
            const file = e.target.files[0];
            if (!file) return;
            if (file.type !== 'application/pdf') {
                Swal.fire({ icon: 'warning', title: 'Format Tidak Valid', text: 'Resi Pembayaran harus berupa PDF.', confirmButtonColor: '#dc2626' });
                e.target.value = ''; return;
            }
            this.resiFileObj = file;
            this.resiFileName = file.name;
        },

        handleSTPDFile(e) {
            const file = e.target.files[0];
            if (!file) return;
            if (file.type !== 'application/pdf') {
                Swal.fire({ icon: 'warning', title: 'Format Tidak Valid', text: 'Berkas STPD harus berupa PDF.', confirmButtonColor: '#dc2626' });
                e.target.value = ''; return;
            }
            this.stpdFileObj = file;
            this.stpdFileName = file.name;
        },

        handleSTPDResiFile(e) {
            const file = e.target.files[0];
            if (!file) return;
            if (file.type !== 'application/pdf') {
                Swal.fire({ icon: 'warning', title: 'Format Tidak Valid', text: 'Resi STPD harus berupa PDF.', confirmButtonColor: '#dc2626' });
                e.target.value = ''; return;
            }
            this.stpdResiFileObj = file;
            this.stpdResiFileName = file.name;
        },

        handleSuratSelesaiFile(e) {
            const file = e.target.files[0];
            if (!file) return;
            if (file.type !== 'application/pdf') {
                Swal.fire({ icon: 'warning', title: 'Format Tidak Valid', text: 'Surat Keterangan harus berupa PDF.', confirmButtonColor: '#dc2626' });
                e.target.value = ''; return;
            }
            this.suratSelesaiFileObj = file;
            this.suratSelesaiFileName = file.name;
        },

        // ── Save Admin Changes ──────────────────────────────────────
        async saveAdminChanges() {
            if (!this.selectedBerkas) return;
            this.loading = true;

            try {
                const status = this.adminForm.alur_berkas;
                let linkResi = this.selectedBerkas.link_resi;
                let urlBerkasStpd = this.selectedBerkas.url_berkas_stpd;
                let urlResiStpd = this.selectedBerkas.url_resi_stpd;
                let urlSuratSelesai = this.selectedBerkas.url_surat_selesai;

                // Validasi input wajib untuk Resi Pembayaran
                if (status === 'Pembayaran' && !linkResi && !this.resiFileObj) {
                    throw new Error('Anda wajib mengunggah file Resi Pembayaran BAPENDA.');
                }


                // 1. If status is Payment, check if a resi must be uploaded
                if (status === 'Pembayaran' && this.resiFileObj) {
                    Swal.fire({
                        title: 'Mengunggah Resi...',
                        text: 'Menyimpan resi ke Google Drive',
                        allowOutsideClick: false,
                        didOpen: () => Swal.showLoading()
                    });

                    const formData = new FormData();
                    formData.append('aksi', 'upload_file_saja');
                    formData.append('nik', this.selectedBerkas.nik);
                    formData.append('resi_file', await toBase64(this.resiFileObj));

                    const scriptRes = await fetch(CONFIG.SCRIPT_URL, { method: 'POST', body: formData });
                    const scriptResult = await scriptRes.json();
                    if (scriptResult.result !== 'success') throw new Error('Gagal mengupload resi: ' + (scriptResult.error || 'Unknown'));
                    
                    if (!scriptResult.url_resi) {
                        throw new Error('Gagal mengupload resi. URL resi tidak dikembalikan oleh server. Pastikan Anda telah memperbarui kode Google Apps Script (Code.gs) Anda.');
                    }
                    linkResi = scriptResult.url_resi;
                }

                // 2. STPD Resi uploads
                if (this.adminForm.isStpdActive) {
                    if (this.stpdResiFileObj) {
                        Swal.fire({
                            title: 'Mengunggah Resi STPD...',
                            text: 'Menyimpan resi STPD ke Google Drive',
                            allowOutsideClick: false,
                            didOpen: () => Swal.showLoading()
                        });

                        const formData = new FormData();
                        formData.append('aksi', 'upload_file_saja');
                        formData.append('nik', this.selectedBerkas.nik);
                        formData.append('resi_stpd_file', await toBase64(this.stpdResiFileObj));

                        const scriptRes = await fetch(CONFIG.SCRIPT_URL, { method: 'POST', body: formData });
                        const scriptResult = await scriptRes.json();
                        if (scriptResult.result !== 'success') throw new Error('Gagal mengupload resi STPD: ' + (scriptResult.error || 'Unknown'));
                        
                        if (!scriptResult.url_resi_stpd) {
                            throw new Error('Gagal mengupload resi STPD. URL resi tidak dikembalikan oleh server.');
                        }
                        urlResiStpd = scriptResult.url_resi_stpd;
                    }
                }

                // 3. Surat Selesai file uploads
                if (status === 'Selesai' && this.suratSelesaiFileObj) {
                    Swal.fire({
                        title: 'Mengunggah Surat...',
                        text: 'Menyimpan Surat Keterangan ke Google Drive',
                        allowOutsideClick: false,
                        didOpen: () => Swal.showLoading()
                    });

                    const formData = new FormData();
                    formData.append('aksi', 'upload_file_saja');
                    formData.append('nik', this.selectedBerkas.nik);
                    formData.append('surat_selesai_file', await toBase64(this.suratSelesaiFileObj));

                    const scriptRes = await fetch(CONFIG.SCRIPT_URL, { method: 'POST', body: formData });
                    const scriptResult = await scriptRes.json();
                    if (scriptResult.result !== 'success') throw new Error('Gagal mengupload Surat Keterangan: ' + (scriptResult.error || 'Unknown'));
                    
                    if (!scriptResult.url_surat_selesai) {
                        throw new Error('Gagal mengupload Surat Keterangan. URL tidak dikembalikan oleh server. Pastikan skrip Google Apps Script sudah di-update.');
                    }
                    urlSuratSelesai = scriptResult.url_surat_selesai;
                }

                // 4. Assemble Payload
                const updateData = {
                    alur_berkas: status,
                    pajak: (['Pembayaran', 'Pembayaran sedang diverifikasi', 'Selesai'].includes(status)) 
                        ? this.adminForm.pajak 
                        : (status === 'Berkas ditolak' ? (this.selectedBerkas.pajak || 0) : 0),
                    no_validasi: status === 'Selesai' ? this.adminForm.no_validasi : null,
                    catatan_penolakan: status === 'Berkas ditolak' ? this.adminForm.catatan_penolakan : null,
                    link_resi: linkResi,
                    url_surat_selesai: urlSuratSelesai
                };

                // STPD payload mapping
                if (this.adminForm.isStpdActive) {
                    updateData.stpd_denda = this.adminForm.stpd_denda;
                    updateData.stpd_no_register = this.adminForm.stpd_no_register;
                    updateData.stpd_tanggal_kwitansi = this.adminForm.stpd_tanggal_kwitansi;
                    updateData.url_berkas_stpd = urlBerkasStpd;
                    updateData.url_resi_stpd = urlResiStpd;
                    // If newly activated, status is 'Menunggu Pembayaran'. Otherwise, preserve or set from admin input
                    if (!this.selectedBerkas.stpd_status && !this.selectedBerkas.stpd_denda) {
                        updateData.stpd_status = 'Menunggu Pembayaran';
                    } else {
                        updateData.stpd_status = this.adminForm.stpd_status || 'Menunggu Pembayaran';
                    }
                } else {
                    // Turn off/clear STPD
                    updateData.stpd_denda = 0;
                    updateData.stpd_no_register = null;
                    updateData.stpd_tanggal_kwitansi = null;
                    updateData.url_berkas_stpd = null;
                    updateData.url_resi_stpd = null;
                    updateData.url_bukti_stpd = null;
                    updateData.stpd_status = null;
                }

                const { error } = await db.from(this.isMbr ? 'pengajuan_mbr' : 'pengajuan_bphtb')
                    .update(updateData)
                    .eq('no_pengajuan', this.selectedBerkas.no_pengajuan);

                if (error) throw error;
                
                logActivity('Admin Update Status', `Mengubah status berkas ${this.selectedBerkas.no_pengajuan} menjadi ${status}`);

                Swal.fire({
                    icon: 'success',
                    title: 'Berhasil Disimpan',
                    text: `Status berkas ${this.selectedBerkas.no_pengajuan} berhasil diperbarui!`,
                    confirmButtonColor: this.isMbr ? '#16a34a' : '#1d4ed8'
                });

                this.showManageModal = false;
                this.fetchData();
            } catch (err) {
                console.error('[Admin] saveAdminChanges error:', err);
                Swal.fire({
                    icon: 'error',
                    title: 'Gagal Menyimpan Perubahan',
                    text: err.message,
                    confirmButtonColor: '#dc2626'
                });
            } finally {
                this.loading = false;
            }
        },

        statusBadge(status) { return statusBadge(status); },
        fmtCurr(v)          { return fmtCurr(v); },
        fmtDate(d)          { return fmtDate(d); },

        async openSuratModal() {
            // Jika sudah pernah digenerate, langsung unduh saja tanpa buka modal
            if (this.selectedBerkas && this.selectedBerkas.no_urut && this.selectedBerkas.tanggal_surat_keterangan) {
                if (typeof generateSuratKeteranganMBR === 'function') {
                    generateSuratKeteranganMBR(this.selectedBerkas);
                }
                return;
            }

            this.suratTanggal = new Date().toISOString().split('T')[0]; // Default today
            this.suratNoUrut = '';
            
            try {
                // Cari no_urut tertinggi
                const { data, error } = await db.from('pengajuan_mbr')
                    .select('no_urut')
                    .not('no_urut', 'is', null)
                    .order('no_urut', { ascending: false })
                    .limit(1);
                
                if (data && data.length > 0 && data[0].no_urut) {
                    this.suratNoUrut = parseInt(data[0].no_urut) + 1;
                } else {
                    this.suratNoUrut = 1; // Default
                }
            } catch(e) {
                this.suratNoUrut = 1;
            }
            this.showSuratModal = true;
        },

        async confirmGenerateSurat() {
            if (!this.suratTanggal || !this.suratNoUrut) {
                Swal.fire('Error', 'Tanggal dan No Urut Surat harus diisi', 'error');
                return;
            }
            this.loading = true;
            try {
                const { error } = await db.from('pengajuan_mbr')
                    .update({
                        no_urut: parseInt(this.suratNoUrut),
                        tanggal_surat_keterangan: this.suratTanggal
                    })
                    .eq('no_pengajuan', this.selectedBerkas.no_pengajuan);
                
                if (error) throw error;
                
                // Update local memory
                this.selectedBerkas.no_urut = parseInt(this.suratNoUrut);
                this.selectedBerkas.tanggal_surat_keterangan = this.suratTanggal;
                
            } catch(e) {
                console.error("DB Update Error:", e);
                // Biarkan lanjut walau kolom belum ada di DB agar tidak memblokir user
                if (e.message && e.message.includes("schema cache")) {
                    Swal.fire('Peringatan', 'Kolom "no_urut" atau "tanggal_surat_keterangan" belum ditambahkan di tabel pengajuan_mbr pada Supabase Anda. PDF tetap akan di-generate dengan data ini, namun tidak tersimpan ke database.', 'warning');
                } else {
                    Swal.fire('Gagal Menyimpan', e.message, 'error');
                }
                // Tetap gunakan data untuk PDF
                this.selectedBerkas.no_urut = parseInt(this.suratNoUrut);
                this.selectedBerkas.tanggal_surat_keterangan = this.suratTanggal;
            } finally {
                this.loading = false;
                this.showSuratModal = false;
                
                // Call generator
                if (typeof generateSuratKeteranganMBR === 'function') {
                    generateSuratKeteranganMBR(this.selectedBerkas);
                }
            }
        }
    };
}
