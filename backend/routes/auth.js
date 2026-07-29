const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { signToken, requireAuth, COOKIE_NAME } = require('../middleware/auth');

const router = express.Router();

const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: 'lax',
  maxAge: 30 * 24 * 60 * 60 * 1000
};

router.post('/register', (req, res) => {
  const { name, email, password } = req.body || {};

  if (!name || !name.trim()) return res.status(400).json({ error: "Ismingizni kiriting" });
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: "To'g'ri email kiriting" });
  if (!password || password.length < 6) return res.status(400).json({ error: "Parol kamida 6 belgidan iborat bo'lsin" });

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase().trim());
  if (existing) return res.status(409).json({ error: "Bu email bilan foydalanuvchi allaqachon mavjud" });

  const passwordHash = bcrypt.hashSync(password, 10);
  const info = db
    .prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)')
    .run(name.trim(), email.toLowerCase().trim(), passwordHash);

  const user = { id: info.lastInsertRowid, name: name.trim(), email: email.toLowerCase().trim() };
  const token = signToken(user);
  res.cookie(COOKIE_NAME, token, COOKIE_OPTS);
  res.status(201).json({ user });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email va parolni kiriting' });

  const row = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim());
  if (!row) return res.status(401).json({ error: "Email yoki parol noto'g'ri" });
  if (!row.password_hash) {
    return res.status(401).json({ error: 'Bu akkaunt Google orqali ochilgan. "Google bilan kirish" tugmasidan foydalaning.' });
  }
  if (!bcrypt.compareSync(password, row.password_hash)) {
    return res.status(401).json({ error: "Email yoki parol noto'g'ri" });
  }

  const user = { id: row.id, name: row.name, email: row.email };
  const token = signToken(user);
  res.cookie(COOKIE_NAME, token, COOKIE_OPTS);
  res.json({ user });
});

router.post('/logout', (req, res) => {
  res.clearCookie(COOKIE_NAME);
  res.json({ ok: true });
});

router.get('/me', requireAuth, (req, res) => {
  const row = db.prepare('SELECT id, name, email, is_admin FROM users WHERE id = ?').get(req.user.id);
  if (!row) return res.status(401).json({ error: 'Sessiya muddati tugagan, qayta kiring' });
  res.json({ user: { id: row.id, name: row.name, email: row.email, isAdmin: !!row.is_admin } });
});

module.exports = router;
