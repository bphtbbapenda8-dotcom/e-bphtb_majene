/**
 * sidebar.js — Build sidebar, auth management, mobile drawer with Roles
 */

// ── Auth ──────────────────────────────────────────────────────────

async function checkAuth() {
    const userStr = sessionStorage.getItem('ebphtb_user_data');
    if (!userStr) {
        sessionStorage.removeItem('ebphtb_user_data');
        sessionStorage.removeItem('ebphtb_user');
        window.location.href = 'index.html';
        return null;
    }

    try {
        // Validasi ke Supabase apakah sesi (Token JWT) masih aktif
        const { data: { session }, error } = await db.auth.getSession();
        if (error || !session) {
            throw new Error('Sesi tidak valid atau telah berakhir');
        }
        return JSON.parse(userStr);
    } catch (err) {
        console.error('Auth Check Failed:', err);
        sessionStorage.removeItem('ebphtb_user_data');
        sessionStorage.removeItem('ebphtb_user');
        await db.auth.signOut(); // Pastikan supabase auth juga bersih
        window.location.href = 'index.html';
        return null;
    }
}

function getUser() {
    const userStr = sessionStorage.getItem('ebphtb_user_data');
    if (userStr) return JSON.parse(userStr);
    
    // Fallback for older code that might just use ebphtb_user
    const fallback = sessionStorage.getItem('ebphtb_user');
    return fallback ? { nama: fallback, role: 'Pengguna' } : { nama: 'User', role: 'Pengguna' };
}

async function logout() {
    sessionStorage.removeItem('ebphtb_user_data');
    sessionStorage.removeItem('ebphtb_user');
    await db.auth.signOut();
    window.location.href = 'index.html';
}

