const EVENT_CATEGORIES = [
  {
    id: 'toy',
    label: "To'y",
    pair: true,
    headline: "Nikoh to'yi tantanasi",
    inviteWord: 'Taklif etamiz',
    tagline: 'Ikki qalbning birikishi — eng buyuk baxt',
    taglineSolo: "Bu tantanali kunda yoningizda bo'lishni istaymiz",
    venueEyebrow: 'Tantanali marosim',
    dateLabel: 'Sana',
    msgLabel: 'Qo\'shimcha xabar (ixtiyoriy)',
    msgPlaceholder: ''
  },
  {
    id: 'qiz_bazmi',
    label: 'Qiz bazmi',
    pair: false,
    headline: 'Qiz bazmi kechasi',
    inviteWord: 'Taklif etamiz',
    tagline: 'Bu kunni siz bilan nishonlashni istaymiz',
    venueEyebrow: 'Tadbir',
    dateLabel: 'Sana',
    msgLabel: 'Qo\'shimcha xabar (ixtiyoriy)',
    msgPlaceholder: ''
  },
  {
    id: 'tugilgan_kun',
    label: "Tug'ilgan kun",
    pair: false,
    headline: "Tug'ilgan kun bayrami",
    inviteWord: 'Taklif etamiz',
    tagline: 'Bu bayramona kunda yoningizda bo\'lishni istaymiz',
    venueEyebrow: 'Tadbir',
    dateLabel: 'Sana',
    msgLabel: "Tabrik matni (ixtiyoriy)",
    msgPlaceholder: ''
  },
  {
    id: 'tabrik',
    label: 'Tabrik',
    pair: false,
    headline: 'Chin qalbdan tabrik',
    inviteWord: 'Tabriklaymiz',
    tagline: 'Sizni chin qalbimizdan tabriklaymiz',
    venueEyebrow: 'Tadbir',
    dateLabel: 'Sana (ixtiyoriy)',
    msgLabel: 'Tabrik matni',
    msgPlaceholder: 'Tabrik so\'zlaringizni shu yerga yozing...'
  },
  {
    id: 'haj_safari',
    label: 'Haj safari',
    pair: false,
    headline: 'Haj safariga xayrlashuv',
    inviteWord: "Duo so'raymiz",
    tagline: "Yo'lingiz oq, safaringiz qabul bo'lsin",
    venueEyebrow: "Jo'nash nuqtasi",
    dateLabel: "Jo'nash sanasi",
    msgLabel: 'Duo/tilak matni (ixtiyoriy)',
    msgPlaceholder: ''
  },
  {
    id: 'sevgi_izhor',
    label: 'Sevgi izhori',
    pair: true,
    headline: 'Bir e\'tirofim bor...',
    inviteWord: '',
    tagline: 'Yurak gaplarim siz uchun',
    venueEyebrow: '',
    dateLabel: 'Sana (ixtiyoriy)',
    msgLabel: 'Sevgi izhoringiz',
    msgPlaceholder: 'Yuragingizdagi gaplarni shu yerga yozing...'
  },
  {
    id: 'nahor_oshi',
    label: 'Nahor oshi',
    pair: true,
    headline: 'Nahor oshi taklifnomasi',
    inviteWord: 'Taklif etamiz',
    tagline: "Ertalabki osh dasturxonimizning faxriy mehmoni bo'ling",
    venueEyebrow: 'Nahor oshi manzili',
    dateLabel: 'Sana',
    msgLabel: 'Qo\'shimcha xabar (ixtiyoriy)',
    msgPlaceholder: '',
    exclusiveLayout: true
  },
  {
    id: 'sevgimga_hat',
    label: 'Sevgimga hat',
    pair: true,
    headline: 'Senga bir hatim bor...',
    inviteWord: '',
    tagline: 'Yuragimdagi eng nozik gaplar — senga atalgan',
    venueEyebrow: '',
    dateLabel: 'Maxsus kun (ixtiyoriy)',
    msgLabel: 'Hat matni',
    msgPlaceholder: 'Yuragingizdagi gaplarni shu yerga yozing...',
    hideFamily: true,
    noVenue: true,
    exclusiveLayout: true
  }
];

