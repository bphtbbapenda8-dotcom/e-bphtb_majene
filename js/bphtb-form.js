/**
 * bphtb-form.js — Alpine.js component for Formulir BPHTB Reguler
 * Used by: pengajuan-bphtb.html and admin-bphtb.html
 */

function bphtbFormApp() {
    return {
        // ── Form State ──────────────────────────────────────────────
        form: {
            nik: '', nama: '', email: '', wa: '',
            alamatWp: '', nop: '', nop_type: 'sendiri',
            kecamatan: '', kelurahan: '',
            alamatOp: '', luasBumi: 0, luasBangunan: 0,
            njopBumi: 0, njopBangunan: 0,
            nilaiTransaksi: 0,
            latitude: '', longitude: '',
            jenisPerolehan: '',
            notaris: ''
        },

        // Formatted display values for currency inputs
        dispNjopBumi: '', dispNjopBangunan: '', dispTransaksi: '',

        // File info
        files: { ktp: null, sertifikat: null, pendukung: null },
        fileObjects: { ktp: null, sertifikat: null, pendukung: null },

        // Existing file URLs (used in edit mode)
        existingFiles: { url_ktp: '', url_sertifikat: '', url_pendukung: '' },

        // Dropdown data
        listKelurahan: [],
        listNotaris: typeof LIST_NOTARIS !== 'undefined' ? LIST_NOTARIS : [],

        // UI & Edit State
        showPreview: false,
        showRincian: false,
        loading: false,
        isEditMode: false,
        editId: '',
        isNotaris: false,

        // ── Lifecycle ────────────────────────────────────────────────
        async init() {
            this.listNotaris = [...LIST_NOTARIS];
            
            // Auto-fill notaris based on logged-in user
            const userStr = sessionStorage.getItem('ebphtb_user_data');
            if (userStr) {
                const userData = JSON.parse(userStr);
                if (userData.role === 'notaris') {
                    if (!this.listNotaris.includes(userData.nama)) {
                        this.listNotaris.push(userData.nama);
                    }
                    setTimeout(() => { this.form.notaris = userData.nama; }, 50);
                    this.isNotaris = true;
                } else if (userData.role === 'mandiri') {
                    if (!this.listNotaris.includes('mandiri/perseorangan')) {
                        this.listNotaris.push('mandiri/perseorangan');
                    }
                    setTimeout(() => { this.form.notaris = 'mandiri/perseorangan'; }, 50);
                }
            }

            this.$nextTick(() => {
                initMap('map', (lat, lng) => {
                    this.form.latitude = lat;
                    this.form.longitude = lng;
                });
                initNopMask('nop_input');
            });

            // Check if we are in Edit Mode (Correcting rejected document)
            const editId = sessionStorage.getItem('edit_pengajuan_id');
            if (editId) {
                this.isEditMode = true;
                this.editId = editId;
                await this.loadEditData(editId);
            }
        },

        // ── Load data for Edit Mode ─────────────────────────────────
        async loadEditData(id) {
            this.loading = true;
            try {
                const { data, error } = await db.from('pengajuan_bphtb')
                    .select('*')
                    .eq('no_pengajuan', id)
                    .single();

                if (error) throw error;
                if (!data) throw new Error('Data pengajuan tidak ditemukan.');

                // Populate form fields
                this.form.nik = data.nik || '';
                this.form.nama = data.nama || '';
                this.form.email = data.email || '';
                this.form.wa = data.wa || '';
                this.form.alamatWp = data.alamat_wp || '';
                this.form.nop = data.nop || '';
                this.form.nop_type = data.nop_type || 'sendiri';
                this.form.alamatOp = data.alamat_op || '';
                this.form.kecamatan = data.kecamatan || '';
                
                // Trigger kelurahan list loading
                if (this.form.kecamatan) {
                    this.listKelurahan = DATA_WILAYAH[this.form.kecamatan] || [];
                }
                this.form.kelurahan = data.kelurahan || '';

                this.form.latitude = data.latitude || '';
                this.form.longitude = data.longitude || '';
                this.form.luasBumi = data.luas_bumi || 0;
                this.form.luasBangunan = data.luas_bangunan || 0;
                this.form.njopBumi = data.njop_bumi || 0;
                this.form.njopBangunan = data.njop_bangunan || 0;
                this.form.nilaiTransaksi = data.nilai_transaksi || 0;
                this.form.jenisPerolehan = data.jenis_perolehan || '';
                this.form.notaris = data.notaris || '';

                // Populate display currency values
                this.dispNjopBumi = this.form.njopBumi ? fmtRpDisplay(this.form.njopBumi) : '';
                this.dispNjopBangunan = this.form.njopBangunan ? fmtRpDisplay(this.form.njopBangunan) : '';
                this.dispTransaksi = this.form.nilaiTransaksi ? fmtRpDisplay(this.form.nilaiTransaksi) : '';

                // Set existing files
                this.existingFiles.url_ktp = data.url_ktp || '';
                this.existingFiles.url_sertifikat = data.url_sertifikat || '';
                this.existingFiles.url_pendukung = data.url_pendukung || '';

                // Set NOP mask input
                this.$nextTick(() => {
                    const nopEl = document.getElementById('nop_input');
                    if (nopEl) {
                        nopEl.value = this.form.nop;
                        // Trigger input event to let IMask format it
                        nopEl.dispatchEvent(new Event('input'));
                    }
                    // Place marker on map if coords exist
                    if (this.form.latitude && this.form.longitude && window.mapInstance) {
                        const latlng = [parseFloat(this.form.latitude), parseFloat(this.form.longitude)];
                        window.mapInstance.setView(latlng, 16);
                        if (window.markerInstance) {
                            window.markerInstance.setLatLng(latlng);
                        } else {
                            window.markerInstance = L.marker(latlng, { draggable: true }).addTo(window.mapInstance);
                            window.markerInstance.on('dragend', function (e) {
                                const newPos = e.target.getLatLng();
                                const latInput = document.querySelector('input[x-model="form.latitude"]');
                                const lngInput = document.querySelector('input[x-model="form.longitude"]');
                                if (latInput) latInput.value = newPos.lat.toFixed(6);
                                if (lngInput) lngInput.value = newPos.lng.toFixed(6);
                                // Trigger Alpine binding
                                latInput.dispatchEvent(new Event('input'));
                                lngInput.dispatchEvent(new Event('input'));
                            });
                        }
                    }
                });

            } catch (err) {
                console.error('[BPHTB Form] loadEditData error:', err);
                Swal.fire({ icon: 'error', title: 'Gagal Memuat Data Lama', text: err.message, confirmButtonColor: '#dc2626' });
            } finally {
                this.loading = false;
            }
        },

        // ── Computed ─────────────────────────────────────────────────
        get totalNjop() {
            return (this.form.luasBumi * this.form.njopBumi) +
                   (this.form.luasBangunan * this.form.njopBangunan);
        },

        get npoptkp() {
            return (this.form.jenisPerolehan === 'Waris' || this.form.jenisPerolehan === 'Hibah wasiat') ? 300000000 : 80000000;
        },

        get estimasiBphtb() {
            const npo = Math.max(this.totalNjop, this.form.nilaiTransaksi);
            const pkp = npo - this.npoptkp;
            return pkp > 0 ? Math.floor(pkp * 0.05) : 0;
        },

        get kecamatanList() {
            return Object.keys(DATA_WILAYAH);
        },

        // ── Methods ──────────────────────────────────────────────────
        onKecamatanChange() {
            this.listKelurahan = DATA_WILAYAH[this.form.kecamatan] || [];
            this.form.kelurahan = '';
        },

        onNikInput(e) {
            this.form.nik = onlyNum(e.target.value).slice(0, 16);
            e.target.value = this.form.nik;
        },

        onWaInput(e) {
            this.form.wa = onlyNum(e.target.value);
            e.target.value = this.form.wa;
        },

        onRpInput(e, field) {
            const val = parseRp(e.target.value);
            this.form[field] = val;
            e.target.value = val ? fmtRpDisplay(val) : '';
        },

        handleFile(e, key) {
            const file = e.target.files[0];
            if (!file) return;
            if (file.size > 2 * 1024 * 1024) {
                Swal.fire({ icon: 'warning', title: 'File Terlalu Besar', text: 'Maksimal 2MB per file.', confirmButtonColor: '#1d4ed8' });
                e.target.value = ''; return;
            }
            if (file.type !== 'application/pdf') {
                Swal.fire({ icon: 'warning', title: 'Format Tidak Valid', text: 'Hanya file PDF yang diterima.', confirmButtonColor: '#1d4ed8' });
                e.target.value = ''; return;
            }
            this.files[key] = { name: file.name, size: (file.size / 1024).toFixed(1) + ' KB' };
            this.fileObjects[key] = file;
        },

        removeFile(key) {
            this.files[key] = null;
            this.fileObjects[key] = null;
        },

        openPreview() {
            if (this.form.nik.length < 16) {
                Swal.fire({ icon: 'warning', title: 'NIK Tidak Lengkap', text: 'NIK harus 16 digit.', confirmButtonColor: '#1d4ed8' });
                return;
            }
            if (!this.form.latitude) {
                Swal.fire({ icon: 'info', title: 'Lokasi Belum Ditandai', text: 'Klik pada peta untuk menandai lokasi objek pajak.', confirmButtonColor: '#1d4ed8' });
                return;
            }
            // In Edit Mode, we can reuse existing files, so files are not strictly required if they exist on the server
            if (!this.isEditMode) {
                if (!this.files?.ktp || !this.files?.sertifikat) {
                    Swal.fire({ icon: 'warning', title: 'Berkas Belum Lengkap', text: 'Harap unggah minimal KTP/KK dan Sertifikat Tanah.', confirmButtonColor: '#1d4ed8' });
                    return;
                }
            } else {
                if ((!this.files?.ktp && !this.existingFiles?.url_ktp) || (!this.files?.sertifikat && !this.existingFiles?.url_sertifikat)) {
                    Swal.fire({ icon: 'warning', title: 'Berkas Belum Lengkap', text: 'Harap pastikan KTP/KK dan Sertifikat Tanah tersedia.', confirmButtonColor: '#1d4ed8' });
                    return;
                }
            }
            const nopEl = document.getElementById('nop_input');
            this.form.nop = nopEl ? nopEl.value : '';
            this.showPreview = true;
        },

        async submitData() {
            this.loading = true;
            try {
                let ktpUrl = this.existingFiles?.url_ktp || '';
                let sertifikatUrl = this.existingFiles?.url_sertifikat || '';
                let pendukungUrl = this.existingFiles?.url_pendukung || '';

                // Check if any new files are being uploaded
                if (this.fileObjects?.ktp || this.fileObjects?.sertifikat || this.fileObjects?.pendukung) {
                    Swal.fire({
                        title: 'Mengunggah Berkas...',
                        text: 'Menyimpan file ke Google Drive (1/2)',
                        allowOutsideClick: false,
                        didOpen: () => Swal.showLoading()
                    });

                    const formData = new FormData();
                    formData.append('aksi', 'upload_file_saja');
                    formData.append('nik', this.form.nik);
                    if (this.fileObjects?.ktp)        formData.append('ktp_file',        await toBase64(this.fileObjects.ktp));
                    if (this.fileObjects?.sertifikat) formData.append('sertifikat_file', await toBase64(this.fileObjects.sertifikat));
                    if (this.fileObjects?.pendukung)  formData.append('pendukung_file',  await toBase64(this.fileObjects.pendukung));

                    const scriptRes = await fetch(CONFIG.SCRIPT_URL, { method: 'POST', body: formData });
                    const scriptResult = await scriptRes.json();
                    if (scriptResult.result !== 'success') throw new Error('Gagal upload ke Drive: ' + (scriptResult.error || 'Unknown'));

                    if (scriptResult.url_ktp)        ktpUrl = scriptResult.url_ktp;
                    if (scriptResult.url_sertifikat) sertifikatUrl = scriptResult.url_sertifikat;
                    if (scriptResult.url_pendukung)  pendukungUrl = scriptResult.url_pendukung;
                }

                Swal.fire({
                    title: 'Menyimpan Data...',
                    text: 'Menyimpan ke database (2/2)',
                    allowOutsideClick: false,
                    didOpen: () => Swal.showLoading()
                });

                const payload = {
                    nik:            this.form.nik,
                    nama:           this.form.nama,
                    alamat_wp:      this.form.alamatWp,
                    email:          this.form.email,
                    wa:             this.form.wa,
                    nop:            this.form.nop,
                    nop_type:       this.form.nop_type,
                    alamat_op:      this.form.alamatOp,
                    kecamatan:      this.form.kecamatan,
                    kelurahan:      this.form.kelurahan,
                    latitude:       this.form.latitude,
                    longitude:      this.form.longitude,
                    luas_bumi:      this.form.luasBumi,
                    njop_bumi:      this.form.njopBumi,
                    luas_bangunan:  this.form.luasBangunan,
                    njop_bangunan:  this.form.njopBangunan,
                    total_njop:     this.totalNjop,
                    nilai_transaksi: this.form.jenisPerolehan === 'jual_beli' ? this.form.nilaiTransaksi : 0,
                    jenis_perolehan: this.form.jenisPerolehan,
                    notaris:        this.form.notaris,
                    pajak:          this.form.jenisPerolehan === 'jual_beli' ? this.estimasiBphtb : 0,
                    url_ktp:        ktpUrl,
                    url_sertifikat: sertifikatUrl,
                    url_pendukung:  pendukungUrl,
                    alur_berkas:    'Berkas sedang diverifikasi', // Reset status to 'Berkas sedang diverifikasi'
                    catatan_penolakan: null, // Clear rejection notes on resubmission
                    status_persetujuan_wp: null,
                    komentar_wp: null
                };

                if (this.isEditMode) {
                    // Update existing row
                    const { error } = await db.from('pengajuan_bphtb')
                        .update(payload)
                        .eq('no_pengajuan', this.editId);

                    if (error) throw new Error('Gagal mengupdate database: ' + error.message);
                    sessionStorage.removeItem('edit_pengajuan_id');

                    await Swal.fire({
                        icon: 'success',
                        title: 'Berkas Berhasil Diperbarui!',
                        text: 'Pengajuan Anda telah direvisi dan sedang diverifikasi ulang.',
                        confirmButtonColor: '#1d4ed8'
                    });
                } else {
                    // Insert new row
                    const noPengajuan = generateNoPengajuan('reguler');
                    payload.no_pengajuan = noPengajuan;
                    payload.jenis_pengajuan = 'reguler';
                    payload.created_at = new Date().toISOString();

                    const { error } = await db.from('pengajuan_bphtb').insert([payload]);
                    if (error) throw new Error('Gagal menyimpan ke database: ' + error.message);

                    await Swal.fire({
                        icon: 'success',
                        title: 'Pengajuan Berhasil!',
                        html: `Data Anda telah diterima dengan sukses.<br><b>No. Pengajuan: ${noPengajuan}</b>`,
                        confirmButtonColor: '#1d4ed8'
                    });
                }

                window.location.href = 'riwayat-bphtb.html';

            } catch (err) {
                Swal.fire({
                    icon: 'error',
                    title: 'Terjadi Kesalahan',
                    text: err.message,
                    confirmButtonColor: '#dc2626'
                });
            } finally {
                this.loading = false;
            }
        }
    };
}
