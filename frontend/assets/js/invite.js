(function () {
  const app = document.getElementById('app');
  const slug = window.location.pathname.split('/').filter(Boolean).pop();
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const LAYOUTS = ['nafis', 'klassik', 'zamonaviy', 'dasturxon', 'maktub'];
  const isPreview = window.location.pathname.replace(/\/$/, '') === '/preview';

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
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
      .then(({ invitation }) => render(invitation))
      .catch(() => {
        app.innerHTML = `
          <div class="skeleton-loading" style="flex-direction:column;gap:1rem;">
            <p class="display" style="font-size:1.4rem;">Taklifnoma topilmadi</p>
            <a href="/" class="btn-ghost">Bosh sahifaga qaytish</a>
          </div>`;
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
    const headline = cat.headline;
    const isCouple = !!bride && cat.pair;
    const ctx = { inv, groom, bride, headline, isCouple, calendar, dateLabel, cat };

    const coverHtml = layout === 'klassik' ? coverKlassik(ctx)
      : layout === 'zamonaviy' ? coverZamonaviy(ctx)
      : layout === 'dasturxon' ? coverDasturxon(ctx)
      : layout === 'maktub' ? coverMaktub(ctx)
      : coverNafis(ctx);
    const sectionsHtml = layout === 'dasturxon' ? dasturxonSectionsHtml(ctx)
      : layout === 'maktub' ? maktubSectionsHtml(ctx)
      : sharedSectionsHtml(ctx);

    app.innerHTML = `
      ${(layout === 'dasturxon' || layout === 'maktub') ? '' : dotnavHtml(inv)}

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

  function coverNafis(ctx) {
    const { groom, bride, headline, isCouple, cat } = ctx;
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
            <p class="cover-tagline" id="cover-tagline">${escapeHtml(cat.tagline)}</p>
          </div>
          <div class="scroll-hint">
            <span>Pastga suring</span>
            <span class="chevron" aria-hidden="true"></span>
          </div>
        </section>`;
  }

  function coverKlassik(ctx) {
    const { inv, groom, bride, headline, isCouple, dateLabel, cat } = ctx;
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
            <p class="tagline">${escapeHtml(cat.tagline)}</p>
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
    const { groom, headline, cat } = ctx;
    const initial = (groom[0] || '?').toUpperCase();
    return `
        <section class="maktub-cover" id="cover">
          <div class="maktub-mid">
            <p class="maktub-eyebrow">${escapeHtml(headline)}</p>
            <button type="button" class="wax-seal" id="envelope-btn" aria-label="Muhrni ochish">
              <span class="wax-seal-glyph">${escapeHtml(initial)}</span>
            </button>
            <p class="maktub-hint" id="envelope-hint">Muhrni bosib oching</p>
            <p class="maktub-tagline" id="cover-tagline">${escapeHtml(cat.tagline)}</p>
          </div>
          <div class="scroll-hint">
            <span>Pastga suring</span>
            <span class="chevron" aria-hidden="true"></span>
          </div>
        </section>`;
  }

  // ---------- Shared scroll sections (used by Nafis/Klassik/Zamonaviy) ----------

  function sharedSectionsHtml(ctx) {
    const { inv, groom, bride, headline, isCouple, calendar, dateLabel, cat } = ctx;
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
            <p class="tagline">${escapeHtml(cat.tagline)}</p>
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
        if (bgAudio) bgAudio.play().catch(() => {});
        if (reduceMotion) {
          coverEl.classList.add('revealed');
        } else {
          setTimeout(() => coverEl.classList.add('revealed'), 350);
        }
      });
    }

    const revealEls = document.querySelectorAll('.reveal');
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add('visible'); });
    }, { threshold: 0.18 });
    revealEls.forEach((el) => io.observe(el));

    if (inv.event_date) {
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
      const colors = ['#c9a24a', '#e6c877', '#8a2c3b'];
      const fio = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !fired) {
            fired = true;
            for (let i = 0; i < 26; i++) {
              const p = document.createElement('div');
              p.className = 'confetti-piece';
              p.style.left = Math.random() * 100 + 'vw';
              p.style.background = colors[i % colors.length];
              p.style.animationDuration = (2.4 + Math.random() * 1.6) + 's';
              p.style.animationDelay = (Math.random() * 0.6) + 's';
              document.body.appendChild(p);
              setTimeout(() => p.remove(), 4600);
            }
          }
        });
      }, { threshold: 0.6 });
      if (mark) fio.observe(mark);
    }
  }
})();