async function changePassword() {
    // Dengan Supabase Auth, ganti password harus melalui API bawaannya (db.auth.updateUser)
    const { value: formValues } = await Swal.fire({
        title: 'Ganti Password',
        html: `
            <input id="swal-new-pwd" type="password" class="swal2-input" placeholder="Password Baru" style="font-size:0.875rem">
            <input id="swal-confirm-pwd" type="password" class="swal2-input" placeholder="Konfirmasi Password Baru" style="font-size:0.875rem">
        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'Simpan',
        cancelButtonText: 'Batal',
        confirmButtonColor: '#1d4ed8',
        preConfirm: () => {
            const newP = document.getElementById('swal-new-pwd').value;
            const conf = document.getElementById('swal-confirm-pwd').value;
            
            if (!newP || !conf) {
                Swal.showValidationMessage('Semua kolom harus diisi');
                return false;
            }
            if (newP !== conf) {
                Swal.showValidationMessage('Password baru dan konfirmasi tidak cocok');
                return false;
            }
            if (newP.length < 6) {
                Swal.showValidationMessage('Password minimal 6 karakter');
                return false;
            }
            return { newP };
        }
    });

    if (formValues) {
        try {
            Swal.fire({
                title: 'Menyimpan...',
                allowOutsideClick: false,
                didOpen: () => { Swal.showLoading(); }
            });

            const { data, error } = await db.auth.updateUser({
                password: formValues.newP
            });

            if (error) throw error;

            Swal.fire({
                icon: 'success',
                title: 'Berhasil',
                text: 'Password berhasil diubah!',
                confirmButtonColor: '#1d4ed8'
            });
        } catch (err) {
            Swal.fire({
                icon: 'error',
                title: 'Gagal',
                text: err.message,
                confirmButtonColor: '#dc2626'
            });
        }
    }
}

// ── Role-based Menu ───────────────────────────────────────────────

function getMenuForRole(role) {
    const menuPengajuan = {
        id: 'pengajuan',
        label: 'Pengajuan BPHTB',
        icon: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>`,
        subs: [
            { id: 'bphtb',     label: 'Pengajuan Reguler', href: 'pengajuan-bphtb.html' },
            { id: 'mbr',       label: 'Pengajuan MBR',     href: 'pengajuan-mbr.html' },
        ]
    };

    const menuRiwayat = {
        id: 'riwayat',
        label: 'Riwayat Berkas',
        icon: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>`,
        subs: [
            { id: 'riwayat-bphtb', label: 'Riwayat Reguler', href: 'riwayat-bphtb.html' },
            { id: 'riwayat-mbr',   label: 'Riwayat MBR',     href: 'riwayat-mbr.html' },
        ]
    };

    const menuVerifikasi = {
        id: 'verifikasi',
        label: 'Verifikasi',
        icon: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`,
        subs: []
    };

    const menuAdmin = {
        id: 'admin',
        label: 'Akses Admin',
        icon: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/></svg>`,
        subs: [
            { id: 'admin-bphtb', label: 'Verifikasi Admin (Reguler)', href: 'admin-bphtb.html' },
            { id: 'admin-mbr',   label: 'Verifikasi Admin (MBR)',      href: 'admin-mbr.html' },
        ]
    };

    const menuManajemenData = {
        id: 'manajemen-data',
        label: 'Manajemen Data',
        icon: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2 1.5 3 4 3h8c2.5 0 4-1 4-3V7m-4 0V5c0-1.5-1-2.5-3-2.5H9C7 2.5 6 3.5 6 5v2m10 0H8"/></svg>`,
        subs: [
            { id: 'data-perumahan', label: 'Data Perumahan', href: 'data-perumahan.html' }
        ]
    };

    const menuManajemenUser = {
        id: 'manajemen-user',
        label: 'Manajemen User',
        icon: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>`,
        subs: [
            { id: 'manajemen-user-list', label: 'Daftar Pengguna', href: 'manajemen-user.html' }
        ]
    };

    const menuLogActivity = {
        id: 'log-activity',
        label: 'Log Aktivitas',
        icon: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`,
        subs: [
            { id: 'log-sistem', label: 'Log Sistem', href: 'log-activity.html' }
        ]
    };

    // Sub-menus for Verification
    const subVerifBerkas = { id: 'verifikasi-berkas', label: 'Verifikasi Berkas', href: 'verifikasi-berkas.html' };
    const subVerifLapangan = { id: 'verifikasi-lapangan', label: 'Verifikasi Lapangan', href: 'verifikasi-lapangan.html' };

    let activeMenus = [];

    if (role === 'admin') {
        menuVerifikasi.subs.push(subVerifBerkas, subVerifLapangan);
        activeMenus = [menuPengajuan, menuRiwayat, menuVerifikasi, menuAdmin, menuManajemenData, menuManajemenUser, menuLogActivity];
    } else if (role === 'verifikator_berkas') {
        menuVerifikasi.subs.push(subVerifBerkas);
        activeMenus = [menuPengajuan, menuRiwayat, menuVerifikasi];
    } else if (role === 'verifikator_lapangan') {
        menuVerifikasi.subs.push(subVerifLapangan);
        activeMenus = [menuPengajuan, menuRiwayat, menuVerifikasi];
    } else {
        // Notaris, Mandiri, etc
        if (role === 'mandiri' || role === 'peorangan') {
            menuPengajuan.subs = [{ id: 'bphtb', label: 'Pengajuan Reguler', href: 'pengajuan-bphtb.html' }];
            menuRiwayat.subs = [{ id: 'riwayat-bphtb', label: 'Riwayat Reguler', href: 'riwayat-bphtb.html' }];
        }
        activeMenus = [menuPengajuan, menuRiwayat];
    }

    return activeMenus;
}

// ── Sidebar Builder ───────────────────────────────────────────────

function buildSidebarHTML(activeMenu, activeSubMenu, userData) {
    const userName = userData.nama || 'User';
    const userRole = userData.role || 'Pengguna';
    const initial = userName.charAt(0).toUpperCase();

    const displayRole = userRole.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());

    const menus = getMenuForRole(userRole);

    let html = `
      <div class="sidebar-header">
        <img src="logo.png" alt="Logo Majene" class="sidebar-logo-img">
        <div>
          <p class="sidebar-title">e-BPHTB</p>
          <p class="sidebar-subtitle">Bapenda Majene</p>
        </div>
      </div>
      <nav class="sidebar-nav">`;

    menus.forEach(menu => {
        const isActive = menu.id === activeMenu;
        html += `
          <div class="sidebar-menu-group">
            <div class="sidebar-menu-parent ${isActive ? 'active' : ''}"
                 data-menu-id="${menu.id}"
                 onclick="toggleSidebarMenu('${menu.id}')">
              <div class="sidebar-menu-parent-inner">
                <span class="sidebar-menu-icon">${menu.icon}</span>
                <span>${menu.label}</span>
              </div>
              <svg class="sidebar-chevron ${isActive ? 'rotated' : ''}"
                   fill="none" stroke="currentColor" viewBox="0 0 24 24" width="12" height="12">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M19 9l-7 7-7-7"/>
              </svg>
            </div>
            <div class="sidebar-submenu-container ${isActive ? 'expanded' : ''}"
                 id="submenu-${menu.id}">`;

        menu.subs.forEach(sub => {
            const isSubActive = sub.id === activeSubMenu;
            html += `
              <a href="${sub.href}" class="sidebar-submenu-link ${isSubActive ? 'active' : ''}">
                <span class="sidebar-submenu-dot"></span>
                <span>${sub.label}</span>
              </a>`;
        });

        html += `</div></div>`;
    });

    html += `</nav>
      <div class="sidebar-user">
        <div class="sidebar-user-avatar">${initial}</div>
        <div class="sidebar-user-info">
          <p class="sidebar-user-name">${userName}</p>
          <p class="sidebar-user-role">${displayRole}</p>
        </div>
        <div style="display:flex;flex-direction:column;gap:0.35rem">
            <button class="sidebar-logout-btn" onclick="changePassword()" title="Ganti Password" style="color:#2563eb;background:#eff6ff">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4v-3.286l5.964-5.964A6 6 0 1121 9z"/>
              </svg>
            </button>
            <button class="sidebar-logout-btn" onclick="logout()" title="Keluar">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
              </svg>
            </button>
        </div>
      </div>`;

    return html;
}

