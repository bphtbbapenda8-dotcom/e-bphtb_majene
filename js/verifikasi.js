/**
 * verifikasi.js — Logic for both Verifikasi Berkas & Verifikasi Lapangan
 */

function verifikasiApp(mode) {
    // mode = 'berkas' | 'lapangan'
    return {
        mode: mode,
        data: [],
        loading: false,
        searchQuery: '',
        filterJenis: '', // reguler, mbr
        filterStatus: '', // menunggu, disetujui, ditolak

        showModal: false,
        selectedBerkas: null,

        init() {
            // Auth Enforcement handled by sidebar.js `initSidebar()`
            this.fetchData();
        },

        async fetchData() {
            this.loading = true;
            try {
                // Fetch Reguler
                const { data: reguler, error: errReg } = await db.from('pengajuan_bphtb')
                    .select('*')
                    .order('created_at', { ascending: false });
                if (errReg) throw errReg;

                // Fetch MBR
                const { data: mbr, error: errMbr } = await db.from('pengajuan_mbr')
                    .select('*')
                    .order('created_at', { ascending: false });
                if (errMbr) throw errMbr;

                let combined = [
                    ...(reguler || []).map(r => ({ ...r, isMbr: false })),
                    ...(mbr || []).map(m => ({ ...m, isMbr: true }))
                ];

                // Filter out those that are not in "verifikasi" phase (e.g. Draft, Batal)
                // Assuming any new request is implicitly "Menunggu Verifikasi"
                // Usually indicated by alur_berkas = 'Berkas sedang diverifikasi'
                // Here we just fetch all to be safe, but sort by date. 
                // Or we can filter out 'Dibatalkan'
                combined = combined.filter(item => item.alur_berkas !== 'Dibatalkan oleh sistem');

                this.data = combined;

            } catch (err) {
                console.error('fetchData error:', err);
                Swal.fire({ icon: 'error', title: 'Gagal Memuat Data', text: err.message });
            } finally {
                this.loading = false;
            }
        },

        get filteredData() {
            let res = this.data;
            if (this.searchQuery) {
                const q = this.searchQuery.toLowerCase();
                res = res.filter(item => 
                    (item.no_pengajuan && item.no_pengajuan.toLowerCase().includes(q)) ||
                    (item.nama && item.nama.toLowerCase().includes(q)) ||
                    (item.nik && item.nik.includes(q))
                );
            }
            if (this.filterJenis === 'reguler') res = res.filter(i => !i.isMbr);
            if (this.filterJenis === 'mbr') res = res.filter(i => i.isMbr);

            if (this.filterStatus) {
                res = res.filter(item => {
                    const statusVal = this.mode === 'berkas' ? item.verifikasi_berkas_status : item.verifikasi_lapangan_status;
                    if (this.filterStatus === 'menunggu') {
                        return !statusVal || statusVal.toLowerCase() === 'menunggu';
                    }
                    return statusVal && statusVal.toLowerCase() === this.filterStatus;
                });
            }

            return res;
        },

        openModal(item) {
            this.selectedBerkas = item;
            this.showModal = true;
        },

        async tolakBerkas() {
            const result = await Swal.fire({
                title: 'Tolak Verifikasi',
                input: 'textarea',
                inputLabel: 'Alasan Penolakan',
                inputPlaceholder: 'Tulis alasan kenapa ditolak...',
                inputAttributes: { 'aria-label': 'Alasan Penolakan', required: true },
                showCancelButton: true,
                confirmButtonColor: '#dc2626',
                confirmButtonText: 'Tolak Pengajuan',
                cancelButtonText: 'Batal'
            });

            if (!result.isConfirmed) return;
            const alasan = result.value || 'Ditolak tanpa alasan spesifik';
            
            this.updateStatus('ditolak', alasan);
        },

        async setujuiBerkas() {
            const confirm = await Swal.fire({
                title: 'Setujui Verifikasi?',
                text: this.mode === 'berkas' 
                    ? 'Apakah Anda yakin dokumen sudah lengkap dan benar?'
                    : 'Apakah Anda yakin lokasi dan objek pajak sudah sesuai?',
                icon: 'question',
                showCancelButton: true,
                confirmButtonColor: '#16a34a',
                confirmButtonText: 'Ya, Setujui'
            });

            if (!confirm.isConfirmed) return;
            this.updateStatus('disetujui');
        },

        async updateStatus(statusValue, catatan = null) {
            this.loading = true;
            try {
                const table = this.selectedBerkas.isMbr ? 'pengajuan_mbr' : 'pengajuan_bphtb';
                const no_pengajuan = this.selectedBerkas.no_pengajuan;

                // Build core payload (always safe columns)
                let payload = {};
                if (this.mode === 'berkas') {
                    payload.verifikasi_berkas_status = statusValue;
                } else {
                    payload.verifikasi_lapangan_status = statusValue;
                }

                // If rejected, update alur_berkas and catatan
                if (statusValue === 'ditolak') {
                    payload.alur_berkas = 'Ditolak oleh verifikator ' + this.mode;
                    payload.catatan_penolakan = catatan;
                } else if (statusValue === 'disetujui') {
                    // Check if both are now disetujui
                    const otherStatus = this.mode === 'berkas' 
                        ? this.selectedBerkas.verifikasi_lapangan_status 
                        : this.selectedBerkas.verifikasi_berkas_status;
                        
                    if (otherStatus === 'disetujui') {
                        payload.alur_berkas = 'Berkas diterima';
                    }
                }

                const { error } = await db.from(table).update(payload).eq('no_pengajuan', no_pengajuan);
                if (error) throw error;

                // Try to save verifikator name (optional — requires column to exist in DB)
                if (statusValue === 'disetujui') {
                    try {
                        const userStr = sessionStorage.getItem('ebphtb_user_data');
                        const namaVerifikator = userStr ? JSON.parse(userStr).nama : '-';
                        const tglVerifikasi = new Date().toISOString();
                        const namaPayload = this.mode === 'berkas'
                            ? { nama_verifikator_berkas: namaVerifikator, tanggal_verifikasi_berkas: tglVerifikasi }
                            : { nama_verifikator_lapangan: namaVerifikator, tanggal_verifikasi_lapangan: tglVerifikasi };
                        await db.from(table).update(namaPayload).eq('no_pengajuan', no_pengajuan);
                    } catch(e) {
                        console.warn('[Verifikasi] Kolom opsional belum ada di DB, lewati:', e.message);
                    }
                }

                // Log activity (safe — won't break if table doesn't exist)
                try { logActivity('Verifikasi ' + (this.mode==='berkas'?'Berkas':'Lapangan'), `Memberikan status '${statusValue}' untuk berkas ${no_pengajuan}`); } catch(e) {}

                Swal.fire({
                    icon: 'success',
                    title: 'Berhasil',
                    text: 'Status verifikasi berhasil diperbarui',
                    confirmButtonColor: '#1d4ed8'
                });

                this.showModal = false;
                await this.fetchData();

            } catch (err) {
                console.error('updateStatus error:', err);
                Swal.fire({ icon: 'error', title: 'Terjadi Kesalahan', text: err.message });
            } finally {
                this.loading = false;
            }
        }
    }
}
