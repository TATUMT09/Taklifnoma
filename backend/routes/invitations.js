const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { generateSlug } = require('../utils/slug');

const router = express.Router();

const THEMES = ['zumrad', 'lavanda', 'shafaq', 'bayram', 'oltin', 'nur', 'muhabbat', 'bahor', 'layli', 'vau', 'zar'];
const LAYOUTS = ['nafis', 'klassik', 'zamonaviy', 'dasturxon', 'maktub', 'premium', 'shohona', 'nikoh', 'marosim'];
const EVENT_TYPES = ['toy', 'qiz_bazmi', 'tugilgan_kun', 'tabrik', 'haj_safari', 'sevgi_izhor', 'nahor_oshi', 'sevgimga_hat'];
const SLUG_RE = /^[a-z0-9-]{3,40}$/;

const FIELDS = [
  'theme', 'layout', 'event_type', 'groom_name', 'bride_name', 'family_name',
  'event_date', 'event_time', 'venue_name', 'address', 'map_link',
  'telegram_group', 'language', 'photo_url', 'song_url', 'video_url', 'custom_message',
  'seo_title', 'seo_description', 'og_image_url', 'gift_card_number', 'gift_note'
];

function sanitize(body) {
  const out = {};
  for (const f of FIELDS) out[f] = typeof body[f] === 'string' ? body[f].trim() : '';
  if (!THEMES.includes(out.theme)) out.theme = 'zumrad';
  if (!LAYOUTS.includes(out.layout)) out.layout = 'nafis';
  if (!EVENT_TYPES.includes(out.event_type)) out.event_type = 'toy';
  if (!out.language) out.language = 'uz';

  out.expires_at = /^\d{4}-\d{2}-\d{2}$/.test(body.expires_at) ? body.expires_at : null;
  out.rsvp_enabled = body.rsvp_enabled ? 1 : 0;

  out.premium_style = '';
  if (typeof body.premium_style === 'string' && body.premium_style.trim()) {
    try {
      const parsed = JSON.parse(body.premium_style);
      if (parsed && typeof parsed === 'object') out.premium_style = JSON.stringify(parsed).slice(0, 2000);
    } catch (e) { /* invalid JSON from client is ignored, falls back to layout defaults */ }
  }

  return out;
}

function sanitizeSlug(raw) {
  return String(raw || '')
    .trim().toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
}

function resolvePasswordHash(body, existingHash) {
  if (body.clear_password) return null;
  if (typeof body.access_password === 'string' && body.access_password.trim()) {
    return bcrypt.hashSync(body.access_password.trim(), 10);
  }
  return existingHash != null ? existingHash : null;
}

function omitHash(inv) {
  const { access_password_hash, ...rest } = inv;
  return { ...rest, has_password: !!access_password_hash };
}

function syncGallery(invitationId, gallery) {
  if (!Array.isArray(gallery)) return;
  db.prepare('DELETE FROM invitation_gallery WHERE invitation_id = ?').run(invitationId);
  const insert = db.prepare(
    'INSERT INTO invitation_gallery (invitation_id, url, caption, sort_order) VALUES (?, ?, ?, ?)'
  );
  gallery.slice(0, 20).forEach((item, i) => {
    const url = item && typeof item.url === 'string' ? item.url.trim() : '';
    if (!url) return;
    const caption = item && typeof item.caption === 'string' ? item.caption.trim().slice(0, 200) : '';
    insert.run(invitationId, url, caption, i);
  });
}

