const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { generateSlug } = require('../utils/slug');

const router = express.Router();

const THEMES = ['zumrad', 'lavanda', 'shafaq', 'bayram', 'oltin', 'nur', 'muhabbat', 'bahor', 'layli'];
const LAYOUTS = ['nafis', 'klassik', 'zamonaviy', 'dasturxon', 'maktub'];
const EVENT_TYPES = ['toy', 'qiz_bazmi', 'tugilgan_kun', 'tabrik', 'haj_safari', 'sevgi_izhor', 'nahor_oshi', 'sevgimga_hat'];
const PAIR_TYPES = ['toy', 'qiz_bazmi', 'sevgi_izhor', 'nahor_oshi', 'sevgimga_hat'];

const FIELDS = [
  'theme', 'layout', 'event_type', 'groom_name', 'bride_name', 'family_name',
  'event_date', 'event_time', 'venue_name', 'address', 'map_link',
  'telegram_group', 'language', 'photo_url', 'song_url', 'custom_message'
];

function sanitize(body) {
  const out = {};
  for (const f of FIELDS) out[f] = typeof body[f] === 'string' ? body[f].trim() : '';
  if (!THEMES.includes(out.theme)) out.theme = 'zumrad';
  if (!LAYOUTS.includes(out.layout)) out.layout = 'nafis';
  if (!EVENT_TYPES.includes(out.event_type)) out.event_type = 'toy';
  if (!out.language) out.language = 'uz';
  return out;
}

function withStats(inv) {
  const rsvpStats = db
    .prepare(
      `SELECT
         COUNT(*) AS total,
         SUM(CASE WHEN attending = 'yes' THEN 1 ELSE 0 END) AS yes,
         SUM(CASE WHEN attending = 'yes' THEN guests_count ELSE 0 END) AS guests,
         SUM(CASE WHEN wish != '' THEN 1 ELSE 0 END) AS wishes
       FROM rsvps WHERE invitation_id = ?`
    )
    .get(inv.id);
  return {
    ...inv,
    stats: {
      views: inv.views,
      responses: rsvpStats.total || 0,
      guests: rsvpStats.guests || 0,
      wishes: rsvpStats.wishes || 0
    }
  };
}

router.get('/', requireAuth, (req, res) => {
  const rows = db
    .prepare('SELECT * FROM invitations WHERE user_id = ? ORDER BY created_at DESC')
    .all(req.user.id);
  res.json({ invitations: rows.map(withStats) });
});

router.post('/', requireAuth, (req, res) => {
  const data = sanitize(req.body || {});
  if (!data.groom_name) {
    return res.status(400).json({ error: 'Ismni kiriting' });
  }
  if (PAIR_TYPES.includes(data.event_type) && !data.bride_name) {
    return res.status(400).json({ error: 'Kuyov va kelin ismini kiriting' });
  }

  let slug;
  for (let i = 0; i < 5; i++) {
    const candidate = generateSlug();
    const exists = db.prepare('SELECT id FROM invitations WHERE slug = ?').get(candidate);
    if (!exists) { slug = candidate; break; }
  }
  if (!slug) return res.status(500).json({ error: "Havola yaratib bo'lmadi, qayta urinib ko'ring" });

  const info = db
    .prepare(
      `INSERT INTO invitations
       (user_id, slug, theme, layout, event_type, groom_name, bride_name, family_name,
        event_date, event_time, venue_name, address, map_link, telegram_group, photo_url, song_url, custom_message, language)
       VALUES (@user_id, @slug, @theme, @layout, @event_type, @groom_name, @bride_name, @family_name,
        @event_date, @event_time, @venue_name, @address, @map_link, @telegram_group, @photo_url, @song_url, @custom_message, @language)`
    )
    .run({ user_id: req.user.id, slug, ...data });

  const row = db.prepare('SELECT * FROM invitations WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json({ invitation: withStats(row) });
});

function loadOwned(req, res, next) {
  const row = db.prepare('SELECT * FROM invitations WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Taklifnoma topilmadi' });
  if (row.user_id !== req.user.id) return res.status(403).json({ error: "Bu taklifnoma sizga tegishli emas" });
  req.invitation = row;
  next();
}

router.get('/:id', requireAuth, loadOwned, (req, res) => {
  res.json({ invitation: withStats(req.invitation) });
});

router.put('/:id', requireAuth, loadOwned, (req, res) => {
  const data = sanitize(req.body || {});
  db.prepare(
    `UPDATE invitations SET
       theme=@theme, layout=@layout, event_type=@event_type, groom_name=@groom_name, bride_name=@bride_name,
       family_name=@family_name, event_date=@event_date, event_time=@event_time,
       venue_name=@venue_name, address=@address, map_link=@map_link,
       telegram_group=@telegram_group, photo_url=@photo_url, song_url=@song_url, custom_message=@custom_message,
       language=@language, updated_at=datetime('now')
     WHERE id=@id`
  ).run({ id: req.invitation.id, ...data });
  const row = db.prepare('SELECT * FROM invitations WHERE id = ?').get(req.invitation.id);
  res.json({ invitation: withStats(row) });
});

router.delete('/:id', requireAuth, loadOwned, (req, res) => {
  db.prepare('DELETE FROM invitations WHERE id = ?').run(req.invitation.id);
  res.json({ ok: true });
});

router.get('/:id/rsvps', requireAuth, loadOwned, (req, res) => {
  const rows = db
    .prepare('SELECT * FROM rsvps WHERE invitation_id = ? ORDER BY created_at DESC')
    .all(req.invitation.id);
  res.json({ rsvps: rows });
});

module.exports = router;
