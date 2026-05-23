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
        filterNotaris: '', // nama notaris

        showModal: false,
        selectedBerkas: null,

        berkasForm: {
            status_perkawinan: '',
            penghasilan: '',
            kelengkapan: {
                ktp: false, kk: false, sertifikat: false,
                ajb: false, spk: false, sppt: false, ket_rumah: false
            },
            harga: 0,
            hak_pertama: false
        },

        lapanganForm: {
            kondisi_tanah: '',
            jenis_bangunan: '',
            luas_bangunan: '',
            luas_tanah: '',
            pajak_ditetapkan: 0,
            pajak_ditetapkan_disp: ''
        },

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
                // Filter out 'Dibatalkan'
                combined = combined.filter(item => item.alur_berkas !== 'Dibatalkan oleh sistem');

                // Sort: Prioritize 'menunggu' status to appear on top
                combined.sort((a, b) => {
                    const statusA = (this.mode === 'berkas' ? a.verifikasi_berkas_status : a.verifikasi_lapangan_status) || 'menunggu';
                    const statusB = (this.mode === 'berkas' ? b.verifikasi_berkas_status : b.verifikasi_lapangan_status) || 'menunggu';
                    
                    const isMenungguA = statusA.toLowerCase() === 'menunggu' ? 1 : 0;
                    const isMenungguB = statusB.toLowerCase() === 'menunggu' ? 1 : 0;

                    if (isMenungguA > isMenungguB) return -1;
                    if (isMenungguA < isMenungguB) return 1;

                    const dateA = new Date(a.created_at || 0).getTime();
                    const dateB = new Date(b.created_at || 0).getTime();
                    return dateB - dateA;
                });

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

            if (this.filterNotaris) {
                const qn = this.filterNotaris.toLowerCase();
                res = res.filter(item => item.notaris && item.notaris.toLowerCase().includes(qn));
            }

            return res;
        },

        openModal(item) {
            this.selectedBerkas = item;
            
            // Reset forms
            if (this.mode === 'berkas') {
                this.berkasForm = {
                    status_perkawinan: '',
                    penghasilan: '',
                    kelengkapan: { ktp: false, kk: false, sertifikat: false, ajb: false, spk: false, sppt: false, ket_rumah: false },
                    harga: item.nilai_transaksi || 0,
                    hak_pertama: false
                };
            } else {
                this.lapanganForm = {
                    kondisi_tanah: '',
                    jenis_bangunan: '',
                    luas_bangunan: '',
                    luas_tanah: '',
                    pajak_ditetapkan: 0,
                    pajak_ditetapkan_disp: ''
                };
            }

            this.showModal = true;
        },

        onRpInput(e, field) {
            const val = parseRp(e.target.value);
            this.lapanganForm[field] = val;
            e.target.value = val ? fmtRpDisplay(val) : '';
        },

        async submitVerifikasi() {
            // Check if MBR, only MBR gets the new checklist according to user
            if (!this.selectedBerkas.isMbr) {
                // For Reguler, fallback to original logic
                return this.setujuiBerkas();
            }

            let statusValue = 'disetujui';
            let catatan = null;
            let payloadTambahan = {};

            if (this.mode === 'berkas') {
                const bf = this.berkasForm;
                // Validation: if any field is missing or not checked
                if (!bf.status_perkawinan || !bf.penghasilan || !bf.hak_pertama || 
                    !bf.kelengkapan.ktp || !bf.kelengkapan.kk || !bf.kelengkapan.sertifikat || 
                    !bf.kelengkapan.ajb || !bf.kelengkapan.spk || !bf.kelengkapan.sppt || 
                    !bf.kelengkapan.ket_rumah) {
                    
                    statusValue = 'ditolak';
                    catatan = 'Ditolak karena berkas tidak lengkap atau tidak memenuhi syarat (Otomatis).';
                }
                payloadTambahan.data_verifikasi_berkas = bf;
            } else {
                const lf = this.lapanganForm;
                if (!lf.kondisi_tanah || !lf.jenis_bangunan || lf.luas_bangunan !== 'sesuai' || lf.luas_tanah !== 'sesuai') {
                    statusValue = 'ditolak';
                    catatan = 'Ditolak karena data lapangan tidak sesuai (Otomatis).';
                }
                payloadTambahan.data_verifikasi_lapangan = lf;
            }

            const actionText = statusValue === 'disetujui' ? 'Setujui Pengajuan?' : 'Tolak Pengajuan (Tidak Layak)?';
            const iconType = statusValue === 'disetujui' ? 'question' : 'warning';
            const confirmColor = statusValue === 'disetujui' ? '#16a34a' : '#dc2626';

            const confirm = await Swal.fire({
                title: actionText,
                text: 'Status akhir: ' + (statusValue === 'disetujui' ? 'LAYAK DIBEBASKAN BPHTB' : 'TIDAK LAYAK (Ditolak)'),
                icon: iconType,
                showCancelButton: true,
                confirmButtonColor: confirmColor,
                confirmButtonText: 'Ya, Proses'
            });

            if (!confirm.isConfirmed) return;
            this.updateStatus(statusValue, catatan, payloadTambahan);
        },

        async kirimPajakKeWp() {
            if (this.lapanganForm.pajak_ditetapkan === undefined || this.lapanganForm.pajak_ditetapkan === '') {
                Swal.fire('Error', 'Silakan isi nominal pajak yang ditetapkan (isi 0 jika nihil).', 'error');
                return;
            }

            try {
                this.loading = true;
                const { error } = await db.from('pengajuan_bphtb')
                    .update({ 
                        pajak_ditetapkan: this.lapanganForm.pajak_ditetapkan,
                        status_persetujuan_wp: 'menunggu_wp',
                        alur_berkas: 'Menunggu Persetujuan Wajib Pajak'
                    })
                    .eq('no_pengajuan', this.selectedBerkas.no_pengajuan);

                if (error) throw error;

                Swal.fire('Sukses', 'Pajak berhasil ditetapkan dan dikirim ke WP untuk persetujuan.', 'success');
                this.showModal = false;
                this.fetchData();
            } catch (err) {
                console.error(err);
                Swal.fire('Error', 'Gagal mengirim ke WP', 'error');
            } finally {
                this.loading = false;
            }
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

        async updateStatus(statusValue, catatan = null, payloadTambahan = {}) {
            this.loading = true;
            try {
                const table = this.selectedBerkas.isMbr ? 'pengajuan_mbr' : 'pengajuan_bphtb';
                const no_pengajuan = this.selectedBerkas.no_pengajuan;

                // Build core payload (always safe columns)
                let payload = { ...payloadTambahan };
                if (this.mode === 'berkas') {
                    payload.verifikasi_berkas_status = statusValue;
                } else {
                    payload.verifikasi_lapangan_status = statusValue;
                }

                // If rejected, update alur_berkas and catatan
                if (statusValue === 'ditolak') {
                    payload.alur_berkas = 'Ditolak oleh verifikator ' + this.mode;
                    payload.catatan_penolakan = catatan || 'Ditolak oleh verifikator ' + this.mode;
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
