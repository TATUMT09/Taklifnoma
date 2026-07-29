const path = require('path');
const crypto = require('crypto');
const express = require('express');
const multer = require('multer');

const router = express.Router();

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
const ALLOWED_TYPES = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = ALLOWED_TYPES[file.mimetype] || '.jpg';
    cb(null, crypto.randomBytes(12).toString('hex') + ext);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 6 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_TYPES[file.mimetype]) {
      return cb(new Error("Faqat JPG, PNG yoki WEBP rasm yuklash mumkin"));
    }
    cb(null, true);
  }
});

router.post('/', (req, res) => {
  upload.single('photo')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message || "Rasmni yuklab bo'lmadi" });
    if (!req.file) return res.status(400).json({ error: 'Rasm tanlanmadi' });
    res.status(201).json({ url: `/uploads/${req.file.filename}` });
  });
});

const ALLOWED_AUDIO_TYPES = {
  'audio/mpeg': '.mp3',
  'audio/mp3': '.mp3',
  'audio/wav': '.wav',
  'audio/x-wav': '.wav',
  'audio/ogg': '.ogg',
  'audio/mp4': '.m4a',
  'audio/x-m4a': '.m4a',
  'audio/aac': '.aac'
};

const uploadAudio = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => {
      const ext = ALLOWED_AUDIO_TYPES[file.mimetype] || '.mp3';
      cb(null, crypto.randomBytes(12).toString('hex') + ext);
    }
  }),
  limits: { fileSize: 12 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_AUDIO_TYPES[file.mimetype]) {
      return cb(new Error("Faqat MP3, WAV, OGG yoki M4A qo'shiq yuklash mumkin"));
    }
    cb(null, true);
  }
});

router.post('/song', (req, res) => {
  uploadAudio.single('song')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message || "Qo'shiqni yuklab bo'lmadi" });
    if (!req.file) return res.status(400).json({ error: "Qo'shiq tanlanmadi" });
    res.status(201).json({ url: `/uploads/${req.file.filename}` });
  });
});

module.exports = router;
