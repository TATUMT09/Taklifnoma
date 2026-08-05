(function () {
  const stored = localStorage.getItem('tn_theme');
  if (stored) document.documentElement.setAttribute('data-theme', stored);

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    const toggle = document.querySelector('[data-theme-toggle]');
    if (toggle) {
      toggle.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('tn_theme', next);
      });
    }
    renderAuthNav();
    renderTemplateGallery();
    renderGallery();
    wireDropdown('notif-btn', 'notif-dropdown');
    initScrollReveal();
    initButtonRipple();
  });

  function galleryItemHtml(p) {
    return `
      <div class="gallery-item">
        <img src="${p.url}" alt="${escapeHtml(p.caption || '')}" loading="lazy" />
        <a class="gallery-item-dl" href="${p.url}" download aria-label="Yuklab olish" title="Yuklab olish">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M7 10l5 5 5-5M5 21h14"/></svg>
        </a>
      </div>`;
  }

  async function renderGallery() {
    const GALLERY_CATEGORIES = ['toy', 'juftlik', 'oila'];
    const grids = {};
    GALLERY_CATEGORIES.forEach((cat) => { grids[cat] = document.getElementById(`gallery-grid-${cat}`); });
    if (!grids.toy) return;
    try {
      const { photos } = await api.getGallery();
      GALLERY_CATEGORIES.forEach((cat) => {
        const catPhotos = photos.filter((p) => (p.category || 'toy') === cat);
        grids[cat].innerHTML = catPhotos.length
          ? catPhotos.map(galleryItemHtml).join('')
          : `<p class="gallery-empty">Hozircha rasm qo'shilmagan</p>`;
      });
      initScrollReveal();
    } catch (e) {
      grids.toy.innerHTML = `<p class="gallery-empty">${escapeHtml(e.message)}</p>`;
    }
  }

  function wireDropdown(btnId, dropdownId) {
    const btn = document.getElementById(btnId);
    const dropdown = document.getElementById(dropdownId);
    if (!btn || !dropdown) return;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      document.querySelectorAll('.nav-dropdown.open').forEach((d) => { if (d !== dropdown) d.classList.remove('open'); });
      dropdown.classList.toggle('open');
    });
    document.addEventListener('click', (e) => {
      if (!dropdown.contains(e.target) && e.target !== btn) dropdown.classList.remove('open');
    });
  }

  function initButtonRipple() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.btn-primary');
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const ripple = document.createElement('span');
      ripple.className = 'btn-ripple';
      ripple.style.width = ripple.style.height = size + 'px';
      ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
      ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
      btn.appendChild(ripple);
      setTimeout(() => ripple.remove(), 650);
    });
  }

  function initScrollReveal() {
    const els = document.querySelectorAll('.landing-section, .tpl-card, .feature-card, .gallery-item');
    if (!els.length) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      els.forEach((el) => el.classList.add('reveal-visible'));
      return;
    }
    els.forEach((el) => el.classList.add('reveal'));
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('reveal-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    els.forEach((el) => io.observe(el));
  }

  function renderTemplateGallery() {
    const grid = document.getElementById('template-grid');
    if (!grid) return;

    const LAYOUTS = [
      { id: 'nafis', name: 'Nafis', desc: "Zarf ochiladi, karta yonboshiga chiqib o'rnashadi — tantanali va interaktiv tajriba." },
      { id: 'klassik', name: 'Klassik', desc: "Oltin ramkali, sokin krem-oq taklifnoma kartasi — an'anaviy va nafis." },
      { id: 'zamonaviy', name: 'Zamonaviy', desc: "Qalin shrift va fon rasmli, chap tomonga tekislangan minimalist ko'rinish." }
    ];
    const THEMES = [
      { id: 'zumrad', name: 'Zumrad', ink: '#142720', paper: '#f7edd7', gold: '#c9a24a', wine: '#8a2c3b' },
      { id: 'lavanda', name: 'Lavanda', ink: '#241a35', paper: '#f5edf5', gold: '#b98a52', wine: '#6b2450' },
      { id: 'shafaq', name: 'Shafaq', ink: '#2a1418', paper: '#faf0e6', gold: '#c98a4a', wine: '#a13347' }
    ];

    function mock(layoutId, theme) {
      if (layoutId === 'klassik') {
        return `
          <div class="tpl-mock tpl-mock-klassik" style="--mp:${theme.paper};--mg:${theme.gold};--mw:${theme.wine}">
            <span class="tmk-corner tl"></span><span class="tmk-corner br"></span>
            <span class="tm-eyebrow" style="color:var(--mw)">Taklifnoma</span>
            <span class="tm-name" style="color:var(--mw)">Aziz <i>va</i> Malika</span>
          </div>`;
      }
      if (layoutId === 'zamonaviy') {
        return `
          <div class="tpl-mock tpl-mock-zamonaviy" style="--mi:${theme.ink};--mg:${theme.gold}">
            <span class="tmz-tag">Taklifnoma</span>
            <span class="tmz-name">Aziz<br>Malika</span>
          </div>`;
      }
      return `
        <div class="tpl-mock tpl-mock-nafis" style="--mi:${theme.ink};--mg:${theme.gold}">
          <span class="tm-eyebrow">Taklifnoma</span>
          <span class="tm-name">Aziz va Malika</span>
        </div>`;
    }

    const OTHER_CATEGORIES = [
      { id: 'toy', name: "To'y", badge: "Tavsiya etilgan", image: '/assets/images/categories/toy_featured.svg', desc: "Marmar va oltin bezaklar bilan bezatilgan, tantanali to'y taklifnomasi." },
      { id: 'tugilgan_kun', name: "Tug'ilgan kun", image: '/assets/images/categories/tugilgan_kun.svg', desc: "Yaqinlaringizning tug'ilgan kunini chiroyli raqamli tabrik bilan nishonlang." },
      { id: 'tabrik', name: 'Tabrik', image: '/assets/images/categories/tabrik.svg', desc: 'Har qanday quvonchli voqea uchun chiroyli tabriknoma yarating.' },
      { id: 'haj_safari', name: 'Haj safari', image: '/assets/images/categories/haj_safari.svg', desc: "Haj safariga yo'l olayotgan yaqiningiz uchun xayrlashuv va duo sahifasi." },
      { id: 'sevgi_izhor', name: 'Sevgi izhori', theme: 'vau', badge: 'Premium', image: '/assets/images/categories/sevgi_izhor.svg', desc: "Yangi: Premium ✨ — kinematik, animatsiyali sevgi izhori sahifasi." },
      { id: 'nahor_oshi', name: 'Nahor oshi', image: '/assets/images/categories/nahor_oshi.png', desc: "Ertalabki osh dasturxoningiz uchun alohida, o'ziga xos taklifnoma." },
      { id: 'sevgimga_hat', name: 'Sevgimga hat', image: '/assets/images/categories/sevgi_izhor.svg', desc: "Sevgan insoningizga chin yurakdan hat bitib, uni chiroyli raqamli sahifada taqdim eting." }
    ];

    const cards = [];
    LAYOUTS.forEach((layout) => {
      THEMES.forEach((theme) => {
        cards.push(`
          <div class="tpl-card" data-layout="${layout.id}" data-category="toy" data-name="to'y ${layout.name.toLowerCase()} ${theme.name.toLowerCase()}">
            <a class="tpl-preview" href="/preview?layout=${layout.id}&theme=${theme.id}&event_type=toy" target="_blank" rel="noopener" aria-label="Namunani ko'rish" style="display:flex;">${mock(layout.id, theme)}</a>
            <div class="tpl-body">
              <span class="tpl-name">${layout.name} <small>· ${theme.name}</small></span>
              <p class="tpl-desc">${layout.desc}</p>
              <div style="display:flex;gap:0.5rem;">
                <a href="/preview?layout=${layout.id}&theme=${theme.id}&event_type=toy" target="_blank" rel="noopener" class="btn btn-outline btn-sm">Ko'rish</a>
                <a href="/create?layout=${layout.id}&theme=${theme.id}&event_type=toy" class="btn btn-primary btn-sm">Boshlash</a>
              </div>
            </div>
          </div>`);
      });
    });
    OTHER_CATEGORIES.forEach((cat) => {
      const catTheme = cat.theme || getThemesForCategory(cat.id)[0].id;
      const catLayout = getDefaultLayoutForCategory(cat.id);
      const catParams = `event_type=${cat.id}&theme=${catTheme}&layout=${catLayout}`;
      cards.push(`
        <div class="tpl-card" data-category="${cat.id}" data-name="${cat.name.toLowerCase()}">
          ${cat.badge ? `<span class="tpl-badge">${cat.badge}</span>` : ''}
          <a class="tpl-preview" href="/preview?${catParams}" target="_blank" rel="noopener" aria-label="Namunani ko'rish" style="background-image:url('${cat.image}');background-size:cover;background-position:center;">
            <span class="tpl-cat-badge">${cat.name}</span>
          </a>
          <div class="tpl-body">
            <span class="tpl-name">${cat.name}</span>
            <p class="tpl-desc">${cat.desc}</p>
            <div style="display:flex;gap:0.5rem;">
              <a href="/preview?${catParams}" target="_blank" rel="noopener" class="btn btn-outline btn-sm">Ko'rish</a>
              <a href="/create?${catParams}" class="btn btn-primary btn-sm">Boshlash</a>
            </div>
          </div>
        </div>`);
    });
    grid.innerHTML = cards.join('');

    function wireFilterGroup(containerId) {
      const select = document.getElementById(containerId);
      if (!select) return;
      select.addEventListener('change', applyFilters);
    }

    function applyFilters() {
      const styleSelect = document.getElementById('style-filter');
      const categorySelect = document.getElementById('category-filter');
      const styleFilter = styleSelect ? styleSelect.value : 'all';
      const categoryFilter = categorySelect ? categorySelect.value : 'all';
      const query = (document.getElementById('hero-search-input') || {}).value;
      const q = (query || '').trim().toLowerCase();
      grid.querySelectorAll('.tpl-card').forEach((card) => {
        const layout = card.getAttribute('data-layout');
        const category = card.getAttribute('data-category');
        const name = card.getAttribute('data-name') || '';
        const styleOk = !layout || styleFilter === 'all' || layout === styleFilter;
        const categoryOk = categoryFilter === 'all' || category === categoryFilter;
        const queryOk = !q || name.includes(q);
        card.style.display = (styleOk && categoryOk && queryOk) ? '' : 'none';
      });
    }

    wireFilterGroup('style-filter');
    wireFilterGroup('category-filter');

    const heroSearchForm = document.getElementById('hero-search-form');
    if (heroSearchForm) {
      heroSearchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        applyFilters();
        const target = document.getElementById('templates');
        if (target) target.scrollIntoView({ behavior: 'smooth' });
      });
    }
  }

  async function renderAuthNav() {
    const slot = document.querySelector('[data-nav-auth]');
    if (!slot) return;
    try {
      const { user } = await api.me();
      const initial = (user.name[0] || '?').toUpperCase();
      slot.innerHTML = `
        <div class="nav-dropdown-wrap">
          <button class="nav-avatar-btn" id="user-avatar-btn" aria-label="Profil menyusi">${escapeHtml(initial)}</button>
          <div class="nav-dropdown" id="user-dropdown">
            <a href="/dashboard">Boshqaruv paneli</a>
            ${user.isAdmin ? '<a href="/admin">Admin</a>' : ''}
            <button type="button" data-logout>Chiqish</button>
          </div>
        </div>
      `;
      wireDropdown('user-avatar-btn', 'user-dropdown');
      const logoutBtn = slot.querySelector('[data-logout]');
      logoutBtn.addEventListener('click', async () => {
        await api.logout();
        window.location.href = '/';
      });
    } catch (e) {
      slot.innerHTML = `
        <a href="/login" class="btn btn-outline btn-sm">Kirish</a>
        <a href="/register" class="btn btn-primary btn-sm">Boshlash</a>
      `;
    }
  }

  window.escapeHtml = function (str) {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
  };

  window.showToast = function (msg, isErr) {
    let toast = document.querySelector('.toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'toast';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.toggle('err', !!isErr);
    toast.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => toast.classList.remove('show'), 2800);
  };

  window.resumePendingInvitation = async function () {
    const raw = localStorage.getItem('tn_pending_invitation');
    if (!raw) return null;
    localStorage.removeItem('tn_pending_invitation');
    try {
      const payload = JSON.parse(raw);
      const { invitation } = await api.createInvitation(payload);
      return invitation.slug;
    } catch (e) {
      return null;
    }
  };

  window.requireAuthOrRedirect = async function () {
    try {
      const { user } = await api.me();
      return user;
    } catch (e) {
      window.location.href = '/login';
      return null;
    }
  };

  window.requireAdminOrRedirect = async function () {
    try {
      const { user } = await api.me();
      if (!user.isAdmin) { window.location.href = '/dashboard'; return null; }
      return user;
    } catch (e) {
      window.location.href = '/login';
      return null;
    }
  };
})();
