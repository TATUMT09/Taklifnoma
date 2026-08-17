const crypto = require('crypto');
const express = require('express');
const db = require('../db');

const router = express.Router();

function generateToken() {
  return crypto.randomBytes(6).toString('hex');
}

function normalizePhone(raw) {
  const cleaned = String(raw || '').trim().replace(/[^\d+]/g, '');
  const digits = cleaned.replace(/\D/g, '');
  if (digits.length < 7) return null;
  return cleaned;
}

router.post('/', (req, res) => {
  const { name, phone, note } = req.body || {};
  const cleanName = typeof name === 'string' ? name.trim().slice(0, 80) : '';
  const cleanPhone = normalizePhone(phone);

  if (!cleanName) return res.status(400).json({ error: 'Ismingizni kiriting' });
  if (!cleanPhone) return res.status(400).json({ error: "Telefon raqamini to'g'ri kiriting" });

  let token;
  do { token = generateToken(); } while (db.prepare('SELECT id FROM vizitka_cards WHERE token = ?').get(token));

  db.prepare(`
    INSERT INTO vizitka_cards (token, name, phone, note)
    VALUES (?, ?, ?, ?)
  `).run(
    token,
    cleanName,
    cleanPhone,
    typeof note === 'string' ? note.trim().slice(0, 200) : ''
  );

  res.status(201).json({ token });
});

router.get('/:token', (req, res) => {
  const row = db.prepare('SELECT * FROM vizitka_cards WHERE token = ?').get(req.params.token);
  if (!row) return res.status(404).json({ error: 'Topilmadi' });
  res.json({ name: row.name, phone: row.phone, note: row.note });
});

module.exports = router;
