const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');

const router = express.Router();

function loadGallery(invitationId) {
  return db
    .prepare('SELECT id, url, caption FROM invitation_gallery WHERE invitation_id = ? ORDER BY sort_order ASC, id ASC')
    .all(invitationId);
}

function buildPublicInvitation(inv) {
  const { user_id, access_password_hash, ...publicInv } = inv;
  publicInv.gallery = loadGallery(inv.id);
  return publicInv;
}

router.get('/:slug', (req, res) => {
  const inv = db.prepare('SELECT * FROM invitations WHERE slug = ?').get(req.params.slug);
  if (!inv) return res.status(404).json({ error: 'Taklifnoma topilmadi' });

  if (inv.expires_at && new Date(inv.expires_at) < new Date()) {
    return res.json({ expired: true });
  }

  if (inv.access_password_hash) {
    return res.json({ locked: true });
  }

  db.prepare('UPDATE invitations SET views = views + 1 WHERE id = ?').run(inv.id);
  const publicInv = buildPublicInvitation(inv);
  publicInv.views = inv.views + 1;
  res.json({ invitation: publicInv });
});

router.post('/:slug/unlock', (req, res) => {
  const inv = db.prepare('SELECT * FROM invitations WHERE slug = ?').get(req.params.slug);
  if (!inv) return res.status(404).json({ error: 'Taklifnoma topilmadi' });

  if (inv.expires_at && new Date(inv.expires_at) < new Date()) {
    return res.json({ expired: true });
  }

  const password = (req.body && req.body.password) || '';
  if (!inv.access_password_hash || !bcrypt.compareSync(password, inv.access_password_hash)) {
    return res.status(401).json({ error: "Parol noto'g'ri" });
  }

  db.prepare('UPDATE invitations SET views = views + 1 WHERE id = ?').run(inv.id);
  const publicInv = buildPublicInvitation(inv);
  publicInv.views = inv.views + 1;
  res.json({ invitation: publicInv });
});

router.post('/contact', (req, res) => {
  const { name, contact, message } = req.body || {};
  const messageText = (message || '').trim().slice(0, 2000);
  if (!messageText) return res.status(400).json({ error: 'Xabar matni kiritilmagan' });
  const nameText = (name || '').trim().slice(0, 120);
  const contactText = (contact || '').trim().slice(0, 120);

  db.prepare(
    `INSERT INTO contact_messages (name, contact, message) VALUES (?, ?, ?)`
  ).run(nameText, contactText, messageText);

  res.status(201).json({ ok: true });
});

router.post('/:slug/rsvp', (req, res) => {
  const inv = db.prepare('SELECT id FROM invitations WHERE slug = ?').get(req.params.slug);
  if (!inv) return res.status(404).json({ error: 'Taklifnoma topilmadi' });

  const { guest_name, attending, guests_count, wish } = req.body || {};
  const name = (guest_name || '').trim().slice(0, 120);
  const att = attending === 'no' ? 'no' : 'yes';
  const count = Math.max(1, Math.min(20, parseInt(guests_count, 10) || 1));
  const wishText = (wish || '').trim().slice(0, 800);

  db.prepare(
    `INSERT INTO rsvps (invitation_id, guest_name, attending, guests_count, wish)
     VALUES (?, ?, ?, ?, ?)`
  ).run(inv.id, name, att, count, wishText);

  res.status(201).json({ ok: true });
});

module.exports = router;
