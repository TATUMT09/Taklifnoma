const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const premiumConfig = require('../config/premium');

const router = express.Router();

function premiumStatusFor(invitationId) {
  const row = db
    .prepare("SELECT status FROM premium_payments WHERE payment_type = 'invitation' AND invitation_id = ? ORDER BY id DESC LIMIT 1")
    .get(invitationId);
  return row ? row.status : 'none';
}

function isUserPremium(userId) {
  const row = db.prepare('SELECT is_premium FROM users WHERE id = ?').get(userId);
  return !!(row && row.is_premium);
}

function needsPayment(inv) {
  if (!premiumConfig.requiresPayment(inv)) return false;
  if (isUserPremium(inv.user_id)) return false;
  return premiumStatusFor(inv.id) !== 'approved';
}

function paywallPayload(inv) {
  return {
    premium_locked: true,
    status: premiumStatusFor(inv.id),
    invitation_id: inv.id,
    amount: premiumConfig.INVITATION_PRICE,
    membership_amount: premiumConfig.MEMBERSHIP_PRICE,
    card_number: premiumConfig.CARD_NUMBER,
    card_holder: premiumConfig.CARD_HOLDER
  };
}

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

router.get('/gallery', (req, res) => {
  const rows = db
    .prepare('SELECT id, url, caption, category FROM site_gallery ORDER BY sort_order ASC, id DESC')
    .all();
  res.json({ photos: rows });
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

router.get('/:slug', (req, res) => {
  const inv = db.prepare('SELECT * FROM invitations WHERE slug = ?').get(req.params.slug);
  if (!inv) return res.status(404).json({ error: 'Taklifnoma topilmadi' });

  if (inv.expires_at && new Date(inv.expires_at) < new Date()) {
    return res.json({ expired: true });
  }

  if (inv.access_password_hash) {
    return res.json({ locked: true });
  }

  if (needsPayment(inv)) {
    return res.json(paywallPayload(inv));
  }

  db.prepare('UPDATE invitations SET views = views + 1 WHERE id = ?').run(inv.id);
  const publicInv = buildPublicInvitation(inv);
  publicInv.views = inv.views + 1;
  res.json({ invitation: publicInv });
});

router.get('/:slug/premium-status', (req, res) => {
  const inv = db.prepare('SELECT id FROM invitations WHERE slug = ?').get(req.params.slug);
  if (!inv) return res.status(404).json({ error: 'Taklifnoma topilmadi' });
  res.json({ status: premiumStatusFor(inv.id) });
});

router.post('/:slug/premium-payment', (req, res) => {
  const inv = db.prepare('SELECT * FROM invitations WHERE slug = ?').get(req.params.slug);
  if (!inv) return res.status(404).json({ error: 'Taklifnoma topilmadi' });
  if (!premiumConfig.requiresPayment(inv)) {
    return res.status(400).json({ error: 'Bu taklifnoma uchun to\'lov talab qilinmaydi' });
  }
  if (!needsPayment(inv)) {
    return res.status(400).json({ error: "Bu taklifnoma allaqachon faollashtirilgan" });
  }
  if (premiumStatusFor(inv.id) === 'pending') {
    return res.status(409).json({ error: "To'lovingiz allaqachon ko'rib chiqilmoqda" });
  }
  const screenshotUrl = typeof req.body.screenshot_url === 'string' ? req.body.screenshot_url.trim() : '';
  if (!screenshotUrl) return res.status(400).json({ error: "To'lov skrinshotini yuklang" });

  db.prepare(
    "INSERT INTO premium_payments (payment_type, invitation_id, amount, screenshot_url, status) VALUES ('invitation', ?, ?, ?, 'pending')"
  ).run(inv.id, premiumConfig.INVITATION_PRICE, screenshotUrl);

  res.status(201).json({ ok: true, status: 'pending' });
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

  if (needsPayment(inv)) {
    return res.json(paywallPayload(inv));
  }

  db.prepare('UPDATE invitations SET views = views + 1 WHERE id = ?').run(inv.id);
  const publicInv = buildPublicInvitation(inv);
  publicInv.views = inv.views + 1;
  res.json({ invitation: publicInv });
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

router.get('/:slug/wishes', (req, res) => {
  const inv = db.prepare('SELECT id FROM invitations WHERE slug = ?').get(req.params.slug);
  if (!inv) return res.status(404).json({ error: 'Taklifnoma topilmadi' });

  const wishes = db
    .prepare(
      `SELECT guest_name, wish FROM rsvps
       WHERE invitation_id = ? AND wish != ''
       ORDER BY created_at DESC LIMIT 50`
    )
    .all(inv.id);
  res.json({ wishes });
});

module.exports = router;
