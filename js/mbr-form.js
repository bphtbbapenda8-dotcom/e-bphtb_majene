/**
 * mbr-form.js — Alpine.js component for Formulir BPHTB MBR
 * Used by: pengajuan-mbr.html and admin-mbr.html
 */

function mbrFormApp() {
    return {
        // ── Form State ──────────────────────────────────────────────
        form: {
            nik: '', nama: '', email: '', wa: '',
            alamatWp: '', nop: '', nop_type: 'sendiri',
            kecamatan: '', kelurahan: '',
            luasBumi: 0, luasBangunan: 0,
            nilaiTransaksi: 0,
            notaris: '',
            pekerjaan: '',
            penghasilan: 0,

            // New fields from the user's MBR HTML
            tanggal_register: new Date().toISOString().split('T')[0],
            tempat_lahir: '',
            tanggal_lahir: '',
            nomor_perjanjian_kredit: '',
            bank: '',
            letak_tanah_bangunan: '',
            blok_perumahan: '',
            pemberi_hak: '',
            alamat_pemberi_hak: '',
            no_shgb: ''
        },

        // Formatted display values
        dispTransaksi: '', dispPenghasilan: '',

        // File info
        files: {
            ktp: null,
            sertifikat: null,
            sppt: null,
            ajb: null,
            surat_belum_menikah: null,
            suratMbr: null,
            perjanjianKredit: null,
            slip_gaji: null
        },

        fileObjects: {
            ktp: null,
            sertifikat: null,
            sppt: null,
            ajb: null,
            surat_belum_menikah: null,
            suratMbr: null,
            perjanjianKredit: null,
            slip_gaji: null
        },

        // NIK Validation State
        isNikValid: false,
        isCheckingNik: false,
        nikErrorMsg: '',

        // Existing file URLs (used in edit mode)
        existingFiles: { url_ktp: '', url_sertifikat: '', url_sppt: '', url_ajb: '', url_surat_belum_menikah: '', url_surat_mbr: '', url_perjanjian_kredit: '', url_slip_gaji: '' },

        // Dropdown data
        listKelurahan: [],
        listNotaris: [],
        listBank: [],

        // UI & Edit State
        showPreview: false,
        loading: false,
        isEditMode: false,
        editId: '',
        isNotaris: false,

        // MBR constants
        MAX_NILAI: 600000000,

        // Perumahan Data fetched dynamically
        dataPerumahan: {},

        // ── Lifecycle ────────────────────────────────────────────────
        async init() {
            this.listNotaris = [...LIST_NOTARIS];
            
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
                    const mandiriStr = 'mandiri/perseorangan - ' + userData.nama;
                    if (!this.listNotaris.includes(mandiriStr)) {
                        this.listNotaris.push(mandiriStr);
                    }
                    setTimeout(() => { this.form.notaris = mandiriStr; }, 50);
                }
            }

            await this.loadPerumahan();
            await this.loadBank();
            this.$nextTick(() => {
                initNopMask('nop_mbr_input');
            });

            // Check if we are in Edit Mode (Correcting rejected document)
            const editId = sessionStorage.getItem('edit_pengajuan_id');
            if (editId) {
                this.isEditMode = true;
                this.editId = editId;
                this.isNikValid = true; // Automatically valid if editing
                await this.loadEditData(editId);
            }
        },

        async loadPerumahan() {
            try {
                const { data, error } = await db.from('data_perumahan').select('*');
                if (error) throw error;
                let mapped = {};
                if (data) {
                    data.forEach(item => {
                        mapped[item.nama_perumahan] = {
                            pemberi: item.pemberi_hak,
                            alamat: item.alamat_pemberi_hak
                        };
                    });
                }
                this.dataPerumahan = mapped;
            } catch(e) {
                console.error("Gagal load perumahan:", e);
            }
        },

        async loadBank() {
            try {
                const { data, error } = await db.from('data_bank')
                    .select('nama_bank, kode_bank')
                    .order('nama_bank', { ascending: true });
                if (error) throw error;
                this.listBank = data || [];
            } catch(e) {
                console.error("Gagal load bank:", e);
                // Fallback to static list if database query fails
                this.listBank = [
                    { nama_bank: 'BANK TABUNGAN NEGARA', kode_bank: 'BTN' },
                    { nama_bank: 'BANK SULSELBAR', kode_bank: 'BPD SULSELBAR' },
                    { nama_bank: 'BANK RAKYAT INDONESIA', kode_bank: 'BRI' },
                    { nama_bank: 'BANK MANDIRI', kode_bank: 'MANDIRI' },
                    { nama_bank: 'BANK NEGARA INDONESIA', kode_bank: 'BNI' }
                ];
            }
        },

        // ── Load data for Edit Mode ─────────────────────────────────
        async loadEditData(id) {
            this.loading = true;
            try {
                const { data, error } = await db.from('pengajuan_mbr')
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
                this.form.kecamatan = data.kecamatan || '';

                if (this.form.kecamatan) {
                    this.listKelurahan = DATA_WILAYAH[this.form.kecamatan] || [];
                }
                this.form.kelurahan = data.kelurahan || '';

                this.form.luasBumi = data.luas_bumi || 0;
                this.form.luasBangunan = data.luas_bangunan || 0;
                this.form.nilaiTransaksi = data.nilai_transaksi || 0;
                this.form.notaris = data.notaris || '';
                this.form.pekerjaan = data.pekerjaan || '';
                this.form.penghasilan = data.penghasilan || 0;

                // New fields load
                this.form.tanggal_register = data.tanggal_register || '';
                this.form.tempat_lahir = data.tempat_lahir || '';
                this.form.tanggal_lahir = data.tanggal_lahir || '';
                this.form.nomor_perjanjian_kredit = data.nomor_perjanjian_kredit || '';
                this.form.bank = data.bank || '';
                this.form.letak_tanah_bangunan = data.letak_tanah_bangunan || '';
                this.form.blok_perumahan = data.blok_perumahan || '';
                this.form.pemberi_hak = data.pemberi_hak || '';
                this.form.alamat_pemberi_hak = data.alamat_pemberi_hak || '';
                this.form.no_shgb = data.no_shgb || '';

                // Populate display currency values
                this.dispTransaksi = this.form.nilaiTransaksi ? fmtRpDisplay(this.form.nilaiTransaksi) : '';
                this.dispPenghasilan = this.form.penghasilan ? fmtRpDisplay(this.form.penghasilan) : '';

                // Set existing files
                this.existingFiles.url_ktp = data.url_ktp || '';
                this.existingFiles.url_sertifikat = data.url_sertifikat || '';
                this.existingFiles.url_sppt = data.url_sppt || '';
                this.existingFiles.url_ajb = data.url_ajb || '';
                this.existingFiles.url_surat_belum_menikah = data.url_surat_belum_menikah || '';
                this.existingFiles.url_surat_mbr = data.url_surat_mbr || '';
                this.existingFiles.url_perjanjian_kredit = data.url_perjanjian_kredit || '';
                this.existingFiles.url_slip_gaji = data.url_slip_gaji || '';

                // Set NOP mask input
                this.$nextTick(() => {
                    const nopEl = document.getElementById('nop_mbr_input');
                    if (nopEl) {
                        nopEl.value = this.form.nop;
                        nopEl.dispatchEvent(new Event('input'));
                    }
                });

            } catch (err) {
                console.error('[MBR Form] loadEditData error:', err);
                Swal.fire({ icon: 'error', title: 'Gagal Memuat Data Lama', text: err.message, confirmButtonColor: '#16a34a' });
            } finally {
                this.loading = false;
            }
        },

        // ── Computed ─────────────────────────────────────────────────
        get estimasiBphtb() {
            // MBR is completely free (Gratis)
            return 0;
        },

        get kecamatanList() {
            return Object.keys(DATA_WILAYAH);
        },

        get listPerumahan() {
            return Object.keys(this.dataPerumahan);
        },

        get nilaiMelebihiMax() {
            return this.form.nilaiTransaksi > this.MAX_NILAI;
        },

        // ── Methods ──────────────────────────────────────────────────
        onKecamatanChange() {
            this.listKelurahan = DATA_WILAYAH[this.form.kecamatan] || [];
            this.form.kelurahan = '';
        },

        onPerumahanChange() {
            const selected = this.form.letak_tanah_bangunan;
            if (selected && this.dataPerumahan[selected]) {
                const info = this.dataPerumahan[selected];
                this.form.pemberi_hak = info.pemberi;
                this.form.alamat_pemberi_hak = info.alamat;
            } else {
                this.form.pemberi_hak = '';
                this.form.alamat_pemberi_hak = '';
            }
        },

        async onNikInput(e) {
            this.form.nik = onlyNum(e.target.value).slice(0, 16);
            e.target.value = this.form.nik;
            
            // Reset state
            this.isNikValid = false;
            this.nikErrorMsg = '';

            if (this.form.nik.length === 16) {
                this.isCheckingNik = true;
                try {
                    let query = db.from('pengajuan_mbr').select('no_pengajuan').eq('nik', this.form.nik);
                    if (this.isEditMode && this.editId) {
                        query = query.neq('no_pengajuan', this.editId);
                    }
                    const { data, error } = await query.limit(1);
                    if (error) throw error;
                    
                    if (data && data.length > 0) {
                        this.isNikValid = false;
                        this.nikErrorMsg = 'NIK sudah digunakan pada pengajuan lain.';
                        Swal.fire({
                            icon: 'error',
                            title: 'NIK Ditolak',
                            text: 'NIK ini sudah terdaftar dalam sistem E-BPHTB. Seluruh kolom isian dibekukan sampai NIK yang valid dimasukkan.',
                            confirmButtonColor: '#16a34a'
                        });
                    } else {
                        this.isNikValid = true;
                    }
                } catch (err) {
                    console.error('Check NIK error:', err);
                } finally {
                    this.isCheckingNik = false;
                }
            }
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
                Swal.fire({ icon: 'warning', title: 'File Terlalu Besar', text: 'Maksimal 2MB per file.', confirmButtonColor: '#16a34a' });
                e.target.value = ''; return;
            }
            if (file.type !== 'application/pdf') {
                Swal.fire({ icon: 'warning', title: 'Format Tidak Valid', text: 'Hanya file PDF yang diterima.', confirmButtonColor: '#16a34a' });
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
                Swal.fire({ icon: 'warning', title: 'NIK Tidak Lengkap', text: 'NIK harus 16 digit.', confirmButtonColor: '#16a34a' });
                return;
            }
            if (!this.isEditMode) {
                if (!this.files?.ktp || !this.files?.sertifikat || !this.files?.sppt || !this.files?.ajb || !this.files?.suratMbr || !this.files?.perjanjianKredit || !this.files?.slip_gaji) {
                    Swal.fire({ icon: 'warning', title: 'Berkas Belum Lengkap', text: 'Harap lengkapi semua dokumen yang berstatus wajib (*).', confirmButtonColor: '#16a34a' });
                    return;
                }
            } else {
                if ((!this.files?.ktp && !this.existingFiles?.url_ktp) || 
                    (!this.files?.sertifikat && !this.existingFiles?.url_sertifikat) || 
                    (!this.files?.sppt && !this.existingFiles?.url_sppt) ||
                    (!this.files?.ajb && !this.existingFiles?.url_ajb) ||
                    (!this.files?.suratMbr && !this.existingFiles?.url_surat_mbr) ||
                    (!this.files?.perjanjianKredit && !this.existingFiles?.url_perjanjian_kredit) ||
                    (!this.files?.slip_gaji && !this.existingFiles?.url_slip_gaji)) {
                    Swal.fire({ icon: 'warning', title: 'Berkas Belum Lengkap', text: 'Harap pastikan semua dokumen wajib (*) tersedia.', confirmButtonColor: '#16a34a' });
                    return;
                }
            }
            if (this.nilaiMelebihiMax) {
                Swal.fire({ icon: 'warning', title: 'Nilai Melebihi Batas', text: 'Nilai perolehan MBR maksimal Rp 600.000.000.', confirmButtonColor: '#16a34a' });
                return;
            }
            const nopEl = document.getElementById('nop_mbr_input');
            this.form.nop = nopEl ? nopEl.value : '';
            this.showPreview = true;
        },

        async submitData() {
            this.loading = true;
            try {
                // Ambil user yang sedang login
                const _userStr = sessionStorage.getItem('ebphtb_user_data');
                const _userData = _userStr ? JSON.parse(_userStr) : null;
                const _submittedById = _userData ? (_userData.auth_id || _userData.id || null) : null;
                let ktpUrl = this.existingFiles.url_ktp;
                let sertifikatUrl = this.existingFiles.url_sertifikat;
                let spptUrl = this.existingFiles.url_sppt;
                let ajbUrl = this.existingFiles.url_ajb;
                let suratBelumMenikahUrl = this.existingFiles.url_surat_belum_menikah;
                let suratMbrUrl = this.existingFiles.url_surat_mbr;
                let perjanjianKreditUrl = this.existingFiles.url_perjanjian_kredit;
                let slipGajiUrl = this.existingFiles.url_slip_gaji;

                // Check if any new files are being uploaded
                if (this.fileObjects?.ktp || this.fileObjects?.sertifikat || this.fileObjects?.sppt || this.fileObjects?.ajb || this.fileObjects?.surat_belum_menikah || this.fileObjects?.suratMbr || this.fileObjects?.perjanjianKredit || this.fileObjects?.slip_gaji) {
                    Swal.fire({
                        title: 'Mengunggah Berkas...',
                        text: 'Menyimpan file ke Google Drive (1/2)',
                        allowOutsideClick: false,
                        didOpen: () => Swal.showLoading()
                    });

                    const formData = new FormData();
                    formData.append('aksi', 'upload_file_mbr');
                    formData.append('nik', this.form.nik);
                    if (this.fileObjects?.ktp)              formData.append('ktp_file',              await toBase64(this.fileObjects.ktp));
                    if (this.fileObjects?.sertifikat)       formData.append('sertifikat_file',       await toBase64(this.fileObjects.sertifikat));
                    if (this.fileObjects?.sppt)             formData.append('sppt_file',             await toBase64(this.fileObjects.sppt));
                    if (this.fileObjects?.ajb)              formData.append('ajb_file',              await toBase64(this.fileObjects.ajb));
                    if (this.fileObjects?.surat_belum_menikah) formData.append('surat_belum_menikah_file', await toBase64(this.fileObjects.surat_belum_menikah));
                    if (this.fileObjects?.suratMbr)         formData.append('surat_mbr_file',         await toBase64(this.fileObjects.suratMbr));
                    if (this.fileObjects?.perjanjianKredit) formData.append('perjanjian_kredit_file', await toBase64(this.fileObjects.perjanjianKredit));
                    if (this.fileObjects?.slip_gaji)        formData.append('slip_gaji_file',         await toBase64(this.fileObjects.slip_gaji));

                    const scriptRes = await fetch(CONFIG.SCRIPT_URL, { method: 'POST', body: formData });
                    const scriptResult = await scriptRes.json();
                    if (scriptResult.result !== 'success') throw new Error('Gagal upload ke Drive: ' + (scriptResult.error || 'Unknown'));

                    if (scriptResult.url_ktp)               ktpUrl = scriptResult.url_ktp;
                    if (scriptResult.url_sertifikat)        sertifikatUrl = scriptResult.url_sertifikat;
                    if (scriptResult.url_sppt)              spptUrl = scriptResult.url_sppt;
                    if (scriptResult.url_ajb)               ajbUrl = scriptResult.url_ajb;
                    if (scriptResult.url_surat_belum_menikah) suratBelumMenikahUrl = scriptResult.url_surat_belum_menikah;
                    if (scriptResult.url_surat_mbr)         suratMbrUrl = scriptResult.url_surat_mbr;
                    if (scriptResult.url_perjanjian_kredit) perjanjianKreditUrl = scriptResult.url_perjanjian_kredit;
                    if (scriptResult.url_slip_gaji)         slipGajiUrl = scriptResult.url_slip_gaji;
                }

                Swal.fire({
                    title: 'Menyimpan Data...',
                    text: 'Menyimpan ke database (2/2)',
                    allowOutsideClick: false,
                    didOpen: () => Swal.showLoading()
                });

                const payload = {
                    nik:             this.form.nik,
                    nama:            this.form.nama,
                    alamat_wp:       this.form.alamatWp,
                    email:           this.form.email,
                    wa:              this.form.wa,
                    nop:             this.form.nop,
                    nop_type:        this.form.nop_type,
                    kecamatan:       this.form.kecamatan,
                    kelurahan:       this.form.kelurahan,
                    luas_bumi:       this.form.luasBumi,
                    luas_bangunan:   this.form.luasBangunan,
                    nilai_transaksi: this.form.nilaiTransaksi,
                    notaris:         this.form.notaris,
                    pajak:           0, // BPHTB MBR is 0 (Free)
                    pekerjaan:       this.form.pekerjaan,
                    penghasilan:     this.form.penghasilan,
                    url_ktp:         ktpUrl,
                    url_sertifikat:  sertifikatUrl,
                    url_sppt:        spptUrl,
                    url_ajb:         ajbUrl,
                    url_surat_belum_menikah: suratBelumMenikahUrl,
                    url_surat_mbr:   suratMbrUrl,
                    url_perjanjian_kredit: perjanjianKreditUrl,
                    url_slip_gaji:   slipGajiUrl,
                    alur_berkas:     'Berkas sedang diverifikasi', // Reset status
                    catatan_penolakan: null, // Clear rejection notes

                    // Save the user's MBR HTML fields
                    tanggal_register:        this.form.tanggal_register,
                    tempat_lahir:            this.form.tempat_lahir,
                    tanggal_lahir:           this.form.tanggal_lahir,
                    nomor_perjanjian_kredit: this.form.nomor_perjanjian_kredit,
                    bank:                    this.form.bank,
                    letak_tanah_bangunan:    this.form.letak_tanah_bangunan,
                    blok_perumahan:          this.form.blok_perumahan,
                    pemberi_hak:             this.form.pemberi_hak,
                    alamat_pemberi_hak:      this.form.alamat_pemberi_hak,
                    no_shgb:                 this.form.no_shgb,
                    submitted_by_id:         _submittedById
                };

                if (this.isEditMode) {
                    const { error } = await db.from('pengajuan_mbr')
                        .update(payload)
                        .eq('no_pengajuan', this.editId);

                    if (error) throw new Error('Gagal mengupdate database: ' + error.message);
                    sessionStorage.removeItem('edit_pengajuan_id');

                    try { logActivity('Revisi BPHTB MBR', `Melakukan revisi untuk berkas No: ${this.editData.no_pengajuan}`); } catch(e) {}

                    await Swal.fire({
                        icon: 'success',
                        title: 'Berkas MBR Berhasil Diperbarui!',
                        text: 'Pengajuan MBR Anda telah direvisi dan sedang diverifikasi ulang.',
                        confirmButtonColor: '#16a34a'
                    });
                } else {
                    const noPengajuan = generateNoPengajuan('mbr');
                    payload.no_pengajuan = noPengajuan;
                    payload.created_at = new Date().toISOString();

                    const { error } = await db.from('pengajuan_mbr').insert([payload]);
                    if (error) throw new Error('Gagal menyimpan ke database: ' + error.message);

                    try { logActivity('Pengajuan BPHTB MBR', `Mengajukan berkas baru dengan No: ${noPengajuan}`); } catch(e) {}

                    await Swal.fire({
                        icon: 'success',
                        title: 'Pengajuan MBR Berhasil!',
                        html: `Data MBR Anda telah diterima.<br><b>No. Pengajuan: ${noPengajuan}</b>`,
                        confirmButtonColor: '#16a34a'
                    });
                }

                window.location.href = 'riwayat-mbr.html';

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
