const express = require('express');
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

module.exports = router;
