const UZ_MONTHS = [
  'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
  'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'
];
const UZ_WEEKDAYS_SHORT = ['Ya', 'Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh']; // JS getDay(): 0=Yakshanba
const UZ_WEEKDAYS_MON_FIRST = ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'];

const EVENT_TYPE_LABELS = Object.fromEntries(EVENT_CATEGORIES.map((c) => [c.id, c.label]));
const THEME_LABELS = Object.fromEntries(THEME_META.map((t) => [t.id, t.name]));

function parseEventDate(dateStr, timeStr) {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split('-').map(Number);
  let hh = 0, mm = 0;
  if (timeStr) {
    const parts = timeStr.split(':').map(Number);
    hh = parts[0] || 0; mm = parts[1] || 0;
  }
  return new Date(y, (m || 1) - 1, d || 1, hh, mm, 0);
}

function formatUzDateLong(dateStr) {
  const dt = parseEventDate(dateStr);
  if (!dt) return '';
  const weekday = UZ_WEEKDAYS_SHORT[dt.getDay()];
  const weekdayFull = {
    Ya: 'yakshanba', Du: 'dushanba', Se: 'seshanba', Ch: 'chorshanba',
    Pa: 'payshanba', Ju: 'juma', Sh: 'shanba'
  }[weekday];
  return `${dt.getDate()} – ${UZ_MONTHS[dt.getMonth()]}, ${dt.getFullYear()} · ${weekdayFull}`;
}

function buildCalendarGrid(dateStr) {
  const dt = parseEventDate(dateStr);
  if (!dt) return null;
  const year = dt.getFullYear();
  const month = dt.getMonth();
  const highlightDay = dt.getDate();
  const firstOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // JS getDay(): 0=Sun..6=Sat -> convert to Monday-first index 0..6
  const firstWeekdayMonFirst = (firstOfMonth.getDay() + 6) % 7;

  const cells = [];
  for (let i = 0; i < firstWeekdayMonFirst; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) cells.push(day);
  while (cells.length % 7 !== 0) cells.push(null);

  return {
    monthLabel: `${UZ_MONTHS[month]} ${year}`,
    weekdays: UZ_WEEKDAYS_MON_FIRST,
    cells,
    highlightDay
  };
}
