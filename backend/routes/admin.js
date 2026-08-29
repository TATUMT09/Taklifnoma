const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.use(requireAdmin);

router.get('/stats', (req, res) => {
  const users = db.prepare('SELECT COUNT(*) c FROM users').get().c;
  const invitations = db.prepare('SELECT COUNT(*) c FROM invitations').get().c;
  const rsvps = db.prepare('SELECT COUNT(*) c FROM rsvps').get().c;
  const views = db.prepare('SELECT COALESCE(SUM(views), 0) c FROM invitations').get().c;
  const unreadMessages = db.prepare('SELECT COUNT(*) c FROM contact_messages WHERE is_read = 0').get().c;
  res.json({ stats: { users, invitations, rsvps, views, unreadMessages } });
});

router.get('/users', (req, res) => {
  const rows = db
    .prepare(
      `SELECT u.id, u.name, u.email, u.is_admin, u.created_at,
              COUNT(i.id) AS invitation_count
       FROM users u
       LEFT JOIN invitations i ON i.user_id = u.id
       GROUP BY u.id
       ORDER BY u.created_at DESC`
    )
    .all();
  res.json({ users: rows.map((r) => ({ ...r, is_admin: !!r.is_admin })) });
});

router.post('/users/:id/password', (req, res) => {
  const id = Number(req.params.id);
  const { password } = req.body || {};
  if (!password || password.length < 6) {
    return res.status(400).json({ error: "Parol kamida 6 belgidan iborat bo'lsin" });
  }
  const row = db.prepare('SELECT id FROM users WHERE id = ?').get(id);
  if (!row) return res.status(404).json({ error: 'Foydalanuvchi topilmadi' });
  const passwordHash = bcrypt.hashSync(password, 10);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, id);
  res.json({ ok: true });
});

router.delete('/users/:id', (req, res) => {
  const id = Number(req.params.id);
  if (id === req.user.id) return res.status(400).json({ error: "O'zingizni o'chira olmaysiz" });
  const row = db.prepare('SELECT id, is_admin FROM users WHERE id = ?').get(id);
  if (!row) return res.status(404).json({ error: 'Foydalanuvchi topilmadi' });
  db.prepare('DELETE FROM users WHERE id = ?').run(id);
  res.json({ ok: true });
});

router.get('/messages', (req, res) => {
  const rows = db.prepare('SELECT * FROM contact_messages ORDER BY created_at DESC').all();
  res.json({ messages: rows.map((r) => ({ ...r, is_read: !!r.is_read })) });
});

router.post('/messages/:id/read', (req, res) => {
  const row = db.prepare('SELECT id FROM contact_messages WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Xabar topilmadi' });
  db.prepare('UPDATE contact_messages SET is_read = 1 WHERE id = ?').run(row.id);
  res.json({ ok: true });
});

router.delete('/messages/:id', (req, res) => {
  const row = db.prepare('SELECT id FROM contact_messages WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Xabar topilmadi' });
  db.prepare('DELETE FROM contact_messages WHERE id = ?').run(row.id);
  res.json({ ok: true });
});

router.get('/invitations', (req, res) => {
  const rows = db
    .prepare(
      `SELECT i.*, u.name AS owner_name, u.email AS owner_email,
              (SELECT COUNT(*) FROM rsvps r WHERE r.invitation_id = i.id) AS responses
       FROM invitations i
       JOIN users u ON u.id = i.user_id
       ORDER BY i.created_at DESC`
    )
    .all();
  res.json({ invitations: rows });
});

router.delete('/invitations/:id', (req, res) => {
  const row = db.prepare('SELECT id FROM invitations WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Taklifnoma topilmadi' });
  db.prepare('DELETE FROM invitations WHERE id = ?').run(row.id);
  res.json({ ok: true });
});

router.get('/premium-payments', (req, res) => {
  const rows = db
    .prepare(
      `SELECT p.*,
              i.slug, i.groom_name, i.bride_name, i.event_type, i.layout,
              COALESCE(iu.name, mu.name) AS owner_name,
              COALESCE(iu.email, mu.email) AS owner_email
       FROM premium_payments p
       LEFT JOIN invitations i ON i.id = p.invitation_id
       LEFT JOIN users iu ON iu.id = i.user_id
       LEFT JOIN users mu ON mu.id = p.user_id
       ORDER BY p.created_at DESC`
    )
    .all();
  res.json({ payments: rows });
});

router.post('/premium-payments/:id/approve', (req, res) => {
  const row = db.prepare('SELECT * FROM premium_payments WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: "To'lov topilmadi" });
  db.prepare("UPDATE premium_payments SET status = 'approved', reviewed_at = datetime('now') WHERE id = ?").run(row.id);
  if (row.payment_type === 'membership' && row.user_id) {
    db.prepare('UPDATE users SET is_premium = 1 WHERE id = ?').run(row.user_id);
  }
  res.json({ ok: true });
});

router.post('/premium-payments/:id/reject', (req, res) => {
  const row = db.prepare('SELECT * FROM premium_payments WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: "To'lov topilmadi" });
  db.prepare("UPDATE premium_payments SET status = 'rejected', reviewed_at = datetime('now') WHERE id = ?").run(row.id);
  res.json({ ok: true });
});

router.get('/gallery', (req, res) => {
  const rows = db.prepare('SELECT * FROM site_gallery ORDER BY sort_order ASC, id DESC').all();
  res.json({ photos: rows });
});

const GALLERY_CATEGORIES = ['toy', 'juftlik', 'oila'];

router.post('/gallery', (req, res) => {
  const url = typeof req.body.url === 'string' ? req.body.url.trim() : '';
  const caption = typeof req.body.caption === 'string' ? req.body.caption.trim().slice(0, 200) : '';
  const category = GALLERY_CATEGORIES.includes(req.body.category) ? req.body.category : 'toy';
  if (!url) return res.status(400).json({ error: 'Rasm havolasi kiritilmagan' });

  const maxOrder = db.prepare('SELECT COALESCE(MAX(sort_order), -1) AS m FROM site_gallery').get().m;
  const info = db
    .prepare('INSERT INTO site_gallery (url, caption, category, sort_order) VALUES (?, ?, ?, ?)')
    .run(url, caption, category, maxOrder + 1);
  const row = db.prepare('SELECT * FROM site_gallery WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json({ photo: row });
});

router.delete('/gallery/:id', (req, res) => {
  const row = db.prepare('SELECT id FROM site_gallery WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Rasm topilmadi' });
  db.prepare('DELETE FROM site_gallery WHERE id = ?').run(row.id);
  res.json({ ok: true });
});

module.exports = router;
