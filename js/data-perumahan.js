function dataPerumahanApp() {
    return {
        data: [],
        loading: false,
        searchQuery: '',
        
        showModal: false,
        modalMode: 'add', // 'add' or 'edit'
        saving: false,
        
        form: {
            id: null,
            nama_perumahan: '',
            pemberi_hak: '',
            alamat_pemberi_hak: ''
        },

        init() {
            this.fetchData();
        },

        get filteredData() {
            let res = this.data;
            if (this.searchQuery) {
                const sq = this.searchQuery.toLowerCase();
                res = res.filter(u => 
                    (u.nama_perumahan && u.nama_perumahan.toLowerCase().includes(sq)) ||
                    (u.pemberi_hak && u.pemberi_hak.toLowerCase().includes(sq))
                );
            }
            return res;
        },

        async fetchData() {
            this.loading = true;
            try {
                const { data, error } = await db.from('data_perumahan')
                    .select('*')
                    .order('nama_perumahan', { ascending: true });

                if (error) throw error;
                this.data = data || [];
            } catch (err) {
                console.error('[Data Perumahan] fetchData error:', err);
                Swal.fire({
                    icon: 'error',
                    title: 'Gagal Memuat Data',
                    text: err.message,
                    confirmButtonColor: '#dc2626'
                });
            } finally {
                this.loading = false;
            }
        },

        openAddModal() {
            this.modalMode = 'add';
            this.form = {
                id: null,
                nama_perumahan: '',
                pemberi_hak: '',
                alamat_pemberi_hak: ''
            };
            this.showModal = true;
        },

        openEditModal(item) {
            this.modalMode = 'edit';
            this.form = {
                id: item.id,
                nama_perumahan: item.nama_perumahan || '',
                pemberi_hak: item.pemberi_hak || '',
                alamat_pemberi_hak: item.alamat_pemberi_hak || ''
            };
            
            this.showModal = true;
        },

        async saveData() {
            this.saving = true;
            try {
                const payload = {
                    nama_perumahan: this.form.nama_perumahan,
                    pemberi_hak: this.form.pemberi_hak,
                    alamat_pemberi_hak: this.form.alamat_pemberi_hak
                };

                if (this.modalMode === 'add') {
                    const { error } = await db.from('data_perumahan').insert([payload]);
                    if (error) throw error;
                    
                    Swal.fire({
                        icon: 'success',
                        title: 'Berhasil',
                        text: 'Data perumahan baru berhasil ditambahkan.',
                        confirmButtonColor: '#1d4ed8'
                    });
                } else {
                    const { error } = await db.from('data_perumahan')
                        .update(payload)
                        .eq('id', this.form.id);
                        
                    if (error) throw error;
                    
                    Swal.fire({
                        icon: 'success',
                        title: 'Berhasil',
                        text: 'Data perumahan berhasil diperbarui.',
                        confirmButtonColor: '#1d4ed8'
                    });
                }

                this.showModal = false;
                this.fetchData();
            } catch (err) {
                console.error('[Data Perumahan] saveData error:', err);
                Swal.fire({
                    icon: 'error',
                    title: 'Gagal Menyimpan Data',
                    text: err.message,
                    confirmButtonColor: '#dc2626'
                });
            } finally {
                this.saving = false;
            }
        },

        async deleteItem(item) {
            const confirm = await Swal.fire({
                title: 'Apakah Anda Yakin?',
                html: `Menghapus data perumahan <b>${item.nama_perumahan}</b>?`,
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
                const { error } = await db.from('data_perumahan')
                    .delete()
                    .eq('id', item.id);

                if (error) throw error;

                Swal.fire({
                    icon: 'success',
                    title: 'Terhapus',
                    text: 'Data perumahan berhasil dihapus.',
                    confirmButtonColor: '#1d4ed8'
                });

                this.fetchData();
            } catch (err) {
                console.error('[Data Perumahan] deleteItem error:', err);
                Swal.fire({
                    icon: 'error',
                    title: 'Gagal Menghapus Data',
                    text: err.message,
                    confirmButtonColor: '#dc2626'
                });
                this.loading = false;
            }
        }
    };
}
