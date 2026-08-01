const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router({ mergeParams: true });

function loadOwnedInvitation(req, res, next) {
  const row = db.prepare('SELECT id, user_id FROM invitations WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Taklifnoma topilmadi' });
  if (row.user_id !== req.user.id) return res.status(403).json({ error: 'Bu taklifnoma sizga tegishli emas' });
  req.invitationId = row.id;
  next();
}

router.use(requireAuth, loadOwnedInvitation);

router.get('/', (req, res) => {
  const rows = db
    .prepare('SELECT * FROM invitation_gallery WHERE invitation_id = ? ORDER BY sort_order ASC, id ASC')
    .all(req.invitationId);
  res.json({ photos: rows });
});

router.post('/', (req, res) => {
  const url = typeof req.body.url === 'string' ? req.body.url.trim() : '';
  const caption = typeof req.body.caption === 'string' ? req.body.caption.trim().slice(0, 200) : '';
  if (!url) return res.status(400).json({ error: 'Rasm havolasi kiritilmagan' });

  const maxOrder = db
    .prepare('SELECT COALESCE(MAX(sort_order), -1) AS m FROM invitation_gallery WHERE invitation_id = ?')
    .get(req.invitationId).m;

  const info = db
    .prepare('INSERT INTO invitation_gallery (invitation_id, url, caption, sort_order) VALUES (?, ?, ?, ?)')
    .run(req.invitationId, url, caption, maxOrder + 1);
  const row = db.prepare('SELECT * FROM invitation_gallery WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json({ photo: row });
});

function loadOwnedPhoto(req, res, next) {
  const row = db
    .prepare('SELECT * FROM invitation_gallery WHERE id = ? AND invitation_id = ?')
    .get(req.params.photoId, req.invitationId);
  if (!row) return res.status(404).json({ error: 'Rasm topilmadi' });
  req.photo = row;
  next();
}

router.put('/:photoId', loadOwnedPhoto, (req, res) => {
  const caption = typeof req.body.caption === 'string' ? req.body.caption.trim().slice(0, 200) : req.photo.caption;
  const sort_order = Number.isFinite(req.body.sort_order) ? req.body.sort_order : req.photo.sort_order;
  db.prepare('UPDATE invitation_gallery SET caption = ?, sort_order = ? WHERE id = ?').run(caption, sort_order, req.photo.id);
  const row = db.prepare('SELECT * FROM invitation_gallery WHERE id = ?').get(req.photo.id);
  res.json({ photo: row });
});

router.delete('/:photoId', loadOwnedPhoto, (req, res) => {
  db.prepare('DELETE FROM invitation_gallery WHERE id = ?').run(req.photo.id);
  res.json({ ok: true });
});

module.exports = router;
