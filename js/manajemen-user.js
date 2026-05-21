/**
 * manajemen-user.js — Admin user management logic
 */

// SHA-256 Hashing helper for password resets / new internal users
async function hashSHA256(str) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder("utf-8").encode(str));
    return Array.prototype.map.call(new Uint8Array(buf), x=>(('00'+x.toString(16)).slice(-2))).join('');
}

function manajemenUserApp() {
    return {
        users: [],
        loading: false,
        saving: false,
        
        searchQuery: '',
        filterRole: '',
        filterStatus: '',

        showModal: false,
        modalMode: 'add', // add, edit, approve
        
        form: {
            id: null,
            username: '',
            nama: '',
            nik: '',
            role: '',
            email: '',
            no_hp: '',
            password: '',
            passwordConfirm: '',
            passwordReset: false
        },

        init() {
            // Additional protection: only admin can be here
            const user = checkAuth();
            if (user && user.role !== 'admin') {
                window.location.href = 'index.html';
                return;
            }
            this.fetchUsers();
        },

        async fetchUsers() {
            this.loading = true;
            try {
                const { data, error } = await db.from('users').select('*').order('created_at', { ascending: false });
                if (error) throw error;
                this.users = data || [];
            } catch (err) {
                console.error('fetchUsers error:', err);
                Swal.fire({ icon: 'error', title: 'Gagal Memuat Data', text: err.message });
            } finally {
                this.loading = false;
            }
        },

        get filteredUsers() {
            let res = this.users;
            if (this.searchQuery) {
                const q = this.searchQuery.toLowerCase();
                res = res.filter(u => 
                    (u.nama && u.nama.toLowerCase().includes(q)) || 
                    (u.username && u.username.toLowerCase().includes(q)) ||
                    (u.nik && u.nik.includes(q))
                );
            }
            if (this.filterRole) {
                res = res.filter(u => u.role === this.filterRole);
            }
            if (this.filterStatus) {
                res = res.filter(u => u.status === this.filterStatus);
            }
            return res;
        },

        statusBadge(status) {
            if (status === 'aktif') return 'badge-green';
            if (status === 'beku') return 'badge-red';
            return 'badge-yellow'; // pending
        },

        // --- Modals ---
        openAddModal() {
            this.modalMode = 'add';
            this.resetForm();
            this.showModal = true;
        },

        openEditModal(u) {
            this.modalMode = 'edit';
            this.form = {
                id: u.id,
                username: u.username,
                nama: u.nama,
                nik: u.nik || '',
                role: u.role || '',
                email: u.email || '',
                no_hp: u.no_hp || '',
                password: '', // blank by default
                passwordConfirm: '',
                passwordReset: false
            };
            this.showModal = true;
        },

        openApproveModal(u) {
            this.modalMode = 'approve';
            this.form = {
                id: u.id,
                username: u.username,
                nama: u.nama,
                nik: u.nik || '',
                role: u.requested_role || '', // prepopulate with requested
                email: u.email || '',
                no_hp: u.no_hp || '',
                password: '',
                passwordConfirm: '',
                passwordReset: false
            };
            this.showModal = true;
        },

        resetForm() {
            this.form = { id:null, username:'', nama:'', nik:'', role:'', email:'', no_hp:'', password:'', passwordConfirm:'', passwordReset:false };
        },

        // --- Save ---
        async saveUser() {
            this.saving = true;
            try {
                let payload = {
                    nama: this.form.nama,
                    nik: this.form.nik,
                    role: this.form.role,
                    email: this.form.email,
                    no_hp: this.form.no_hp
                };

                // Hash password if provided
                if (this.form.password || this.form.passwordConfirm) {
                    if (this.form.password !== this.form.passwordConfirm) {
                        throw new Error('Password dan Konfirmasi Password tidak cocok!');
                    }
                    if (this.form.password.length < 6) {
                        throw new Error('Password minimal 6 karakter!');
                    }
                    payload.password = await hashSHA256(this.form.password);
                }

                if (this.modalMode === 'add') {
                    // check unique
                    const { data: exist } = await db.from('users').select('username').eq('username', this.form.username);
                    if (exist && exist.length > 0) throw new Error('Username sudah ada!');
                    
                    if (!payload.password) throw new Error('Password wajib diisi untuk user baru.');
                    
                    payload.username = this.form.username;
                    payload.status = 'aktif';

                    const { error } = await db.from('users').insert([payload]);
                    if (error) throw error;
                    
                    logActivity('Tambah User Internal', `Menambahkan user ${this.form.username} dengan role ${this.form.role}`);
                    Swal.fire({ icon: 'success', title: 'User Ditambahkan', text: 'Pengguna internal berhasil dibuat.', confirmButtonColor: '#1d4ed8' });

                } else if (this.modalMode === 'approve') {
                    payload.status = 'aktif';
                    const { error } = await db.from('users').update(payload).eq('id', this.form.id);
                    if (error) throw error;

                    logActivity('Setujui Pengguna', `Menyetujui pendaftaran user ${this.form.username}`);
                    Swal.fire({ icon: 'success', title: 'Disetujui', text: 'Akun berhasil disetujui dan diaktifkan.', confirmButtonColor: '#16a34a' });
                    
                } else if (this.modalMode === 'edit') {
                    const { error } = await db.from('users').update(payload).eq('id', this.form.id);
                    if (error) throw error;

                    logActivity('Edit User', `Mengedit data user ${this.form.username}`);
                    Swal.fire({ icon: 'success', title: 'Diperbarui', text: 'Data pengguna berhasil diubah.', confirmButtonColor: '#1d4ed8' });
                }

                this.showModal = false;
                await this.fetchUsers();

            } catch (err) {
                console.error('saveUser error:', err);
                Swal.fire({ icon: 'error', title: 'Gagal Menyimpan', text: err.message });
            } finally {
                this.saving = false;
            }
        },

        async toggleFreeze(u, newStatus) {
            const isBeku = newStatus === 'beku';
            const confirm = await Swal.fire({
                title: isBeku ? 'Bekukan Akun?' : 'Aktifkan Akun?',
                text: isBeku ? 'Pengguna ini tidak akan bisa login lagi.' : 'Pengguna ini akan bisa login kembali.',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: isBeku ? '#dc2626' : '#16a34a',
                cancelButtonColor: '#64748b',
                confirmButtonText: isBeku ? 'Ya, Bekukan!' : 'Ya, Aktifkan!'
            });

            if (!confirm.isConfirmed) return;

            this.loading = true;
            try {
                const { error } = await db.from('users').update({ status: newStatus }).eq('id', u.id);
                if (error) throw error;

                logActivity('Ubah Status User', `Mengubah status user ${u.username} menjadi ${newStatus}`);
                await this.fetchUsers();
            } catch (err) {
                console.error('toggleFreeze error:', err);
                Swal.fire({ icon: 'error', title: 'Gagal Memperbarui Status', text: err.message });
            } finally {
                this.loading = false;
            }
        }
    }
}
