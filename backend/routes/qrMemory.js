const crypto = require('crypto');
const express = require('express');
const db = require('../db');

const router = express.Router();

function generateToken() {
  return crypto.randomBytes(6).toString('hex');
}

router.post('/', (req, res) => {
  const { cover_url, video_url, photos, song_url } = req.body || {};

  if (!cover_url || typeof cover_url !== 'string') {
    return res.status(400).json({ error: 'Asosiy rasm kerak' });
  }

  const hasVideo = typeof video_url === 'string' && video_url;
  const photoList = Array.isArray(photos) ? photos.filter((p) => typeof p === 'string' && p).slice(0, 10) : [];

  if (!hasVideo && photoList.length === 0) {
    return res.status(400).json({ error: 'Video yoki kamida bitta rasm kerak' });
  }

  let token;
  do { token = generateToken(); } while (db.prepare('SELECT id FROM qr_memories WHERE token = ?').get(token));

  db.prepare(`
    INSERT INTO qr_memories (token, cover_url, video_url, photos, song_url)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    token,
    cover_url,
    hasVideo ? video_url : '',
    JSON.stringify(hasVideo ? [] : photoList),
    typeof song_url === 'string' ? song_url : ''
  );

  res.status(201).json({ token });
});

router.get('/:token', (req, res) => {
  const row = db.prepare('SELECT * FROM qr_memories WHERE token = ?').get(req.params.token);
  if (!row) return res.status(404).json({ error: 'Topilmadi' });
  res.json({
    cover_url: row.cover_url,
    video_url: row.video_url,
    photos: JSON.parse(row.photos || '[]'),
    song_url: row.song_url
  });
});

module.exports = router;