// ── Main Init ─────────────────────────────────────────────────────

async function initSidebar() {
    const userData = await checkAuth();
    if (!userData) return;

    const activeMenu    = document.body.dataset.menu    || '';
    const activeSubMenu = document.body.dataset.submenu || '';

    // Auth Enforcement: If user doesn't have access to this page, boot them to their default
    if (!enforcePageAccess(userData.role, activeMenu)) {
        return; // Stop rendering if redirecting
    }

    const sidebarHTML = buildSidebarHTML(activeMenu, activeSubMenu, userData);

    // Desktop sidebar
    const desktopMount = document.getElementById('sidebar-mount');
    if (desktopMount) desktopMount.innerHTML = sidebarHTML;

    // Mobile sidebar
    const mobileMount = document.getElementById('mobile-sidebar-mount');
    if (mobileMount) mobileMount.innerHTML = sidebarHTML;

    // Mobile toggle
    const menuBtn  = document.getElementById('mobile-menu-btn');
    const overlay  = document.getElementById('mobile-overlay');
    const mobileSb = document.getElementById('mobile-sidebar-mount');

    if (menuBtn) {
        menuBtn.addEventListener('click', () => {
            mobileSb && mobileSb.classList.toggle('open');
            overlay  && overlay.classList.toggle('visible');
        });
    }
    if (overlay) {
        overlay.addEventListener('click', () => {
            mobileSb && mobileSb.classList.remove('open');
            overlay.classList.remove('visible');
        });
    }

    // Initialize Notifications
    initNotifications(userData);
}

// ── Access Enforcement ────────────────────────────────────────────

