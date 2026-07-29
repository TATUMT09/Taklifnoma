const express = require('express');
const db = require('../db');

const router = express.Router();

router.get('/:slug', (req, res) => {
  const inv = db.prepare('SELECT * FROM invitations WHERE slug = ?').get(req.params.slug);
  if (!inv) return res.status(404).json({ error: 'Taklifnoma topilmadi' });

  db.prepare('UPDATE invitations SET views = views + 1 WHERE id = ?').run(inv.id);

  const { user_id, ...publicInv } = inv;
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
