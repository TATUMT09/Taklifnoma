(function () {
  const app = document.getElementById('app');
  const slug = window.location.pathname.split('/').filter(Boolean).pop();
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const LAYOUTS = ['nafis', 'klassik', 'zamonaviy', 'dasturxon', 'maktub', 'premium', 'shohona', 'nikoh', 'marosim'];
  const isPreview = window.location.pathname.replace(/\/$/, '') === '/preview';

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
  }

  const PREMIUM_DEFAULT_LETTER = "Har kuni sen bilan uyg'onishni orzu qilaman. Sen mening kulgimsan, tinchligimsan, va yuragimning eng go'zal urishisan. Seni juda-juda yaxshi ko'raman.";

  const PREMIUM_STYLE_DEFAULTS = {
    bgFrom: '#0F172A', bgVia: '#1E293B', bgTo: '#312E81',
    btnFrom: '#FF4D6D', btnTo: '#FF758F', accent: '#FF3B81',
    hearts: true, sparkles: true, confetti: true
  };

  function parsePremiumStyle(raw) {
    if (!raw) return { ...PREMIUM_STYLE_DEFAULTS };
    try {
      return { ...PREMIUM_STYLE_DEFAULTS, ...JSON.parse(raw) };
    } catch (e) {
      return { ...PREMIUM_STYLE_DEFAULTS };
    }
  }

  const SAMPLE_PHOTO_BY_CATEGORY = {
    toy: '/assets/images/hero/hero-1.jpg',
    qiz_bazmi: '/assets/images/hero/hero-1.jpg',
    tugilgan_kun: '/assets/images/categories/tugilgan_kun.png',
    tabrik: '/assets/images/categories/tabrik.webp',
    haj_safari: '/assets/images/categories/haj_safari.jpg',
    sevgi_izhor: '/assets/images/categories/sevgi_izhor.svg',
    nahor_oshi: '/assets/images/categories/nahor_oshi.png',
    sevgimga_hat: '/assets/images/categories/sevgi_izhor.svg'
  };

  function buildSampleInvitation(params) {
    const eventType = EVENT_CATEGORIES.some((c) => c.id === params.get('event_type')) ? params.get('event_type') : 'toy';
    const theme = THEME_META.some((t) => t.id === params.get('theme')) ? params.get('theme') : 'zumrad';
    const layout = LAYOUTS.includes(params.get('layout')) ? params.get('layout') : 'nafis';
    const cat = getEventCategory(eventType);

    const sampleDate = new Date();
    sampleDate.setMonth(sampleDate.getMonth() + 2);
    sampleDate.setDate(14);
    const pad = (n) => String(n).padStart(2, '0');

    return {
      theme, layout, event_type: eventType,
      groom_name: 'Aziz',
      bride_name: cat.pair ? 'Malika' : '',
      family_name: 'Karimovlar oilasi',
      event_date: `${sampleDate.getFullYear()}-${pad(sampleDate.getMonth() + 1)}-${pad(sampleDate.getDate())}`,
      event_time: '17:00',
      venue_name: "Bog'i Zebo to'y saroyi",
      address: "Toshkent shahri, Yunusobod tumani, Bog'ishamol ko'chasi, 12-uy",
      map_link: '',
      photo_url: SAMPLE_PHOTO_BY_CATEGORY[eventType] || '/assets/images/hero/hero-1.jpg',
      song_url: '',
      custom_message: '',
      views: 128
    };
  }

  if (isPreview) {
    render(buildSampleInvitation(new URLSearchParams(window.location.search)));
  } else {
    api.getPublicInvitation(slug)
      .then((data) => {
        if (data.expired) return renderExpired();
        if (data.locked) return renderLocked(slug);
        render(data.invitation);
      })
      .catch(() => {
        app.innerHTML = `
          <div class="skeleton-loading" style="flex-direction:column;gap:1rem;">
            <p class="display" style="font-size:1.4rem;">Taklifnoma topilmadi</p>
            <a href="/" class="btn-ghost">Bosh sahifaga qaytish</a>
          </div>`;
      });
  }

  function renderExpired() {
    document.body.setAttribute('data-theme', 'vau');
    document.body.setAttribute('data-layout', 'premium');
    app.innerHTML = `
      <div class="premium-gate-shell">
        <div class="premium-gate-card reveal visible">
          <p class="premium-gate-icon">⏳</p>
          <h1 class="premium-gate-title">Bu havolaning amal qilish muddati tugagan</h1>
          <p class="premium-gate-sub">Havola egasidan yangisini so'rang.</p>
          <a href="/" class="btn-ghost">Bosh sahifaga qaytish</a>
        </div>
      </div>`;
  }

  function renderLocked(slugValue) {
    document.body.setAttribute('data-theme', 'vau');
    document.body.setAttribute('data-layout', 'premium');
    app.innerHTML = `
      <div class="premium-gate-shell">
        <div class="premium-gate-card reveal visible">
          <p class="premium-gate-icon">🔒</p>
          <h1 class="premium-gate-title">Bu sahifa parol bilan himoyalangan</h1>
          <p class="premium-gate-sub">Davom etish uchun parolni kiriting</p>
          <form id="unlock-form" class="premium-unlock-form">
            <input type="password" id="unlock-password" placeholder="Parol" autocomplete="off" required />
            <button type="submit" class="btn-gold">Ochish</button>
          </form>
          <p class="premium-unlock-error" id="unlock-error"></p>
        </div>
      </div>`;

    document.getElementById('unlock-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const errEl = document.getElementById('unlock-error');
      const password = document.getElementById('unlock-password').value;
      errEl.textContent = '';
      try {
        const data = await api.unlockInvitation(slugValue, password);
        if (data.expired) return renderExpired();
        render(data.invitation);
      } catch (err) {
        errEl.textContent = err.message;
      }
    });
  }

  function render(inv) {
    document.body.setAttribute('data-theme', inv.theme || 'zumrad');
    const layout = LAYOUTS.includes(inv.layout) ? inv.layout : 'nafis';
    document.body.setAttribute('data-layout', layout);

    const groom = inv.groom_name || '';
    const bride = inv.bride_name || '';
    document.title = bride ? `${groom} & ${bride} — Taklifnoma` : `${groom} — Taklifnoma`;

    const calendar = buildCalendarGrid(inv.event_date);
    const dateLabel = formatUzDateLong(inv.event_date);
    const cat = getEventCategory(inv.event_type);
    const isCouple = !!bride && cat.pair;
    const headline = (cat.headlineByTheme && cat.headlineByTheme[inv.theme]) || cat.headline;
    const tagline = (cat.taglineByTheme && cat.taglineByTheme[inv.theme])
      || (!isCouple && cat.taglineSolo)
      || cat.tagline;
    const premiumStyle = parsePremiumStyle(inv.premium_style);
    if (layout === 'premium') {
      document.body.style.setProperty('--pg-bg-from', premiumStyle.bgFrom);
      document.body.style.setProperty('--pg-bg-via', premiumStyle.bgVia);
      document.body.style.setProperty('--pg-bg-to', premiumStyle.bgTo);
      document.body.style.setProperty('--pg-btn-from', premiumStyle.btnFrom);
      document.body.style.setProperty('--pg-btn-to', premiumStyle.btnTo);
      document.body.style.setProperty('--pg-accent', premiumStyle.accent);
    }
    const ctx = { inv, groom, bride, headline, tagline, isCouple, calendar, dateLabel, cat, premiumStyle };

    const coverHtml = layout === 'klassik' ? coverKlassik(ctx)
      : layout === 'zamonaviy' ? coverZamonaviy(ctx)
      : layout === 'dasturxon' ? coverDasturxon(ctx)
      : layout === 'maktub' ? coverMaktub(ctx)
      : layout === 'premium' ? coverPremium(ctx)
      : (layout === 'shohona' || layout === 'nikoh') ? coverShohona(ctx)
      : layout === 'marosim' ? coverMarosim(ctx)
      : coverNafis(ctx);
    const sectionsHtml = layout === 'dasturxon' ? dasturxonSectionsHtml(ctx)
      : layout === 'maktub' ? maktubSectionsHtml(ctx)
      : layout === 'premium' ? premiumSectionsHtml(ctx)
      : (layout === 'shohona' || layout === 'nikoh') ? shohonaSectionsHtml(ctx)
      : sharedSectionsHtml(ctx);

    const noDotnavLayouts = ['dasturxon', 'maktub', 'premium', 'shohona', 'nikoh'];
    app.innerHTML = `
      ${noDotnavLayouts.includes(layout) ? '' : dotnavHtml(inv)}

      <main>
        ${coverHtml}
        ${sectionsHtml}
      </main>

      <div class="toast" id="toast"></div>

      ${audioHtml(inv)}
    `;

    wireInteractions(inv, layout);
  }

  function dotnavHtml(inv) {
    return `
      <nav class="dotnav" aria-label="Bo'limlar bo'yicha navigatsiya">
        <button data-target="cover" aria-label="Muqova"></button>
        <button data-target="salom" aria-label="Salom"></button>
        <button data-target="ismlar" aria-label="Ismlar"></button>
        ${inv.photo_url ? '<button data-target="surat" aria-label="Surat"></button>' : ''}
        ${inv.event_date ? '<button data-target="sana" aria-label="Sana"></button><button data-target="sanoq" aria-label="Sanoq"></button>' : ''}
        ${inv.venue_name || inv.address ? '<button data-target="manzil" aria-label="Manzil"></button>' : ''}
        <button data-target="tilak" aria-label="Tilak"></button>
      </nav>`;
  }

  function audioHtml(inv) {
    if (!inv.song_url) return '';
    return `
      <audio id="bg-audio" src="${escapeHtml(inv.song_url)}" loop preload="auto"></audio>
      <button type="button" class="music-toggle" id="music-toggle" aria-label="Musiqani yoqish">
        <span class="music-bars" aria-hidden="true"><span></span><span></span><span></span></span>
      </button>`;
  }

  // ---------- Cover variants ----------

  function splitVenueName(venue) {
    if (!venue) return { line1: "Bog'i Zebo", line2: "to'y saroyi" };
    if (venue.includes(',')) {
      const idx = venue.indexOf(',');
      return { line1: venue.slice(0, idx).trim(), line2: venue.slice(idx + 1).trim() };
    }
    const words = venue.trim().split(/\s+/);
    if (words.length >= 3) {
      const mid = Math.ceil(words.length / 2);
      return { line1: words.slice(0, mid).join(' '), line2: words.slice(mid).join(' ') };
    }
    return { line1: venue, line2: '' };
  }

  function coverMarosim(ctx) {
    const { inv } = ctx;
    const venue = splitVenueName(inv.venue_name);
    const addressLines = (inv.address || 'Toshkent shahri, Yunusobod tumani, Bogʻishamol koʻchasi, 12-uy')
      .split(',').map((s) => s.trim()).filter(Boolean).slice(0, 3);
    return `
        <section class="marosim-outer" id="cover">
          <div class="marosim-card">
            <div class="marosim-inner-border"></div>
            <img class="marosim-corner tl" src="/assets/images/deco/marosim-corner.svg" alt="" aria-hidden="true" />
            <img class="marosim-corner tr" src="/assets/images/deco/marosim-corner.svg" alt="" aria-hidden="true" />
            <img class="marosim-corner bl" src="/assets/images/deco/marosim-corner.svg" alt="" aria-hidden="true" />
            <img class="marosim-corner br" src="/assets/images/deco/marosim-corner.svg" alt="" aria-hidden="true" />

            <p class="marosim-top-title">Tantanali marosim</p>
            <div class="marosim-top-ornament" aria-hidden="true">— ◇ —</div>

            <div class="marosim-side-panel left" aria-hidden="true"></div>
            <div class="marosim-side-panel right" aria-hidden="true"></div>

            <img class="marosim-floral left" src="/assets/images/deco/marosim-floral-left.svg" alt="" aria-hidden="true" />
            <img class="marosim-floral right" src="/assets/images/deco/marosim-floral-right.svg" alt="" aria-hidden="true" />

            <div class="marosim-arch-wrap">
              <svg width="0" height="0" style="position:absolute;">
                <defs>
                  <clipPath id="marosimArchClip" clipPathUnits="objectBoundingBox">
                    <path d="M0 1 L0 0.42 C0 0.15 0.22 0 0.5 0 C0.78 0 1 0.15 1 0.42 L1 1 Z"/>
                  </clipPath>
                </defs>
              </svg>
              <div class="marosim-arch-fill"></div>
              <svg class="marosim-arch-outline" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                <path d="M2 100 L2 40 C2 14 24 2 50 2 C76 2 98 14 98 40 L98 100" stroke="#CFA34A" stroke-width="2" fill="none" vector-effect="non-scaling-stroke"/>
                <path d="M8 100 L8 41 C8 18 27 8 50 8 C73 8 92 18 92 41 L92 100" stroke="#CFA34A" stroke-width="1" fill="none" opacity="0.7" vector-effect="non-scaling-stroke"/>
              </svg>
              <div class="marosim-arch-content">
                <div class="marosim-ornament-top" aria-hidden="true">✦</div>
                <h2 class="marosim-venue-name">${escapeHtml(venue.line1)}</h2>
                ${venue.line2 ? `<p class="marosim-venue-sub">${escapeHtml(venue.line2)}</p>` : ''}
                <div class="marosim-divider-mid" aria-hidden="true"><span></span><i>◇</i><span></span></div>
                <svg class="marosim-pin" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 2C7.6 2 4 5.6 4 10c0 6 8 12 8 12s8-6 8-12c0-4.4-3.6-8-8-8z" fill="#7D2935"/>
                  <circle cx="12" cy="10" r="3" fill="#F8F0DF"/>
                </svg>
                <p class="marosim-address">${addressLines.map((l) => `<span>${escapeHtml(l)}</span>`).join('')}</p>
              </div>
            </div>

            <div class="marosim-bottom-divider" aria-hidden="true"><span></span><i>◆</i><span></span></div>
          </div>
        </section>`;
  }

  function coverNafis(ctx) {
    const { groom, bride, headline, tagline, isCouple, cat } = ctx;
    return `
        <section class="section cover" id="cover">
          <div class="frame-strip"></div>
          <div class="cover-mid">
            <p class="eyebrow">${escapeHtml(headline)}</p>
            <div class="envelope-wrap">
              <button type="button" class="envelope" id="envelope-btn" aria-label="Taklifnomani ochish">
                <span class="envelope-shadow"></span>
                <span class="envelope-body">
                  <span class="envelope-flap"></span>
                  <span class="envelope-seal">
                    ${escapeHtml((groom[0] || '?').toUpperCase())}${isCouple ? `<span class="dot"></span>${escapeHtml((bride[0] || '?').toUpperCase())}` : ''}
                  </span>
                </span>
              </button>
              <span class="envelope-card">
                <span class="envelope-card-text">
                  <span class="envelope-card-invite">${escapeHtml(cat.inviteWord)}</span>
                  <span class="envelope-card-names">
                    <span class="ecn-name">${escapeHtml(groom)}</span>
                    ${isCouple ? `<span class="ecn-va">va</span><span class="ecn-name">${escapeHtml(bride)}</span>` : ''}
                  </span>
                </span>
              </span>
            </div>
            <p class="envelope-hint" id="envelope-hint">Ochish uchun bosing</p>
            <p class="cover-tagline" id="cover-tagline">${escapeHtml(tagline)}</p>
          </div>
          <div class="scroll-hint">
            <span>Pastga suring</span>
            <span class="chevron" aria-hidden="true"></span>
          </div>
        </section>`;
  }

  function coverKlassik(ctx) {
    const { inv, groom, bride, headline, tagline, isCouple, dateLabel, cat } = ctx;
    return `
        <section class="section cover cover-klassik" id="cover">
          <div class="klassik-frame" aria-hidden="true">
            <span class="kf-corner tl"></span><span class="kf-corner tr"></span>
            <span class="kf-corner bl"></span><span class="kf-corner br"></span>
          </div>
          <div class="cover-mid reveal">
            <p class="eyebrow">${escapeHtml(headline)}</p>
            <div class="amp-ornament"><span class="line"></span><span class="diamond"></span><span class="line"></span></div>
            <div class="names-wrap">
              <span class="name groom">${escapeHtml(groom)}</span>
              ${isCouple ? `
                <span class="klassik-va">va</span>
                <span class="name bride">${escapeHtml(bride)}</span>
              ` : ''}
            </div>
            <p class="tagline">${escapeHtml(tagline)}</p>
            <div class="amp-ornament"><span class="line"></span><span class="diamond"></span><span class="line"></span></div>
            ${inv.event_date ? `<p class="klassik-datebar">${escapeHtml(dateLabel)}</p>` : ''}
          </div>
          <div class="scroll-hint">
            <span>Pastga suring</span>
            <span class="chevron" aria-hidden="true"></span>
          </div>
        </section>`;
  }

  function coverZamonaviy(ctx) {
    const { inv, groom, bride, headline, isCouple, dateLabel } = ctx;
    return `
        <section class="section cover cover-zamonaviy" id="cover">
          ${inv.photo_url ? `
            <div class="zm-bgphoto" style="background-image:url('${escapeHtml(inv.photo_url)}')"></div>
            <div class="zm-bgscrim"></div>` : ''}
          <div class="cover-mid reveal">
            <p class="zm-tag">${escapeHtml(headline)}</p>
            <div class="zm-names">
              <span class="zm-name">${escapeHtml(groom)}</span>
              ${isCouple ? `<span class="zm-name accent">${escapeHtml(bride)}</span>` : ''}
            </div>
            ${(inv.event_date || inv.venue_name) ? `
            <div class="zm-meta">
              ${inv.event_date ? `<span>${escapeHtml(dateLabel.split(' · ')[0])}</span>` : ''}
              ${inv.event_date && inv.venue_name ? '<span class="zm-meta-sep"></span>' : ''}
              ${inv.venue_name ? `<span>${escapeHtml(inv.venue_name)}</span>` : ''}
            </div>` : ''}
          </div>
          <div class="scroll-hint">
            <span>Pastga suring</span>
            <span class="chevron" aria-hidden="true"></span>
          </div>
        </section>`;
  }

  function coverDasturxon(ctx) {
    const { inv, groom, bride, isCouple } = ctx;
    const names = isCouple ? `${groom} & ${bride}` : groom;
    const photoUrl = inv.photo_url || '/assets/images/categories/nahor_oshi.png';
    return `
        <section class="dasturxon-cover" id="cover">
          <img class="dasturxon-photo" src="${escapeHtml(photoUrl)}" alt="${escapeHtml(names)}" />
          <div class="dasturxon-greeting reveal">
            <h1>HURMATLI MEHMONLAR!</h1>
            <p>${escapeHtml(inv.custom_message) || `Ertalabki osh dasturxonimiz uchun sizlarni ${escapeHtml(names)} oilasining faxriy mehmoni bo'lishga taklif qilamiz.`}</p>
          </div>
          <div class="dasturxon-scroll-hint">Pastga suring</div>
        </section>`;
  }

  function coverMaktub(ctx) {
    const { groom, headline, tagline } = ctx;
    const initial = (groom[0] || '?').toUpperCase();
    return `
        <section class="maktub-cover" id="cover">
          <div class="maktub-mid">
            <p class="maktub-eyebrow">${escapeHtml(headline)}</p>
            <button type="button" class="wax-seal" id="envelope-btn" aria-label="Muhrni ochish">
              <span class="wax-seal-glyph">${escapeHtml(initial)}</span>
            </button>
            <p class="maktub-hint" id="envelope-hint">Muhrni bosib oching</p>
            <p class="maktub-tagline" id="cover-tagline">${escapeHtml(tagline)}</p>
          </div>
          <div class="scroll-hint">
            <span>Pastga suring</span>
            <span class="chevron" aria-hidden="true"></span>
          </div>
        </section>`;
  }

  function fireConfetti(colors) {
    const palette = colors || ['#c9a24a', '#e6c877', '#8a2c3b'];
    for (let i = 0; i < 26; i++) {
      const p = document.createElement('div');
      p.className = 'confetti-piece';
      p.style.left = Math.random() * 100 + 'vw';
      p.style.background = palette[i % palette.length];
      p.style.animationDuration = (2.4 + Math.random() * 1.6) + 's';
      p.style.animationDelay = (Math.random() * 0.6) + 's';
      document.body.appendChild(p);
      setTimeout(() => p.remove(), 4600);
    }
  }

  function playHeartbeat() {
    if (reduceMotion) return;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      const thump = (t, freq, dur) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(0.5, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        osc.connect(gain).connect(ctx.destination);
        osc.start(t);
        osc.stop(t + dur);
      };
      const now = ctx.currentTime;
      thump(now, 60, 0.15);
      thump(now + 0.22, 50, 0.18);
    } catch (e) { /* Web Audio unavailable, skip the heartbeat SFX */ }
  }

  function typewriter(el, text, speed) {
    if (reduceMotion || !el) { if (el) el.textContent = text; return; }
    let i = 0;
    el.textContent = '';
    const id = setInterval(() => {
      el.textContent += text[i];
      i++;
      if (i >= text.length) clearInterval(id);
    }, speed);
  }

  function sparkleSpans(n) {
    let out = '';
    for (let i = 0; i < n; i++) {
      const left = (Math.random() * 100).toFixed(1);
      const top = (Math.random() * 100).toFixed(1);
      const delay = (Math.random() * 5).toFixed(2);
      const dur = (2.4 + Math.random() * 2.6).toFixed(2);
      out += `<span class="p-sparkle" style="left:${left}%;top:${top}%;animation-delay:${delay}s;animation-duration:${dur}s;"></span>`;
    }
    return out;
  }

  function heartSpans(n) {
    let out = '';
    for (let i = 0; i < n; i++) {
      const left = (Math.random() * 100).toFixed(1);
      const delay = (Math.random() * 8).toFixed(2);
      const dur = (7 + Math.random() * 5).toFixed(2);
      const size = (0.9 + Math.random() * 1.3).toFixed(2);
      out += `<span class="p-heart" style="left:${left}%;animation-delay:${delay}s;animation-duration:${dur}s;font-size:${size}rem;">♥</span>`;
    }
    return out;
  }

  function coverPremium(ctx) {
    const { premiumStyle } = ctx;
    return `
        <section class="premium-gate" id="cover">
          ${premiumStyle.sparkles ? `<div class="premium-sparkles" aria-hidden="true">${sparkleSpans(14)}</div>` : ''}
          <div class="premium-mid">
            <p class="premium-gate-text">Senga aytadigan juda muhim gapim bor...</p>
            <button type="button" class="premium-enter-btn" id="envelope-btn">❤️ Davom etish</button>
            <p class="premium-gate-hint" id="envelope-hint">Bosing va davom eting</p>
          </div>
          <div class="scroll-hint">
            <span>Pastga suring</span>
            <span class="chevron" aria-hidden="true"></span>
          </div>
        </section>`;
  }

  // ---------- Shared scroll sections (used by Nafis/Klassik/Zamonaviy) ----------

  function sharedSectionsHtml(ctx) {
    const { inv, groom, bride, headline, tagline, isCouple, calendar, dateLabel, cat } = ctx;
    const defaultSalomMsg = "Bu maxsus go'zal kunni biz eng yaqin va sevimli odamlar bilan o'tkazishni xohlaymiz, bayram va ruhiy iliqlik muhitida. Biz ishonamizki, bu kun bizning birgalikdagi hayotimizning go'zal boshlanishi bo'ladi. Agar aynan siz bu baxtli lahzalarni biz bilan baham ko'rsangiz, bizga juda yoqimli bo'ladi.";
    return `
        <section class="section" id="salom">
          <div class="section-inner card card-soft reveal">
            <p class="eyebrow">Assalomu alaykum</p>
            <p class="script-title">Aziz mehmon!</p>
            <p class="body-text">${escapeHtml(inv.custom_message) || defaultSalomMsg}</p>
          </div>
        </section>

        <section class="section" id="ismlar">
          <div class="section-inner reveal">
            <p class="eyebrow">${escapeHtml(headline)}</p>
            <div class="names-wrap">
              <span class="name groom">${escapeHtml(groom)}</span>
              ${isCouple ? `
                <div class="amp-ornament"><span class="line"></span><span class="diamond"></span><span class="line"></span></div>
                <span class="name bride">${escapeHtml(bride)}</span>
              ` : ''}
            </div>
            <p class="tagline">${escapeHtml(tagline)}</p>
          </div>
        </section>

        ${inv.photo_url ? `
        <section class="section" id="surat">
          <div class="section-inner reveal">
            <div class="photo-frame">
              <img src="${escapeHtml(inv.photo_url)}" alt="${escapeHtml(groom)}${isCouple ? ' va ' + escapeHtml(bride) : ''}" />
            </div>
          </div>
        </section>` : ''}

        ${inv.event_date ? `
        <section class="section" id="sana">
          <div class="section-inner card reveal">
            <p class="eyebrow">${escapeHtml(cat.dateLabel.replace(' (ixtiyoriy)', ''))}</p>
            <p class="date-big">${escapeHtml(dateLabel)}</p>
            ${calendar ? `
            <div class="cal">
              <p class="cal-month">${escapeHtml(calendar.monthLabel)}</p>
              <div class="cal-grid">
                ${calendar.weekdays.map((w) => `<span>${w}</span>`).join('')}
                ${calendar.cells.map((d) => d === null
                  ? '<span class="day empty"></span>'
                  : `<span class="day${d === calendar.highlightDay ? ' hi' : ''}">${d}</span>`
                ).join('')}
              </div>
            </div>` : ''}
            ${inv.event_time ? `<p class="time-line">Boshlanish vaqti — <strong>${escapeHtml(inv.event_time)}</strong></p>` : ''}
          </div>
        </section>

        <section class="section" id="sanoq">
          <div class="section-inner reveal">
            <p class="eyebrow">Tadbirga qadar</p>
            <p class="lede" style="color:var(--paper)">Sizni ko'rishni sabrsizlik bilan kutamiz</p>
            <div class="countdown-grid">
              <div class="cd-tile"><span class="cd-num" id="cd-days">00</span><span class="cd-label">Kun</span></div>
              <div class="cd-tile"><span class="cd-num" id="cd-hours">00</span><span class="cd-label">Soat</span></div>
              <div class="cd-tile"><span class="cd-num" id="cd-mins">00</span><span class="cd-label">Daqiqa</span></div>
              <div class="cd-tile"><span class="cd-num" id="cd-secs">00</span><span class="cd-label">Soniya</span></div>
            </div>
          </div>
        </section>` : ''}

        ${(inv.venue_name || inv.address) ? `
        <section class="section" id="manzil">
          <div class="section-inner card reveal">
            <p class="eyebrow">${escapeHtml(cat.venueEyebrow) || 'Tadbir'}</p>
            <div class="arch-decor">
              <svg viewBox="0 0 300 260" aria-hidden="true">
                <defs>
                  <pattern id="archDots" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                    <circle cx="8" cy="8" r="1.1" fill="var(--gold)" opacity="0.35"/>
                  </pattern>
                </defs>
                <rect class="arch-panel" x="6" y="24" width="50" height="208" rx="30"/>
                <rect class="arch-panel" x="244" y="24" width="50" height="208" rx="30"/>
                <path class="arch-outer" d="M74 232 V130 Q74 60 150 20 Q226 60 226 130 V232"/>
                <path class="arch-inner" d="M88 232 V132 Q88 74 150 38 Q212 74 212 132 V232"/>
                <line class="arch-sill" x1="58" y1="232" x2="242" y2="232"/>
                <line class="arch-sill" x1="58" y1="238" x2="242" y2="238"/>
                <g class="arch-pin" transform="translate(150,204)">
                  <path d="M0,-16 C9,-16 15,-9 15,-1.5 C15,9 0,21 0,21 C0,21 -15,9 -15,-1.5 C-15,-9 -9,-16 0,-16 Z"/>
                  <circle cx="0" cy="-1.5" r="4.8"/>
                </g>
                <rect class="arch-gem" x="26" y="66" width="7" height="7" transform="rotate(45 30 70)"/>
                <rect class="arch-gem gold" x="266" y="86" width="6" height="6" transform="rotate(45 270 90)"/>
                <rect class="arch-gem gold" x="30" y="168" width="6" height="6" transform="rotate(45 34 172)"/>
                <rect class="arch-gem" x="262" y="178" width="7" height="7" transform="rotate(45 266 182)"/>
              </svg>
              <div class="arch-text">
                <div class="arch-flourish"><span class="line"></span><span class="diamond"></span><span class="line"></span></div>
                ${inv.venue_name ? `<p class="venue-name">${escapeHtml(inv.venue_name)}</p>` : ''}
                ${inv.address ? `<p class="venue-addr">${escapeHtml(inv.address)}</p>` : ''}
                <div class="arch-flourish"><span class="line"></span><span class="diamond"></span><span class="line"></span></div>
              </div>
            </div>
            ${inv.map_link ? `<a class="btn-gold" href="${escapeHtml(inv.map_link)}" target="_blank" rel="noopener">Xaritada ko'rish</a>` : ''}
          </div>
        </section>` : ''}

        <section class="section" id="tilak">
          <div class="section-inner reveal">
            <p class="eyebrow">Samimiy tilak</p>
            <p class="closing-msg">Ushbu tadbirga tashrif buyurish orqali bizga katta sharaf baxsh etasiz. Sizning huzuringiz — bu kunning eng qimmatli sovg'asidir.</p>
            ${inv.family_name ? `
              <div class="rule"></div>
              <p style="font-size:0.85rem;color:var(--ivory-dim)">Hurmat bilan,</p>
              <p class="family-name" id="finale-mark">${escapeHtml(inv.family_name)}</p>
            ` : '<div class="rule" id="finale-mark"></div>'}

            <div class="actions-row">
              <button class="btn-ghost" id="share-btn">Taklifnomani ulashish</button>
              <a class="btn-ghost" id="telegram-share-btn" target="_blank" rel="noopener">
                <svg class="tg-icon" viewBox="0 0 240 240" aria-hidden="true">
                  <circle cx="120" cy="120" r="120" fill="#229ED9"/>
                  <path fill="#fff" d="M52 118l122-47c5.6-2.2 10.5 1.4 8.7 9.7l-20.8 98c-1.5 6.9-5.6 8.6-11.4 5.3l-31.5-23.2-15.2 14.6c-1.7 1.7-3.1 3.1-6.3 3.1l2.2-31.8 58-52.4c2.5-2.2-.5-3.5-3.9-1.3l-71.7 45.1-30.9-9.6c-6.7-2.1-6.8-6.7 1.8-9.5z"/>
                </svg>
                Telegramda ulashish
              </a>
            </div>
          </div>
        </section>

        ${siteFootHtml(ctx)}`;
  }

  function siteFootHtml(ctx) {
    const { inv, groom, bride, isCouple, dateLabel } = ctx;
    return `
        <footer class="section site-foot">
          <div class="monogram" style="width:88px;height:88px;">
            <div class="monogram-letters" style="font-size:1.1rem;">
              <span>${escapeHtml((groom[0] || '?').toUpperCase())}</span>
              ${isCouple ? `<span class="amp" style="font-size:0.6rem;">va</span><span>${escapeHtml((bride[0] || '?').toUpperCase())}</span>` : ''}
            </div>
          </div>
          <p class="foot-line">${inv.event_date ? escapeHtml(dateLabel.split(' · ')[0]) : ''}</p>
        </footer>

        <div class="contact-foot">
          <a class="contact-tg" href="https://t.me/sunnatov_03" target="_blank" rel="noopener" aria-label="Telegram">
            <svg class="tg-icon" viewBox="0 0 240 240" aria-hidden="true">
              <circle cx="120" cy="120" r="120" fill="#229ED9"/>
              <path fill="#fff" d="M52 118l122-47c5.6-2.2 10.5 1.4 8.7 9.7l-20.8 98c-1.5 6.9-5.6 8.6-11.4 5.3l-31.5-23.2-15.2 14.6c-1.7 1.7-3.1 3.1-6.3 3.1l2.2-31.8 58-52.4c2.5-2.2-.5-3.5-3.9-1.3l-71.7 45.1-30.9-9.6c-6.7-2.1-6.8-6.7 1.8-9.5z"/>
            </svg>
          </a>
          <a class="btn-ghost" href="/contact">Adminga yozish</a>
          <a class="btn-ghost" href="/">Bosh sahifaga o'tish</a>
        </div>`;
  }

  function dasturxonSectionsHtml(ctx) {
    const { inv, groom, bride, isCouple, calendar, dateLabel, cat } = ctx;
    const hostNames = isCouple ? `${escapeHtml(groom)}-${escapeHtml(bride)}` : escapeHtml(groom);
    return `
        <img class="floral-divider" src="/assets/images/dividers/floral-bouquet.svg" alt="" aria-hidden="true" />
        <section class="section" style="padding-top:0;">
          <div class="arch-card reveal">
            <p class="arch-hosts-label">${escapeHtml(cat.label)} egalari:</p>
            <p class="arch-hosts">${hostNames}</p>

            ${inv.event_date ? `
            <div class="arch-divider"></div>
            <p class="arch-time-label">Boshlash vaqti:</p>
            <p class="arch-time-value">${escapeHtml(dateLabel.split(' · ')[0])}${inv.event_time ? ` / soat ${escapeHtml(inv.event_time)}` : ''}</p>

            <p class="cd-round-label">Boshlanish arafasida:</p>
            <div class="cd-round-grid">
              <div class="cd-round-tile"><span class="cd-num" id="cd-days">00</span><span class="cd-label">kun</span></div>
              <div class="cd-round-tile"><span class="cd-num" id="cd-hours">00</span><span class="cd-label">soat</span></div>
              <div class="cd-round-tile"><span class="cd-num" id="cd-mins">00</span><span class="cd-label">daqiqa</span></div>
              <div class="cd-round-tile"><span class="cd-num" id="cd-secs">00</span><span class="cd-label">soniya</span></div>
            </div>` : ''}

            ${(inv.venue_name || inv.address) ? `
            <div class="arch-divider"></div>
            <p class="arch-hosts-label">${escapeHtml(cat.venueEyebrow) || 'Manzil'}:</p>
            ${inv.venue_name ? `<p class="arch-venue-name">${escapeHtml(inv.venue_name)}</p>` : ''}
            ${inv.address ? `<p class="arch-venue-addr">${escapeHtml(inv.address)}</p>` : ''}
            ${inv.map_link ? `<a class="btn-gold" href="${escapeHtml(inv.map_link)}" target="_blank" rel="noopener">Karta orqali ochish</a>` : ''}
            ` : ''}
          </div>
        </section>

        <img class="floral-divider" src="/assets/images/dividers/floral-bouquet.svg" alt="" aria-hidden="true" />
        <section class="dasturxon-closing reveal">
          <p>Ushbu nahor oshiga tashrif buyurishingiz biz uchun katta sharaf. Sizni ko'rishdan mamnun bo'lamiz.</p>
          <div class="rule" id="finale-mark" style="margin:0 auto 1.6rem;"></div>
          <div class="actions-row">
            <button class="btn-ghost" id="share-btn">Taklifnomani ulashish</button>
            <a class="btn-ghost" id="telegram-share-btn" target="_blank" rel="noopener">
              <svg class="tg-icon" viewBox="0 0 240 240" aria-hidden="true">
                <circle cx="120" cy="120" r="120" fill="#229ED9"/>
                <path fill="#fff" d="M52 118l122-47c5.6-2.2 10.5 1.4 8.7 9.7l-20.8 98c-1.5 6.9-5.6 8.6-11.4 5.3l-31.5-23.2-15.2 14.6c-1.7 1.7-3.1 3.1-6.3 3.1l2.2-31.8 58-52.4c2.5-2.2-.5-3.5-3.9-1.3l-71.7 45.1-30.9-9.6c-6.7-2.1-6.8-6.7 1.8-9.5z"/>
              </svg>
              Telegramda ulashish
            </a>
          </div>
        </section>

        ${siteFootHtml(ctx)}`;
  }

  function maktubSectionsHtml(ctx) {
    const { inv, groom, bride, isCouple, dateLabel } = ctx;
    const greeting = isCouple && bride ? `${bride},` : 'Sevgilim,';
    const defaultBody = "Har bir soniya seni o'ylash bilan o'tadi. Ushbu satrlar orqali yuragimdagi barcha gaplarni senga yetkazmoqchiman — sen mening hayotimning eng go'zal tasodifisan.";
    return `
        <section class="section" id="hat">
          <div class="maktub-letter reveal">
            <p class="maktub-greeting">${escapeHtml(greeting)}</p>
            <div class="maktub-flourish"><span class="line"></span><span class="diamond"></span><span class="line"></span></div>
            <p class="maktub-body">${escapeHtml(inv.custom_message) || defaultBody}</p>
            <div class="maktub-signoff">
              <p class="maktub-signoff-label">Mehr bilan,</p>
              <p class="maktub-signoff-name">${escapeHtml(groom)}</p>
            </div>
            ${inv.song_url ? `<p class="maktub-music-note">&#9835; Bu hatni shu ohang jo'rligida o'qing</p>` : ''}
          </div>
        </section>

        ${inv.photo_url ? `
        <section class="section">
          <div class="maktub-photo-frame reveal">
            <img src="${escapeHtml(inv.photo_url)}" alt="${escapeHtml(groom)}" />
          </div>
        </section>` : ''}

        ${inv.event_date ? `
        <section class="section">
          <div class="reveal" style="text-align:center;">
            <p class="cd-letter-label">${escapeHtml(dateLabel)}</p>
            <div class="cd-letter-grid">
              <div class="cd-letter-tile"><span class="cd-num" id="cd-days">00</span><span class="cd-label">kun</span></div>
              <div class="cd-letter-tile"><span class="cd-num" id="cd-hours">00</span><span class="cd-label">soat</span></div>
              <div class="cd-letter-tile"><span class="cd-num" id="cd-mins">00</span><span class="cd-label">daqiqa</span></div>
              <div class="cd-letter-tile"><span class="cd-num" id="cd-secs">00</span><span class="cd-label">soniya</span></div>
            </div>
          </div>
        </section>` : ''}

        <section class="maktub-closing reveal">
          <p>Ushbu hatni o'qib, yuragimdagi gaplarni his qilganingizdan minnatdorman.</p>
          <div class="rule" id="finale-mark" style="margin:0 auto 1.6rem;"></div>
          <div class="actions-row">
            <button class="btn-ghost" id="share-btn">Taklifnomani ulashish</button>
            <a class="btn-ghost" id="telegram-share-btn" target="_blank" rel="noopener">
              <svg class="tg-icon" viewBox="0 0 240 240" aria-hidden="true">
                <circle cx="120" cy="120" r="120" fill="#229ED9"/>
                <path fill="#fff" d="M52 118l122-47c5.6-2.2 10.5 1.4 8.7 9.7l-20.8 98c-1.5 6.9-5.6 8.6-11.4 5.3l-31.5-23.2-15.2 14.6c-1.7 1.7-3.1 3.1-6.3 3.1l2.2-31.8 58-52.4c2.5-2.2-.5-3.5-3.9-1.3l-71.7 45.1-30.9-9.6c-6.7-2.1-6.8-6.7 1.8-9.5z"/>
              </svg>
              Telegramda ulashish
            </a>
          </div>
        </section>

        ${siteFootHtml(ctx)}`;
  }

  function premiumSectionsHtml(ctx) {
    const { inv, groom, bride, isCouple, premiumStyle } = ctx;
    const recipientName = (isCouple ? bride : groom) || 'Azizam';
    const galleryPhotos = (inv.gallery && inv.gallery.length)
      ? inv.gallery
      : (inv.photo_url ? [{ url: inv.photo_url, caption: '' }] : []);

    return `
        <section class="premium-hero reveal">
          ${premiumStyle.hearts ? `<div class="premium-hearts" aria-hidden="true">${heartSpans(9)}</div>` : ''}
          <div class="premium-hero-photo-wrap">
            <div class="premium-hero-glow"></div>
            ${inv.photo_url
              ? `<img class="premium-hero-photo" src="${escapeHtml(inv.photo_url)}" alt="${escapeHtml(recipientName)}" />`
              : `<div class="premium-hero-photo premium-hero-photo-empty">${escapeHtml((recipientName[0] || '?').toUpperCase())}</div>`}
          </div>
          <p class="premium-hero-name">${escapeHtml(recipientName)}</p>
          <p class="premium-hero-sub">Bu sahifani faqat sen ko'rishing uchun tayyorladim.</p>
        </section>

        ${galleryPhotos.length ? `
        <section class="premium-gallery-section reveal">
          <p class="premium-section-eyebrow">Bizning lahzalarimiz</p>
          <div class="premium-carousel">
            ${galleryPhotos.map((p) => `
              <div class="premium-slide">
                <img src="${escapeHtml(p.url)}" alt="" loading="lazy" />
                ${p.caption ? `<p class="premium-slide-caption">${escapeHtml(p.caption)}</p>` : ''}
              </div>
            `).join('')}
          </div>
        </section>` : ''}

        <section class="premium-letter-section reveal">
          <p class="premium-section-eyebrow">Sevgi maktubi</p>
          <div class="premium-glass-card">
            <p class="premium-letter-text" id="premium-letter-text"></p>
            <span class="premium-mini-heart" aria-hidden="true">❤</span>
          </div>
        </section>

        ${inv.event_date ? `
        <section class="premium-counter-section reveal">
          <p class="premium-section-eyebrow">Seni sevishni boshlaganimga</p>
          <div class="premium-counter-grid">
            <div class="premium-counter-tile"><span class="cd-num" id="pc-days">0</span><span class="cd-label">kun</span></div>
            <div class="premium-counter-tile"><span class="cd-num" id="pc-hours">0</span><span class="cd-label">soat</span></div>
            <div class="premium-counter-tile"><span class="cd-num" id="pc-mins">0</span><span class="cd-label">daqiqa</span></div>
            <div class="premium-counter-tile"><span class="cd-num" id="pc-secs">0</span><span class="cd-label">soniya</span></div>
          </div>
        </section>` : ''}

        ${inv.video_url ? `
        <section class="premium-video-section reveal">
          <div class="premium-video-frame">
            <video src="${escapeHtml(inv.video_url)}" controls preload="none"></video>
          </div>
        </section>` : ''}

        <section class="premium-finale reveal">
          <p class="premium-finale-heart" aria-hidden="true">❤</p>
          <h2 class="premium-finale-title">Mening sevgilim bo'lasanmi?</h2>
          <div class="premium-finale-actions">
            <button type="button" class="premium-enter-btn" id="premium-yes-btn">❤️ Ha</button>
            <button type="button" class="btn-ghost" id="premium-no-btn">🤍 O'ylab ko'raman</button>
          </div>
          <p class="premium-finale-result" id="premium-finale-result"></p>

          <div class="actions-row" style="margin-top:2rem;">
            <button class="btn-ghost" id="share-btn">Taklifnomani ulashish</button>
            <a class="btn-ghost" id="telegram-share-btn" target="_blank" rel="noopener">
              <svg class="tg-icon" viewBox="0 0 240 240" aria-hidden="true">
                <circle cx="120" cy="120" r="120" fill="#229ED9"/>
                <path fill="#fff" d="M52 118l122-47c5.6-2.2 10.5 1.4 8.7 9.7l-20.8 98c-1.5 6.9-5.6 8.6-11.4 5.3l-31.5-23.2-15.2 14.6c-1.7 1.7-3.1 3.1-6.3 3.1l2.2-31.8 58-52.4c2.5-2.2-.5-3.5-3.9-1.3l-71.7 45.1-30.9-9.6c-6.7-2.1-6.8-6.7 1.8-9.5z"/>
              </svg>
              Telegramda ulashish
            </a>
            <a class="btn-ghost" id="whatsapp-share-btn" target="_blank" rel="noopener">🟢 WhatsApp'da ulashish</a>
          </div>
        </section>

        ${siteFootHtml(ctx)}`;
  }

  function coverShohona(ctx) {
    const { groom, bride, isCouple } = ctx;
    const initial = (groom[0] || '?').toUpperCase();
    const monogram = isCouple ? `${initial} & ${(bride[0] || '?').toUpperCase()}` : initial;
    return `
        <section class="shohona-cover" id="cover">
          <div class="shohona-mid">
            <div class="shohona-monogram">${escapeHtml(monogram)}</div>
            <p class="shohona-gate-text">Siz maxsus mehmon sifatida taklif etildingiz.</p>
            <button type="button" class="shohona-enter-btn" id="envelope-btn">✨ Taklifnomani ochish</button>
            <p class="shohona-gate-hint" id="envelope-hint"></p>
          </div>
          <div class="scroll-hint">
            <span>Pastga suring</span>
            <span class="chevron" aria-hidden="true"></span>
          </div>
        </section>`;
  }

  function shohonaSectionsHtml(ctx) {
    const { inv, groom, bride, headline, tagline, isCouple, calendar, dateLabel, cat } = ctx;
    const names = isCouple ? `${escapeHtml(groom)} & ${escapeHtml(bride)}` : escapeHtml(groom);
    const galleryPhotos = (inv.gallery && inv.gallery.length)
      ? inv.gallery
      : (inv.photo_url ? [{ url: inv.photo_url, caption: '' }] : []);

    return `
        <section class="shohona-hero reveal">
          ${inv.video_url ? `<video class="shohona-hero-video" src="${escapeHtml(inv.video_url)}" autoplay muted loop playsinline></video><div class="shohona-hero-scrim"></div>` : ''}
          <p class="shohona-eyebrow">${escapeHtml(headline)}</p>
          <h1 class="shohona-hero-name">${names}</h1>
          <p class="shohona-hero-tagline">${escapeHtml(tagline)}</p>
        </section>

        <section class="shohona-section reveal">
          <div class="shohona-card">
            <div class="shohona-card-line"></div>
            <p class="shohona-card-eyebrow">${escapeHtml(cat.inviteWord || 'Taklifnoma')}</p>
            <p class="shohona-card-names">${names}</p>
            <p class="shohona-card-tagline">${escapeHtml(tagline)}</p>
            <div class="shohona-card-line"></div>
          </div>
        </section>

        ${inv.custom_message ? `
        <section class="shohona-section reveal">
          <p class="shohona-section-eyebrow">Taklifnoma matni</p>
          <div class="shohona-card">
            <p class="shohona-message-text">${escapeHtml(inv.custom_message)}</p>
          </div>
        </section>` : ''}

        <section class="shohona-section reveal">
          <div class="shohona-infogrid">
            ${inv.event_date ? `<div class="shohona-infocard"><span class="shohona-info-icon">📅</span><span class="shohona-info-label">Sana</span><span class="shohona-info-value">${escapeHtml(dateLabel.split(' · ')[0])}</span></div>` : ''}
            ${inv.event_time ? `<div class="shohona-infocard"><span class="shohona-info-icon">🕐</span><span class="shohona-info-label">Vaqt</span><span class="shohona-info-value">${escapeHtml(inv.event_time)}</span></div>` : ''}
            ${(inv.venue_name || inv.address) ? `<div class="shohona-infocard"><span class="shohona-info-icon">📍</span><span class="shohona-info-label">Manzil</span><span class="shohona-info-value">${escapeHtml(inv.venue_name || inv.address)}</span></div>` : ''}
            ${inv.family_name ? `<div class="shohona-infocard"><span class="shohona-info-icon">👨‍👩‍👧</span><span class="shohona-info-label">Mezbon</span><span class="shohona-info-value">${escapeHtml(inv.family_name)}</span></div>` : ''}
            ${inv.telegram_group ? `<div class="shohona-infocard"><span class="shohona-info-icon">📞</span><span class="shohona-info-label">Bog'lanish</span><span class="shohona-info-value">${escapeHtml(inv.telegram_group)}</span></div>` : ''}
          </div>
        </section>

        ${inv.event_date ? `
        <section class="shohona-section reveal">
          <p class="shohona-section-eyebrow">Tadbirga qadar</p>
          <div class="shohona-countdown-grid">
            <div class="shohona-countdown-tile"><span class="cd-num" id="cd-days">00</span><span class="cd-label">Kun</span></div>
            <div class="shohona-countdown-tile"><span class="cd-num" id="cd-hours">00</span><span class="cd-label">Soat</span></div>
            <div class="shohona-countdown-tile"><span class="cd-num" id="cd-mins">00</span><span class="cd-label">Daqiqa</span></div>
            <div class="shohona-countdown-tile"><span class="cd-num" id="cd-secs">00</span><span class="cd-label">Soniya</span></div>
          </div>
        </section>` : ''}

        ${galleryPhotos.length ? `
        <section class="shohona-section reveal">
          <p class="shohona-section-eyebrow">Rasmlar</p>
          <div class="shohona-carousel">
            ${galleryPhotos.map((p) => `
              <div class="shohona-slide">
                <img src="${escapeHtml(p.url)}" alt="" loading="lazy" />
                ${p.caption ? `<p class="shohona-slide-caption">${escapeHtml(p.caption)}</p>` : ''}
              </div>
            `).join('')}
          </div>
        </section>` : ''}

        ${inv.map_link ? `
        <section class="shohona-section reveal">
          <a class="btn-gold" href="${escapeHtml(inv.map_link)}" target="_blank" rel="noopener">📍 Marshrutni boshlash</a>
        </section>` : ''}

        ${inv.rsvp_enabled ? `
        <section class="shohona-section reveal" id="rsvp">
          <p class="shohona-section-eyebrow">Mehmon tasdiqlash</p>
          <form class="shohona-rsvp-form" id="shohona-rsvp-form">
            <input type="text" id="rsvp-name" placeholder="Ismingiz" required />
            <input type="number" id="rsvp-count" placeholder="Necha kishi" min="1" max="20" value="1" />
            <div class="shohona-rsvp-choice">
              <button type="button" class="shohona-rsvp-btn active" data-attending="yes">Kelaman</button>
              <button type="button" class="shohona-rsvp-btn" data-attending="no">Kela olmayman</button>
            </div>
            <textarea id="rsvp-wish" placeholder="Tilagingiz (ixtiyoriy)"></textarea>
            <button type="submit" class="shohona-enter-btn">Yuborish</button>
          </form>
          <div class="shohona-rsvp-success" id="shohona-rsvp-success" hidden>
            <span class="shohona-rsvp-check">✓</span>
            <p>Rahmat! Javobingiz qabul qilindi.</p>
          </div>
        </section>

        <section class="shohona-section reveal">
          <p class="shohona-section-eyebrow">Tilaklar devori</p>
          <div class="shohona-wishes-grid" id="shohona-wishes-grid">
            <p class="shohona-wishes-empty">Hali tilaklar yo'q — birinchi bo'ling!</p>
          </div>
        </section>` : ''}

        ${inv.gift_card_number ? `
        <section class="shohona-section reveal">
          <p class="shohona-section-eyebrow">Sovg'a</p>
          <div class="shohona-gift-card">
            <p class="shohona-gift-number" id="shohona-gift-number">${escapeHtml(inv.gift_card_number)}</p>
            <button type="button" class="btn-ghost" id="shohona-gift-copy">Nusxalash</button>
            <p class="shohona-gift-note">${escapeHtml(inv.gift_note) || "Niyatning o'zi biz uchun katta sovg'a."}</p>
          </div>
        </section>` : ''}

        <section class="shohona-finale reveal">
          <div class="actions-row">
            <button class="btn-ghost" id="share-btn">Taklifnomani ulashish</button>
            <a class="btn-ghost" id="telegram-share-btn" target="_blank" rel="noopener">
              <svg class="tg-icon" viewBox="0 0 240 240" aria-hidden="true">
                <circle cx="120" cy="120" r="120" fill="#229ED9"/>
                <path fill="#fff" d="M52 118l122-47c5.6-2.2 10.5 1.4 8.7 9.7l-20.8 98c-1.5 6.9-5.6 8.6-11.4 5.3l-31.5-23.2-15.2 14.6c-1.7 1.7-3.1 3.1-6.3 3.1l2.2-31.8 58-52.4c2.5-2.2-.5-3.5-3.9-1.3l-71.7 45.1-30.9-9.6c-6.7-2.1-6.8-6.7 1.8-9.5z"/>
              </svg>
              Telegramda ulashish
            </a>
          </div>
          <div class="rule" id="finale-mark" style="margin:1.6rem auto 0;"></div>
          <p class="shohona-footer-line">Ushbu taklifnoma siz uchun mehr bilan tayyorlandi.</p>
        </section>

        ${siteFootHtml(ctx)}`;
  }

  function wireInteractions(inv, layout) {
    const coverEl = document.getElementById('cover');
    const envelopeBtn = document.getElementById('envelope-btn');
    const bgAudio = document.getElementById('bg-audio');
    const musicToggle = document.getElementById('music-toggle');

    function setMusicPlaying(playing) {
      if (!musicToggle) return;
      musicToggle.classList.toggle('playing', playing);
      musicToggle.setAttribute('aria-label', playing ? "Musiqani o'chirish" : 'Musiqani yoqish');
    }

    if (bgAudio && musicToggle) {
      musicToggle.addEventListener('click', () => {
        if (bgAudio.paused) {
          bgAudio.play().then(() => setMusicPlaying(true)).catch(() => {});
        } else {
          bgAudio.pause();
          setMusicPlaying(false);
        }
      });
      bgAudio.addEventListener('pause', () => setMusicPlaying(false));
      bgAudio.addEventListener('play', () => setMusicPlaying(true));
    }

    if (envelopeBtn) {
      envelopeBtn.addEventListener('click', () => {
        if (coverEl.classList.contains('opened')) return;
        coverEl.classList.add('opened');
        const hint = document.getElementById('envelope-hint');
        if (hint) hint.textContent = '';
        if (layout === 'premium') playHeartbeat();
        if (bgAudio) bgAudio.play().catch(() => {});
        if (reduceMotion) {
          coverEl.classList.add('revealed');
        } else {
          setTimeout(() => coverEl.classList.add('revealed'), 350);
        }
      });
    }

    const revealEls = document.querySelectorAll('.reveal');
    const revealIfVisible = (el) => {
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.bottom > 0) {
        el.classList.add('visible');
        return true;
      }
      return false;
    };
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); } });
    }, { threshold: 0 });
    revealEls.forEach((el) => { if (!revealIfVisible(el)) io.observe(el); });
    // Backup poll: guarantees nothing stays permanently invisible even if the
    // observer misses a section (e.g. a very tall section, or an instant/
    // programmatic scroll that skips intersection callbacks on some engines).
    let revealChecks = 0;
    const revealPoll = setInterval(() => {
      const remaining = document.querySelectorAll('.reveal:not(.visible)');
      remaining.forEach(revealIfVisible);
      revealChecks += 1;
      if (remaining.length === 0 || revealChecks > 150) clearInterval(revealPoll);
    }, 200);

    if (inv.event_date && layout === 'premium') {
      const start = parseEventDate(inv.event_date, inv.event_time || '00:00').getTime();
      const els = {
        d: document.getElementById('pc-days'),
        h: document.getElementById('pc-hours'),
        m: document.getElementById('pc-mins'),
        s: document.getElementById('pc-secs')
      };
      function tickUp() {
        let diff = Date.now() - start;
        if (diff < 0) diff = 0;
        els.d.textContent = Math.floor(diff / 86400000);
        els.h.textContent = Math.floor((diff % 86400000) / 3600000);
        els.m.textContent = Math.floor((diff % 3600000) / 60000);
        els.s.textContent = Math.floor((diff % 60000) / 1000);
      }
      tickUp();
      setInterval(tickUp, 1000);
    } else if (inv.event_date) {
      const target = parseEventDate(inv.event_date, inv.event_time || '00:00').getTime();
      const els = {
        d: document.getElementById('cd-days'),
        h: document.getElementById('cd-hours'),
        m: document.getElementById('cd-mins'),
        s: document.getElementById('cd-secs')
      };
      const pad = (n) => String(n).padStart(2, '0');
      function tick() {
        let diff = target - Date.now();
        if (diff < 0) diff = 0;
        els.d.textContent = pad(Math.floor(diff / 86400000));
        els.h.textContent = pad(Math.floor((diff % 86400000) / 3600000));
        els.m.textContent = pad(Math.floor((diff % 3600000) / 60000));
        els.s.textContent = pad(Math.floor((diff % 60000) / 1000));
      }
      tick();
      setInterval(tick, 1000);
    }

    if (layout === 'premium') {
      const letterEl = document.getElementById('premium-letter-text');
      if (letterEl) {
        const fullText = inv.custom_message || PREMIUM_DEFAULT_LETTER;
        const letterIo = new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              typewriter(letterEl, fullText, 28);
              letterIo.disconnect();
            }
          });
        }, { threshold: 0.4 });
        letterIo.observe(letterEl);
      }

      const whatsappBtn = document.getElementById('whatsapp-share-btn');
      if (whatsappBtn) {
        whatsappBtn.href = `https://wa.me/?text=${encodeURIComponent(document.title + ' — ' + window.location.href)}`;
      }

      const yesBtn = document.getElementById('premium-yes-btn');
      const noBtn = document.getElementById('premium-no-btn');
      const resultEl = document.getElementById('premium-finale-result');
      if (yesBtn) {
        yesBtn.addEventListener('click', () => {
          if (resultEl) resultEl.textContent = "Bugundan boshlab dunyodagi eng baxtli inson menman ❤️";
          document.querySelector('.premium-finale').classList.add('answered');
          if (noBtn) noBtn.hidden = true;
          const style = parsePremiumStyle(inv.premium_style);
          if (style.confetti) fireConfetti();
        });
      }
      if (noBtn) {
        let dodges = 0;
        const dodge = () => {
          if (dodges >= 12) return;
          dodges++;
          const maxX = 90, maxY = 40;
          const x = (Math.random() - 0.5) * 2 * maxX;
          const y = (Math.random() - 0.5) * 2 * maxY;
          noBtn.style.transform = `translate(${x}px, ${y}px)`;
        };
        noBtn.addEventListener('mouseenter', dodge);
        noBtn.addEventListener('touchstart', (e) => { e.preventDefault(); dodge(); }, { passive: false });
      }
    }

    if (layout === 'shohona' || layout === 'nikoh') {
      const giftCopyBtn = document.getElementById('shohona-gift-copy');
      if (giftCopyBtn) {
        giftCopyBtn.addEventListener('click', () => {
          const number = document.getElementById('shohona-gift-number').textContent.trim();
          if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(number).then(() => showToast('Nusxalandi'), () => fallbackCopy(number));
          } else {
            fallbackCopy(number);
          }
        });
      }

      const wishesGrid = document.getElementById('shohona-wishes-grid');
      function renderWishes(wishes) {
        if (!wishesGrid) return;
        if (!wishes.length) {
          wishesGrid.innerHTML = '<p class="shohona-wishes-empty">Hali tilaklar yo\'q — birinchi bo\'ling!</p>';
          return;
        }
        wishesGrid.innerHTML = wishes.map((w) => `
          <div class="shohona-wish-card reveal visible">
            <p class="shohona-wish-text">${escapeHtml(w.wish)}</p>
            <p class="shohona-wish-name">— ${escapeHtml(w.guest_name || 'Mehmon')}</p>
          </div>
        `).join('');
      }
      function loadWishes() {
        if (!wishesGrid) return;
        api.getWishes(inv.slug).then(({ wishes }) => renderWishes(wishes)).catch(() => {});
      }
      loadWishes();

      const rsvpForm = document.getElementById('shohona-rsvp-form');
      if (rsvpForm) {
        let attending = 'yes';
        rsvpForm.querySelectorAll('.shohona-rsvp-btn').forEach((btn) => {
          btn.addEventListener('click', () => {
            rsvpForm.querySelectorAll('.shohona-rsvp-btn').forEach((b) => b.classList.remove('active'));
            btn.classList.add('active');
            attending = btn.getAttribute('data-attending');
          });
        });
        rsvpForm.addEventListener('submit', async (e) => {
          e.preventDefault();
          const submitBtn = rsvpForm.querySelector('button[type="submit"]');
          submitBtn.disabled = true;
          try {
            await api.submitRsvp(inv.slug, {
              guest_name: document.getElementById('rsvp-name').value,
              attending,
              guests_count: document.getElementById('rsvp-count').value,
              wish: document.getElementById('rsvp-wish').value
            });
            rsvpForm.hidden = true;
            const successEl = document.getElementById('shohona-rsvp-success');
            if (successEl) successEl.hidden = false;
            fireConfetti(['#D4AF37', '#F8FAFC', '#E6B8A2']);
            loadWishes();
          } catch (err) {
            showToast(err.message, true);
            submitBtn.disabled = false;
          }
        });
      }
    }

    const sectionIds = Array.from(document.querySelectorAll('main > section[id]')).map((s) => s.id);
    const dots = document.querySelectorAll('.dotnav button');
    dots.forEach((btn) => {
      btn.addEventListener('click', () => {
        const el = document.getElementById(btn.getAttribute('data-target'));
        if (el) el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
      });
    });
    const navIo = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const idx = sectionIds.indexOf(entry.target.id);
        if (idx === -1 || !entry.isIntersecting) return;
        dots.forEach((d) => d.classList.remove('active'));
        if (dots[idx]) dots[idx].classList.add('active');
      });
    }, { threshold: 0.5 });
    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) navIo.observe(el);
    });

    const toast = document.getElementById('toast');
    let toastTimer;
    function showToast(msg) {
      toast.textContent = msg;
      toast.classList.add('show');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
    }

    function fallbackCopy(text) {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      try {
        document.execCommand('copy');
        showToast('Havola nusxalandi');
      } catch (e) {
        showToast("Nusxalab bo'lmadi");
      }
      document.body.removeChild(ta);
    }

    document.getElementById('share-btn').addEventListener('click', () => {
      const shareData = {
        title: document.title,
        text: "Taklifnomani ko'ring!",
        url: window.location.href
      };
      if (navigator.share) {
        navigator.share(shareData).catch(() => {});
      } else if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(shareData.url).then(
          () => showToast('Havola nusxalandi'),
          () => fallbackCopy(shareData.url)
        );
      } else {
        fallbackCopy(shareData.url);
      }
    });

    const telegramShareBtn = document.getElementById('telegram-share-btn');
    if (telegramShareBtn) {
      const shareText = document.title;
      telegramShareBtn.href = `https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(shareText)}`;
    }

    if (!reduceMotion) {
      let fired = false;
      const mark = document.getElementById('finale-mark');
      const fio = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !fired) {
            fired = true;
            fireConfetti();
          }
        });
      }, { threshold: 0.6 });
      if (mark) fio.observe(mark);
    }
  }
})();