function enforcePageAccess(role, activeMenu) {
    if (!activeMenu) return true;

    const allowed = {
        'admin': ['pengajuan', 'riwayat', 'verifikasi', 'admin', 'manajemen-data', 'manajemen-user', 'log-activity'],
        'verifikator_berkas': ['pengajuan', 'riwayat', 'verifikasi'],
        'verifikator_lapangan': ['pengajuan', 'riwayat', 'verifikasi'],
        'notaris': ['pengajuan', 'riwayat'],
        'mandiri': ['pengajuan', 'riwayat']
    };

    // If role doesn't have the activeMenu, redirect them
    const roleAllowed = allowed[role] || allowed['mandiri'];
    
    if (!roleAllowed.includes(activeMenu)) {
        if (role === 'admin') window.location.replace('manajemen-user.html');
        else if (role === 'verifikator_berkas') window.location.replace('pengajuan-bphtb.html');
        else if (role === 'verifikator_lapangan') window.location.replace('pengajuan-bphtb.html');
        else window.location.replace('pengajuan-bphtb.html');
        return false;
    }
    return true;
}

// ── Toggle Menu (onclick) ─────────────────────────────────────────

function toggleSidebarMenu(menuId) {
    // Desktop & mobile: find all parents and submenus
    ['sidebar-mount', 'mobile-sidebar-mount'].forEach(mountId => {
        const mount = document.getElementById(mountId);
        if (!mount) return;

        mount.querySelectorAll('.sidebar-menu-parent').forEach(el => {
            const id = el.dataset.menuId;
            const submenu = mount.querySelector(`#submenu-${id}`);
            const chevron = el.querySelector('.sidebar-chevron');

            if (id === menuId) {
                el.classList.toggle('active');
                submenu && submenu.classList.toggle('expanded');
                chevron && chevron.classList.toggle('rotated');
            } else {
                el.classList.remove('active');
                submenu && submenu.classList.remove('expanded');
                chevron && chevron.classList.remove('rotated');
            }
        });
    });
}

// ──────────────── Notification System ────────────────

