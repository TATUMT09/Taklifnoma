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
  });

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
      { id: 'tugilgan_kun', name: "Tug'ilgan kun", image: '/assets/images/categories/tugilgan_kun.png', desc: "Yaqinlaringizning tug'ilgan kunini chiroyli raqamli tabrik bilan nishonlang." },
      { id: 'tabrik', name: 'Tabrik', image: '/assets/images/categories/tabrik.webp', desc: 'Har qanday quvonchli voqea uchun chiroyli tabriknoma yarating.' },
      { id: 'haj_safari', name: 'Haj safari', image: '/assets/images/categories/haj_safari.jpg', desc: "Haj safariga yo'l olayotgan yaqiningiz uchun xayrlashuv va duo sahifasi." },
      { id: 'sevgi_izhor', name: 'Sevgi izhori', theme: 'vau', image: '/assets/images/categories/sevgi_izhor.svg', desc: "Yangi: Premium ✨ — kinematik, animatsiyali sevgi izhori sahifasi." },
      { id: 'nahor_oshi', name: 'Nahor oshi', image: '/assets/images/categories/nahor_oshi.png', desc: "Ertalabki osh dasturxoningiz uchun alohida, o'ziga xos taklifnoma." },
      { id: 'sevgimga_hat', name: 'Sevgimga hat', image: '/assets/images/categories/sevgi_izhor.svg', desc: "Sevgan insoningizga chin yurakdan hat bitib, uni chiroyli raqamli sahifada taqdim eting." }
    ];

    const cards = [];
    LAYOUTS.forEach((layout) => {
      THEMES.forEach((theme) => {
        cards.push(`
          <div class="tpl-card" data-layout="${layout.id}" data-category="toy">
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
        <div class="tpl-card" data-category="${cat.id}">
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
      const container = document.getElementById(containerId);
      if (!container) return;
      const btns = container.querySelectorAll('.tpl-filter-btn');
      btns.forEach((btn) => {
        btn.addEventListener('click', () => {
          btns.forEach((b) => b.classList.remove('active'));
          btn.classList.add('active');
          applyFilters();
        });
      });
    }

    function applyFilters() {
      const styleBtn = document.querySelector('#style-filter .tpl-filter-btn.active');
      const categoryBtn = document.querySelector('#category-filter .tpl-filter-btn.active');
      const styleFilter = styleBtn ? styleBtn.getAttribute('data-filter') : 'all';
      const categoryFilter = categoryBtn ? categoryBtn.getAttribute('data-category') : 'all';
      grid.querySelectorAll('.tpl-card').forEach((card) => {
        const layout = card.getAttribute('data-layout');
        const category = card.getAttribute('data-category');
        const styleOk = !layout || styleFilter === 'all' || layout === styleFilter;
        const categoryOk = categoryFilter === 'all' || category === categoryFilter;
        card.style.display = (styleOk && categoryOk) ? '' : 'none';
      });
    }

    wireFilterGroup('style-filter');
    wireFilterGroup('category-filter');
  }

  async function renderAuthNav() {
    const slot = document.querySelector('[data-nav-auth]');
    if (!slot) return;
    try {
      const { user } = await api.me();
      slot.innerHTML = `
        ${user.isAdmin ? '<a href="/admin" class="btn btn-outline btn-sm">Admin</a>' : ''}
        <a href="/dashboard" class="nav-name">${escapeHtml(user.name)}</a>
        <button class="btn btn-outline btn-sm" data-logout>Chiqish</button>
      `;
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