function loadGalleryFor(invitationId) {
  return db
    .prepare('SELECT id, url, caption FROM invitation_gallery WHERE invitation_id = ? ORDER BY sort_order ASC, id ASC')
    .all(invitationId);
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
    ...omitHash(inv),
    gallery: loadGalleryFor(inv.id),
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

router.get('/check-slug', requireAuth, (req, res) => {
  const slug = sanitizeSlug(req.query.slug);
  if (!SLUG_RE.test(slug)) return res.json({ available: false });
  const excludeId = Number(req.query.excludeId) || 0;
  const row = db.prepare('SELECT id FROM invitations WHERE slug = ?').get(slug);
  res.json({ available: !row || row.id === excludeId });
});

router.post('/', requireAuth, (req, res) => {
  const data = sanitize(req.body || {});
  if (!data.groom_name) {
    return res.status(400).json({ error: 'Ismni kiriting' });
  }

  let slug;
  const customSlug = sanitizeSlug(req.body && req.body.slug);
  if (customSlug) {
    if (!SLUG_RE.test(customSlug)) {
      return res.status(400).json({ error: 'Havola kamida 3, ko\'pi bilan 40 belgidan iborat bo\'lsin' });
    }
    if (db.prepare('SELECT id FROM invitations WHERE slug = ?').get(customSlug)) {
      return res.status(409).json({ error: 'Bu havola band, boshqasini tanlang' });
    }
    slug = customSlug;
  } else {
    for (let i = 0; i < 5; i++) {
      const candidate = generateSlug();
      const exists = db.prepare('SELECT id FROM invitations WHERE slug = ?').get(candidate);
      if (!exists) { slug = candidate; break; }
    }
  }
  if (!slug) return res.status(500).json({ error: "Havola yaratib bo'lmadi, qayta urinib ko'ring" });

  const access_password_hash = resolvePasswordHash(req.body || {}, null);

  const info = db
    .prepare(
      `INSERT INTO invitations
       (user_id, slug, theme, layout, event_type, groom_name, bride_name, family_name,
        event_date, event_time, venue_name, address, map_link, telegram_group, photo_url, song_url,
        video_url, custom_message, language, expires_at, seo_title, seo_description, og_image_url,
        premium_style, access_password_hash, rsvp_enabled, gift_card_number, gift_note)
       VALUES (@user_id, @slug, @theme, @layout, @event_type, @groom_name, @bride_name, @family_name,
        @event_date, @event_time, @venue_name, @address, @map_link, @telegram_group, @photo_url, @song_url,
        @video_url, @custom_message, @language, @expires_at, @seo_title, @seo_description, @og_image_url,
        @premium_style, @access_password_hash, @rsvp_enabled, @gift_card_number, @gift_note)`
    )
    .run({ user_id: req.user.id, slug, ...data, access_password_hash });

  syncGallery(info.lastInsertRowid, req.body && req.body.gallery);

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

  let slug = req.invitation.slug;
  const customSlug = sanitizeSlug(req.body && req.body.slug);
  if (customSlug && customSlug !== slug) {
    if (!SLUG_RE.test(customSlug)) {
      return res.status(400).json({ error: 'Havola kamida 3, ko\'pi bilan 40 belgidan iborat bo\'lsin' });
    }
    if (db.prepare('SELECT id FROM invitations WHERE slug = ? AND id != ?').get(customSlug, req.invitation.id)) {
      return res.status(409).json({ error: 'Bu havola band, boshqasini tanlang' });
    }
    slug = customSlug;
  }

  const access_password_hash = resolvePasswordHash(req.body || {}, req.invitation.access_password_hash);

  db.prepare(
    `UPDATE invitations SET
       slug=@slug, theme=@theme, layout=@layout, event_type=@event_type, groom_name=@groom_name, bride_name=@bride_name,
       family_name=@family_name, event_date=@event_date, event_time=@event_time,
       venue_name=@venue_name, address=@address, map_link=@map_link,
       telegram_group=@telegram_group, photo_url=@photo_url, song_url=@song_url, video_url=@video_url,
       custom_message=@custom_message, language=@language, expires_at=@expires_at,
       seo_title=@seo_title, seo_description=@seo_description, og_image_url=@og_image_url,
       premium_style=@premium_style, access_password_hash=@access_password_hash,
       rsvp_enabled=@rsvp_enabled, gift_card_number=@gift_card_number, gift_note=@gift_note,
       updated_at=datetime('now')
     WHERE id=@id`
  ).run({ id: req.invitation.id, slug, ...data, access_password_hash });

  if (req.body && Array.isArray(req.body.gallery)) syncGallery(req.invitation.id, req.body.gallery);

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