async function initNotifications(userData) {
    const topbar = document.querySelector('.topbar');
    if (!topbar) return;

    // Create Notification UI
    const notifHTML = `
      <div id="notif-wrapper" style="position:relative; margin-right: 0.5rem; display:flex; align-items:center;">
          <button id="notif-btn" style="background:transparent; border:none; cursor:pointer; position:relative; padding:0.5rem; color:#475569;">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width:22px; height:22px;">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
              </svg>
              <span id="notif-badge" style="display:none; position:absolute; top:4px; right:4px; background:#ef4444; color:#fff; font-size:0.65rem; font-weight:bold; border-radius:999px; width:16px; height:16px; align-items:center; justify-content:center;">0</span>
          </button>
          
          <div id="notif-dropdown" style="display:none; position:absolute; top:100%; right:0; background:#fff; border:1px solid #e2e8f0; border-radius:0.5rem; box-shadow:0 10px 15px -3px rgba(0,0,0,0.1); width:300px; z-index:1000; padding:1rem; margin-top:0.5rem;">
              <h4 style="font-size:0.8rem; font-weight:bold; border-bottom:1px solid #e2e8f0; padding-bottom:0.5rem; margin-bottom:0.5rem; color:#1e293b;">Pemberitahuan</h4>
              <div id="notif-content" style="font-size:0.75rem; color:#475569; display:flex; flex-direction:column; gap:0.5rem;">
                  <span style="color:#94a3b8">Memuat data...</span>
              </div>
          </div>
      </div>
    `;

    const logoutBtn = topbar.querySelector('.topbar-logout-btn');
    if (logoutBtn) {
        logoutBtn.insertAdjacentHTML('beforebegin', notifHTML);
    }

    const notifBtn = document.getElementById('notif-btn');
    const notifDropdown = document.getElementById('notif-dropdown');
    const notifBadge = document.getElementById('notif-badge');
    const notifContent = document.getElementById('notif-content');

    // Toggle logic
    notifBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isVisible = notifDropdown.style.display === 'block';
        notifDropdown.style.display = isVisible ? 'none' : 'block';
    });
    document.addEventListener('click', (e) => {
        if (!document.getElementById('notif-wrapper')?.contains(e.target)) {
            if (notifDropdown) notifDropdown.style.display = 'none';
        }
    });

    // Fetch data based on role
    try {
        let count = 0;
        let messages = [];

        if (userData.role === 'admin' || userData.role === 'verifikator_berkas') {
            const { count: c, error } = await db.from('pengajuan_bphtb')
                .select('*', { count: 'exact', head: true })
                .eq('alur_berkas', 'Menunggu Verifikasi');
            
            if (c > 0) {
                count += c;
                messages.push(`Ada <b>${c} berkas pengajuan baru</b> yang menunggu verifikasi tahap pertama.`);
            }
        } 
        
        if (userData.role === 'admin' || userData.role === 'verifikator_lapangan') {
            const { count: c1 } = await db.from('pengajuan_bphtb')
                .select('*', { count: 'exact', head: true })
                .eq('alur_berkas', 'Proses Lapangan')
                .eq('verifikasi_lapangan_status', 'menunggu');

            if (c1 > 0) {
                count += c1;
                messages.push(`Ada <b>${c1} berkas pengajuan</b> yang menunggu Verifikasi Lapangan.`);
            }

            const { count: c2 } = await db.from('pengajuan_bphtb')
                .select('*', { count: 'exact', head: true })
                .eq('status_persetujuan_wp', 'dikomentari_wp');
            if (c2 > 0) {
                count += c2;
                messages.push(`Ada <b>${c2} tanggapan/komentar baru</b> dari WP terkait ketetapan pajak.`);
            }
        }

        if (userData.role === 'notaris' || userData.role === 'mandiri') {
            const userAuthId = userData.auth_id || userData.id;

            const { count: c1 } = await db.from('pengajuan_bphtb')
                .select('*', { count: 'exact', head: true })
                .eq('submitted_by_id', userAuthId)
                .eq('alur_berkas', 'Berkas ditolak');
            if (c1 > 0) {
                count += c1;
                messages.push(`Ada <b>${c1} berkas pengajuan</b> Anda yang ditolak dan perlu diperbaiki.`);
            }

            const { count: c2 } = await db.from('pengajuan_bphtb')
                .select('*', { count: 'exact', head: true })
                .eq('submitted_by_id', userAuthId)
                .eq('status_persetujuan_wp', 'menunggu_wp');
            if (c2 > 0) {
                count += c2;
                messages.push(`Ada <b>${c2} berkas</b> yang membutuhkan persetujuan Anda atas nilai pajak.`);
            }

            const { count: c3 } = await db.from('pengajuan_bphtb')
                .select('*', { count: 'exact', head: true })
                .eq('submitted_by_id', userAuthId)
                .eq('stpd_status', 'Menunggu Pembayaran');
            if (c3 > 0) {
                count += c3;
                messages.push(`Ada <b>${c3} STPD</b> yang menunggu pembayaran Anda.`);
            }
        }

        if (count > 0) {
            notifBadge.style.display = 'flex';
            notifBadge.textContent = count > 9 ? '9+' : count;
            notifContent.innerHTML = messages.map(m => `<div style="padding:0.5rem; background:#f0fdf4; border:1px solid #bbf7d0; border-radius:0.25rem;">${m}</div>`).join('');
        } else {
            notifBadge.style.display = 'none';
            notifContent.innerHTML = `<div style="padding:0.5rem; text-align:center;">Belum ada pemberitahuan baru.</div>`;
        }
    } catch (e) {
        console.error('Error loading notifications:', e);
        notifContent.innerHTML = `<span style="color:#ef4444">Gagal memuat notifikasi.</span>`;
    }
}
