function dataBankApp() {
    return {
        data: [],
        loading: false,
        searchQuery: '',
        
        showModal: false,
        modalMode: 'add', // 'add' or 'edit'
        saving: false,
        
        form: {
            id: null,
            nama_bank: '',
            kode_bank: ''
        },

        init() {
            this.fetchData();
        },

        get filteredData() {
            let res = this.data;
            if (this.searchQuery) {
                const sq = this.searchQuery.toLowerCase();
                res = res.filter(u => 
                    (u.nama_bank && u.nama_bank.toLowerCase().includes(sq)) ||
                    (u.kode_bank && u.kode_bank.toLowerCase().includes(sq))
                );
            }
            return res;
        },

        async fetchData() {
            this.loading = true;
            try {
                const { data, error } = await db.from('data_bank')
                    .select('*')
                    .order('nama_bank', { ascending: true });

                if (error) throw error;
                this.data = data || [];
            } catch (err) {
                console.error('[Data Bank] fetchData error:', err);
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

        async seedDefaultBanks() {
            this.loading = true;
            try {
                const defaultBanks = [
                    { nama_bank: 'BANK TABUNGAN NEGARA', kode_bank: 'BTN' },
                    { nama_bank: 'BANK SULSELBAR', kode_bank: 'BPD SULSELBAR' },
                    { nama_bank: 'BANK RAKYAT INDONESIA', kode_bank: 'BRI' },
                    { nama_bank: 'BANK MANDIRI', kode_bank: 'MANDIRI' },
                    { nama_bank: 'BANK NEGARA INDONESIA', kode_bank: 'BNI' }
                ];
                
                const { error } = await db.from('data_bank').insert(defaultBanks);
                if (error) throw error;
                
                Swal.fire({
                    icon: 'success',
                    title: 'Berhasil',
                    text: '5 data bank bawaan berhasil ditambahkan.',
                    confirmButtonColor: '#1d4ed8'
                });
                
                this.fetchData();
            } catch (err) {
                console.error('[Data Bank] seedDefaultBanks error:', err);
                Swal.fire({
                    icon: 'error',
                    title: 'Gagal Menarik Data',
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
                nama_bank: '',
                kode_bank: ''
            };
            this.showModal = true;
        },

        openEditModal(item) {
            this.modalMode = 'edit';
            this.form = {
                id: item.id,
                nama_bank: item.nama_bank || '',
                kode_bank: item.kode_bank || ''
            };
            
            this.showModal = true;
        },

        async saveData() {
            this.saving = true;
            try {
                const payload = {
                    nama_bank: this.form.nama_bank,
                    kode_bank: this.form.kode_bank.toUpperCase()
                };

                if (this.modalMode === 'add') {
                    const { error } = await db.from('data_bank').insert([payload]);
                    if (error) throw error;
                    
                    Swal.fire({
                        icon: 'success',
                        title: 'Berhasil',
                        text: 'Data bank baru berhasil ditambahkan.',
                        confirmButtonColor: '#1d4ed8'
                    });
                } else {
                    const updateUrl = `${CONFIG.SUPABASE_URL}/rest/v1/data_bank?id=eq.${this.form.id}`;
                    const res = await fetch(updateUrl, {
                        method: 'PATCH',
                        headers: {
                            'apikey': CONFIG.SUPABASE_ANON_KEY,
                            'Authorization': `Bearer ${CONFIG.SUPABASE_ANON_KEY}`,
                            'Content-Type': 'application/json',
                            'Prefer': 'return=representation'
                        },
                        body: JSON.stringify(payload)
                    });
                    
                    if (!res.ok) {
                        const errText = await res.text();
                        throw new Error('Gagal update: ' + errText);
                    }
                    
                    const data = await res.json();
                    
                    if (!data || data.length === 0) {
                        throw new Error(`Tidak ada data yang diupdate (ID: ${this.form.id}). Pastikan ID valid atau RLS mengizinkan.`);
                    }
                    
                    await Swal.fire({
                        icon: 'success',
                        title: 'Berhasil',
                        text: 'Data bank berhasil diperbarui.',
                        confirmButtonColor: '#1d4ed8'
                    });
                }

                this.showModal = false;
                await this.fetchData();
            } catch (err) {
                console.error('[Data Bank] saveData error:', err);
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
                html: `Menghapus data bank <b>${item.nama_bank} (${item.kode_bank})</b>?`,
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
                const { error } = await db.from('data_bank')
                    .delete()
                    .eq('id', item.id);

                if (error) throw error;

                Swal.fire({
                    icon: 'success',
                    title: 'Terhapus',
                    text: 'Data bank berhasil dihapus.',
                    confirmButtonColor: '#1d4ed8'
                });

                this.fetchData();
            } catch (err) {
                console.error('[Data Bank] deleteItem error:', err);
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
