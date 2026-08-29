const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const premiumConfig = require('../config/premium');

const router = express.Router();

function membershipStatusFor(userId) {
  const row = db
    .prepare("SELECT status FROM premium_payments WHERE payment_type = 'membership' AND user_id = ? ORDER BY id DESC LIMIT 1")
    .get(userId);
  return row ? row.status : 'none';
}

router.get('/status', requireAuth, (req, res) => {
  const user = db.prepare('SELECT is_premium FROM users WHERE id = ?').get(req.user.id);
  res.json({
    is_premium: !!(user && user.is_premium),
    status: membershipStatusFor(req.user.id),
    amount: premiumConfig.MEMBERSHIP_PRICE,
    card_number: premiumConfig.CARD_NUMBER,
    card_holder: premiumConfig.CARD_HOLDER
  });
});

router.post('/membership-payment', requireAuth, (req, res) => {
  const user = db.prepare('SELECT is_premium FROM users WHERE id = ?').get(req.user.id);
  if (user && user.is_premium) {
    return res.status(400).json({ error: 'Siz allaqachon Premium a\'zosiz' });
  }
  if (membershipStatusFor(req.user.id) === 'pending') {
    return res.status(409).json({ error: "To'lovingiz allaqachon ko'rib chiqilmoqda" });
  }
  const screenshotUrl = typeof req.body.screenshot_url === 'string' ? req.body.screenshot_url.trim() : '';
  if (!screenshotUrl) return res.status(400).json({ error: "To'lov skrinshotini yuklang" });

  db.prepare(
    "INSERT INTO premium_payments (payment_type, user_id, amount, screenshot_url, status) VALUES ('membership', ?, ?, ?, 'pending')"
  ).run(req.user.id, premiumConfig.MEMBERSHIP_PRICE, screenshotUrl);

  res.status(201).json({ ok: true, status: 'pending' });
});

module.exports = router;
