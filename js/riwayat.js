/**
 * riwayat.js — Alpine.js component for Riwayat Berkas (BPHTB & MBR)
 * Used by: riwayat-bphtb.html and riwayat-mbr.html
 * @param {string} type - 'bphtb' or 'mbr'
 */

function riwayatApp(type) {
    return {
        type,
        data: [],
        loading: false,
        filterNama: '',
        filterNotaris: '',
        filterJenis: '',
        filterStatus: '',
        userRole: '',
        showRincian: false,
        selectedBerkas: null,
        errorMsg: '',
        showKomentarPanel: false,
        komentarWp: '',

        // File upload states (Main Payment)
        buktiFileObj: null,
        buktiFileName: '',
        uploadingBukti: false,

        // File upload states (STPD Payment)
        stpdFileObj: null,
        stpdFileName: '',
        uploadingSTPD: false,

        get listNotaris() { return LIST_NOTARIS; },
        get isMbr() { return this.type === 'mbr'; },
        get accentColor() { return this.isMbr ? 'green' : 'blue'; },

        init() {
            this.fetchData();
        },

        async fetchData() {
            this.loading = true;
            this.data = [];
            this.errorMsg = '';
            try {
                const tableName = this.isMbr ? 'pengajuan_mbr' : 'pengajuan_bphtb';

                const userStr = sessionStorage.getItem('ebphtb_user_data');
                let userData = null;
                if (userStr) {
                    userData = JSON.parse(userStr);
                    this.userRole = userData.role;
                }

                let rawData = [];

                if (userData && userData.role === 'mandiri') {
                    // Filter berdasarkan auth_id user yang mengajukan — cara paling andal
                    const authId = userData.auth_id || userData.id;
                    let q = db.from(tableName).select('*');
                    
                    if (authId) {
                        q = q.eq('submitted_by_id', authId);
                    } else {
                        // Fallback: filter berdasarkan notaris (data lama)
                        const notarisValue = 'mandiri/perseorangan - ' + userData.nama;
                        q = q.ilike('notaris', '%' + notarisValue + '%');
                    }

                    if (this.filterNama) q = q.ilike('nama', '%' + this.filterNama + '%');
                    if (this.filterJenis && !this.isMbr) q = q.eq('jenis_perolehan', this.filterJenis);
                    if (this.filterStatus) q = q.eq('alur_berkas', this.filterStatus);

                    const result = await q;
                    if (result.error) throw new Error(result.error.message || JSON.stringify(result.error));
                    rawData = result.data || [];
                } else {
                    // Query normal untuk admin, notaris, dll
                    let q = db.from(tableName).select('*').order('created_at', { ascending: false });

                    if (userData) {
                        const namaUser = userData.nama;
                        if (userData.role === 'notaris') {
                            q = q.eq('notaris', namaUser);
                        }
                    }

                    if (this.filterNama) q = q.ilike('nama', '%' + this.filterNama + '%');
                    if (this.filterNotaris) q = q.eq('notaris', this.filterNotaris);
                    if (this.filterJenis && !this.isMbr) q = q.eq('jenis_perolehan', this.filterJenis);
                    if (this.filterStatus) q = q.eq('alur_berkas', this.filterStatus);

                    const result = await q;
                    if (result.error) throw new Error(result.error.message || JSON.stringify(result.error));
                    rawData = result.data || [];
                }

                // Sort: Berkas 'Selesai' di bawah. Sisanya diurutkan berdasarkan waktu pembaruan terakhir.
                rawData.sort((a, b) => {
                    const isSelesaiA = (a.alur_berkas === 'Selesai') ? 1 : 0;
                    const isSelesaiB = (b.alur_berkas === 'Selesai') ? 1 : 0;

                    if (isSelesaiA !== isSelesaiB) {
                        return isSelesaiA - isSelesaiB;
                    }

                    const dateA = new Date(a.updated_at || a.created_at || 0).getTime();
                    const dateB = new Date(b.updated_at || b.created_at || 0).getTime();
                    return dateB - dateA; // DESC
                });

                this.data = rawData;
            } catch (err) {
                console.error('[Riwayat] fetchData error:', err);
                this.errorMsg = err.message;
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
            this.filterNama    = '';
            this.filterNotaris = '';
            this.filterJenis   = '';
            this.filterStatus  = '';
            this.fetchData();
        },

        openRincian(item) {
            this.selectedBerkas = item;
            this.showRincian = true;
            this.showKomentarPanel = false;
            this.komentarWp = '';
            
            // Reset upload fields
            this.buktiFileObj = null;
            this.buktiFileName = '';
            this.stpdFileObj = null;
            this.stpdFileName = '';
        },

        async terimaPajak() {
            const confirmed = await Swal.fire({
                title: 'Konfirmasi',
                text: 'Apakah Anda menyetujui nominal pajak yang ditetapkan dan ingin melanjutkan ke tahap verifikasi akhir / pencetakan tagihan?',
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: 'Ya, Lanjutkan',
                cancelButtonText: 'Batal'
            });

            if (confirmed.isConfirmed) {
                try {
                    this.loading = true;
                    const { error } = await db.from('pengajuan_bphtb')
                        .update({ 
                            status_persetujuan_wp: 'disetujui_wp',
                            verifikasi_lapangan_status: 'disetujui',
                            verifikasi_berkas_status: 'disetujui',
                            alur_berkas: 'Pembayaran',
                            pajak: this.selectedBerkas.pajak_ditetapkan
                        })
                        .eq('no_pengajuan', this.selectedBerkas.no_pengajuan);

                    if (error) throw error;
                    
                    Swal.fire('Sukses', 'Persetujuan berhasil dikirim. Berkas Anda akan segera diproses.', 'success');
                    this.showRincian = false;
                    this.fetchData();
                } catch (err) {
                    console.error(err);
                    Swal.fire('Error', 'Gagal memproses persetujuan.', 'error');
                } finally {
                    this.loading = false;
                }
            }
        },

        async kirimKomentar() {
            if (!this.komentarWp.trim()) return;

            try {
                this.loading = true;
                const { error } = await db.from('pengajuan_bphtb')
                    .update({ 
                        status_persetujuan_wp: 'dikomentari_wp',
                        komentar_wp: this.komentarWp,
                        alur_berkas: 'Berkas sedang diverifikasi' // Returns to verifier queue
                    })
                    .eq('no_pengajuan', this.selectedBerkas.no_pengajuan);

                if (error) throw error;
                
                Swal.fire('Sukses', 'Komentar/Sanggahan Anda telah dikirim ke petugas BAPENDA.', 'success');
                this.showRincian = false;
                this.fetchData();
            } catch (err) {
                console.error(err);
                Swal.fire('Error', 'Gagal mengirim komentar.', 'error');
            } finally {
                this.loading = false;
            }
        },

        // ── Main Payment Upload ─────────────────────────────────────
        handleBuktiFile(e) {
            const file = e.target.files[0];
            if (!file) return;
            if (file.size > 2 * 1024 * 1024) {
                Swal.fire({ icon: 'warning', title: 'File Terlalu Besar', text: 'Maksimal file bukti bayar adalah 2MB.', confirmButtonColor: '#1d4ed8' });
                e.target.value = ''; return;
            }
            if (file.type !== 'application/pdf' && !file.type.startsWith('image/')) {
                Swal.fire({ icon: 'warning', title: 'Format Tidak Valid', text: 'Unggah file PDF atau Gambar saja.', confirmButtonColor: '#1d4ed8' });
                e.target.value = ''; return;
            }
            this.buktiFileObj = file;
            this.buktiFileName = file.name;
        },

        async submitBuktiBayar() {
            if (!this.buktiFileObj) {
                Swal.fire({ icon: 'warning', title: 'Pilih File', text: 'Silakan pilih file bukti bayar terlebih dahulu.', confirmButtonColor: '#1d4ed8' });
                return;
            }

            this.uploadingBukti = true;
            try {
                Swal.fire({
                    title: 'Mengunggah Bukti Bayar...',
                    text: 'Menyimpan berkas ke Google Drive',
                    allowOutsideClick: false,
                    didOpen: () => Swal.showLoading()
                });

                const formData = new FormData();
                formData.append('aksi', 'upload_file_saja');
                formData.append('nik', this.selectedBerkas.nik);
                formData.append('bukti_bayar_file', await toBase64(this.buktiFileObj));

                const res = await fetch(CONFIG.SCRIPT_URL, { method: 'POST', body: formData });
                const result = await res.json();
                if (result.result !== 'success') throw new Error(result.error || 'Gagal menyimpan file.');

                const driveUrl = result.url_bukti_bayar;

                // Update status in Supabase
                const { error } = await db.from(this.isMbr ? 'pengajuan_mbr' : 'pengajuan_bphtb')
                    .update({
                        url_bukti_bayar: driveUrl,
                        alur_berkas: 'Pembayaran sedang diverifikasi'
                    })
                    .eq('no_pengajuan', this.selectedBerkas.no_pengajuan);

                if (error) throw error;

                await Swal.fire({
                    icon: 'success',
                    title: 'Bukti Pembayaran Terkirim!',
                    text: 'Status berkas Anda kini berubah menjadi Pembayaran sedang diverifikasi.',
                    confirmButtonColor: '#1d4ed8'
                });

                this.showRincian = false;
                await this.fetchData();

            } catch (err) {
                console.error('[Riwayat] submitBuktiBayar error:', err);
                Swal.fire({ icon: 'error', title: 'Gagal Mengunggah', text: err.message, confirmButtonColor: '#dc2626' });
            } finally {
                this.uploadingBukti = false;
            }
        },

        // ── STPD Payment Upload ─────────────────────────────────────
        handleSTPDBuktiFile(e) {
            const file = e.target.files[0];
            if (!file) return;
            if (file.size > 2 * 1024 * 1024) {
                Swal.fire({ icon: 'warning', title: 'File Terlalu Besar', text: 'Maksimal file bukti bayar adalah 2MB.', confirmButtonColor: '#1d4ed8' });
                e.target.value = ''; return;
            }
            if (file.type !== 'application/pdf' && !file.type.startsWith('image/')) {
                Swal.fire({ icon: 'warning', title: 'Format Tidak Valid', text: 'Unggah file PDF atau Gambar saja.', confirmButtonColor: '#1d4ed8' });
                e.target.value = ''; return;
            }
            this.stpdFileObj = file;
            this.stpdFileName = file.name;
        },

        async submitBuktiSTPD() {
            if (!this.stpdFileObj) {
                Swal.fire({ icon: 'warning', title: 'Pilih File', text: 'Silakan pilih file bukti bayar STPD terlebih dahulu.', confirmButtonColor: '#1d4ed8' });
                return;
            }

            this.uploadingSTPD = true;
            try {
                Swal.fire({
                    title: 'Mengunggah Bukti STPD...',
                    text: 'Menyimpan berkas ke Google Drive',
                    allowOutsideClick: false,
                    didOpen: () => Swal.showLoading()
                });

                const formData = new FormData();
                formData.append('aksi', 'upload_file_saja');
                formData.append('nik', this.selectedBerkas.nik);
                formData.append('bukti_stpd_file', await toBase64(this.stpdFileObj));

                const res = await fetch(CONFIG.SCRIPT_URL, { method: 'POST', body: formData });
                const result = await res.json();
                if (result.result !== 'success') throw new Error(result.error || 'Gagal menyimpan file.');

                const driveUrl = result.url_bukti_stpd;

                // Update status in Supabase
                const { error } = await db.from(this.isMbr ? 'pengajuan_mbr' : 'pengajuan_bphtb')
                    .update({
                        url_bukti_stpd: driveUrl,
                        stpd_status: 'Pembayaran sedang diverifikasi'
                    })
                    .eq('no_pengajuan', this.selectedBerkas.no_pengajuan);

                if (error) throw error;

                await Swal.fire({
                    icon: 'success',
                    title: 'Bukti Pembayaran STPD Terkirim!',
                    text: 'Status STPD Anda telah diupdate ke Pembayaran sedang diverifikasi.',
                    confirmButtonColor: '#1d4ed8'
                });

                this.showRincian = false;
                await this.fetchData();

            } catch (err) {
                console.error('[Riwayat] submitBuktiSTPD error:', err);
                Swal.fire({ icon: 'error', title: 'Gagal Mengunggah STPD', text: err.message, confirmButtonColor: '#dc2626' });
            } finally {
                this.uploadingSTPD = false;
            }
        },

        // ── Edit & Withdraw Actions ──────────────────────────────────
        perbaikiPengajuan(item) {
            sessionStorage.setItem('edit_pengajuan_id', item.no_pengajuan);
            const targetPage = this.isMbr ? 'pengajuan-mbr.html' : 'pengajuan-bphtb.html';
            window.location.href = targetPage;
        },

        async urungkanPengajuan(item) {
            const confirm = await Swal.fire({
                title: 'Apakah Anda Yakin?',
                text: 'Pengajuan BPHTB ini akan dihapus permanen dari sistem.',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#dc2626',
                cancelButtonColor: '#64748b',
                confirmButtonText: 'Ya, Hapus!',
                cancelButtonText: 'Batal'
            });

            if (!confirm.isConfirmed) return;

            this.loading = true;
            try {
                const { error } = await db.from(this.isMbr ? 'pengajuan_mbr' : 'pengajuan_bphtb')
                    .delete()
                    .eq('no_pengajuan', item.no_pengajuan);

                if (error) throw error;

                await Swal.fire({
                    icon: 'success',
                    title: 'Pengajuan Dibatalkan',
                    text: 'Berkas pengajuan berhasil dihapus.',
                    confirmButtonColor: '#1d4ed8'
                });

                this.showRincian = false;
                await this.fetchData();

            } catch (err) {
                console.error('[Riwayat] urungkanPengajuan error:', err);
                Swal.fire({ icon: 'error', title: 'Gagal Menghapus', text: err.message, confirmButtonColor: '#dc2626' });
            } finally {
                this.loading = false;
            }
        },

        statusBadge(status) { return statusBadge(status); },
        fmtCurr(v)          { return fmtCurr(v); },
        fmtDate(d)          { return fmtDate(d); },
    };
}