function getEventCategory(id) {
  return EVENT_CATEGORIES.find((c) => c.id === id) || EVENT_CATEGORIES[0];
}

const THEME_META = [
  {
    id: 'zumrad', name: 'Zumrad', desc: "Zumrad-yashil, oltin bezaklar",
    mi: '#142720', mg: '#c9a24a', categories: ['toy', 'qiz_bazmi']
  },
  {
    id: 'lavanda', name: 'Lavanda', desc: 'Binafsha zamin, rose-gold bezaklar',
    mi: '#241a35', mg: '#b98a52', categories: ['toy', 'qiz_bazmi']
  },
  {
    id: 'shafaq', name: 'Shafaq', desc: 'Anor-qizil zamin, amber bezaklar',
    mi: '#2a1418', mg: '#c98a4a', categories: ['toy', 'qiz_bazmi']
  },
  {
    id: 'bayram', name: 'Bayram', desc: "Yorqin, bayramona ranglar",
    mi: '#34142a', mg: '#e08a3e', categories: ['tugilgan_kun']
  },
  {
    id: 'oltin', name: 'Oltin', desc: 'Krem zamin, nafis oltin bezaklar',
    mi: '#2b2013', mg: '#b8863a', categories: ['tabrik']
  },
  {
    id: 'nur', name: 'Nur', desc: "To'q ko'k zamin, oltin bezaklar",
    mi: '#0f2036', mg: '#c9a24a', categories: ['haj_safari']
  },
  {
    id: 'muhabbat', name: 'Muhabbat', desc: 'Pushti, atirgul-oltin bezaklar',
    mi: '#3a1522', mg: '#c98a94', categories: ['sevgi_izhor']
  },
  {
    id: 'bahor', name: 'Bahor', desc: "Yashil-oq zamin, atirgul bezaklar",
    mi: '#16261a', mg: '#3fae6e', categories: ['nahor_oshi']
  },
  {
    id: 'layli', name: 'Layli', desc: "Krem qog'oz zamin, sham-mum va atirgul-tilla bezaklar",
    mi: '#2a1420', mg: '#c98a6e', categories: ['sevgimga_hat']
  },
  {
    id: 'vau', name: 'Vau ✨', desc: 'Tungi gradient fon, neon-pushti aksentlar',
    mi: '#0F172A', mg: '#FF4D6D', categories: ['sevgi_izhor']
  },
  {
    id: 'zar', name: 'Zar ✨', desc: "To'q ko'k-tillarang, hashamatli oltin bezaklar",
    mi: '#0B1020', mg: '#D4AF37', categories: null
  }
];

function getThemesForCategory(eventTypeId) {
  const themes = THEME_META.filter((t) => t.categories === null || t.categories.includes(eventTypeId));
  return themes.length ? themes : THEME_META.filter((t) => t.categories && t.categories.includes('toy'));
}

const LAYOUT_META = [
  { id: 'nafis', label: 'Klassik zarf', categories: null },
  { id: 'klassik', label: "An'anaviy", categories: null },
  { id: 'zamonaviy', label: 'Zamonaviy', categories: null },
  { id: 'dasturxon', label: 'Dasturxon', categories: ['nahor_oshi'] },
  { id: 'maktub', label: 'Maktub', categories: ['sevgimga_hat'] },
  { id: 'premium', label: 'Premium ✨ Yangi', categories: ['sevgi_izhor'] },
  { id: 'shohona', label: 'Shohona ✨ Yangi', categories: null },
  { id: 'nikoh', label: "Nikoh to'yi (kuyov) ✨ Yangi", categories: ['toy'], requiresBrideName: false, notDefault: true }
];

function getLayoutsForCategory(eventTypeId) {
  return LAYOUT_META.filter((l) => l.categories === null || l.categories.includes(eventTypeId));
}

function getDefaultLayoutForCategory(eventTypeId) {
  const dedicated = LAYOUT_META.find((l) => l.categories && l.categories.includes(eventTypeId) && !l.notDefault);
  return dedicated ? dedicated.id : 'nafis';
}

function layoutRequiresBrideName(layoutId) {
  const l = LAYOUT_META.find((x) => x.id === layoutId);
  return !l || l.requiresBrideName !== false;
}
