/**
 * sidebar.js — Build sidebar, auth management, mobile drawer with Roles
 */

// ── Auth ──────────────────────────────────────────────────────────

function checkAuth() {
    const userStr = sessionStorage.getItem('ebphtb_user_data');
    if (!userStr) {
        // Clear both new and legacy session data to prevent infinite redirect loops
        // in case the browser executes a cached version of index.html
        sessionStorage.removeItem('ebphtb_user_data');
        sessionStorage.removeItem('ebphtb_user');
        window.location.href = 'index.html';
        return null;
    }
    return JSON.parse(userStr);
}

function getUser() {
    const userStr = sessionStorage.getItem('ebphtb_user_data');
    if (userStr) return JSON.parse(userStr);
    
    // Fallback for older code that might just use ebphtb_user
    const fallback = sessionStorage.getItem('ebphtb_user');
    return fallback ? { nama: fallback, role: 'Pengguna' } : { nama: 'User', role: 'Pengguna' };
}

function logout() {
    sessionStorage.removeItem('ebphtb_user_data');
    sessionStorage.removeItem('ebphtb_user');
    window.location.href = 'index.html';
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
        <button class="sidebar-logout-btn" onclick="logout()" title="Keluar">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
          </svg>
        </button>
      </div>`;

    return html;
}

// ── Main Init ─────────────────────────────────────────────────────

function initSidebar() {
    const userData = checkAuth();
    if (!userData) return;

    const activeMenu    = document.body.dataset.menu    || '';
    const activeSubMenu = document.body.dataset.submenu || '';

    // Auth Enforcement: If user doesn't have access to this page, boot them to their default
    enforcePageAccess(userData.role, activeMenu);

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
}

// ── Access Enforcement ────────────────────────────────────────────

function enforcePageAccess(role, activeMenu) {
    if (!activeMenu) return;

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
        if (role === 'admin') window.location.href = 'manajemen-user.html';
        else if (role === 'verifikator_berkas') window.location.href = 'pengajuan-bphtb.html';
        else if (role === 'verifikator_lapangan') window.location.href = 'pengajuan-bphtb.html';
        else window.location.href = 'pengajuan-bphtb.html';
    }
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
