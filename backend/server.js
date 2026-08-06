const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cookieParser = require('cookie-parser');

const db = require('./db');
const authRoutes = require('./routes/auth');
const googleAuthRoutes = require('./routes/googleAuth');
const invitationRoutes = require('./routes/invitations');
const publicRoutes = require('./routes/public');
const adminRoutes = require('./routes/admin');
const uploadRoutes = require('./routes/uploads');
const geocodeRoutes = require('./routes/geocode');
const galleryRoutes = require('./routes/gallery');
const qrMemoryRoutes = require('./routes/qrMemory');

const app = express();
const PORT = process.env.PORT || 3001;
const FRONTEND_DIR = path.join(__dirname, '..', 'frontend');
const UPLOAD_DIR = path.join(__dirname, 'uploads');

app.use(express.json());
app.use(cookieParser());

app.use('/api/auth', authRoutes);
app.use('/api/auth', googleAuthRoutes);
app.use('/api/invitations', invitationRoutes);
app.use('/api/invitations/:id/gallery', galleryRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/geocode', geocodeRoutes);
app.use('/api/qr-memory', qrMemoryRoutes);

app.use('/uploads', express.static(UPLOAD_DIR));
app.use(express.static(FRONTEND_DIR));

// Clean URLs for multi-page frontend (no build step, no client router)
const pages = ['login', 'register', 'dashboard', 'create', 'edit', 'admin', 'contact', 'preview', 'qr-tool'];
pages.forEach((p) => {
  app.get(`/${p}`, (req, res) => res.sendFile(path.join(FRONTEND_DIR, `${p}.html`)));
});

// Public invitation page: /i/:slug -> static shell (client-side fetches the full data),
// but with server-rendered Open Graph tags so link previews (Telegram, etc.) show
// the couple's name/photo — those scrapers don't run JavaScript.
const INVITE_TEMPLATE = fs.readFileSync(path.join(FRONTEND_DIR, 'i.html'), 'utf8');

function escapeHtmlAttr(str) {
  return String(str || '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

app.get('/i/:slug', (req, res) => {
  const inv = db.prepare('SELECT * FROM invitations WHERE slug = ?').get(req.params.slug);
  if (!inv) return res.send(INVITE_TEMPLATE);

  const origin = `${req.protocol}://${req.get('host')}`;
  const pageUrl = `${origin}/i/${inv.slug}`;
  const resolveImage = (url) => (url && url.startsWith('http') ? url : url ? `${origin}${url}` : '');

  let title, description, imageUrl;
  if (inv.access_password_hash) {
    title = 'Senga maxsus bir xat bor 💌 — Taklifnoma';
    description = "Buni ochish uchun parol kerak.";
    imageUrl = `${origin}/assets/images/hero/hero-1.jpg`;
  } else {
    const names = inv.bride_name ? `${inv.groom_name} & ${inv.bride_name}` : inv.groom_name;
    title = inv.seo_title || `${names} — Taklifnoma`;
    description = inv.seo_description
      || inv.custom_message
      || [inv.venue_name, inv.address].filter(Boolean).join(', ')
      || "Sizni ushbu maxsus kunga taklif qilamiz";
    imageUrl = resolveImage(inv.og_image_url) || resolveImage(inv.photo_url) || `${origin}/assets/images/hero/hero-1.jpg`;
  }

  const ogTags = `<title>${escapeHtmlAttr(title)}</title>
<meta property="og:type" content="website" />
<meta property="og:title" content="${escapeHtmlAttr(title)}" />
<meta property="og:description" content="${escapeHtmlAttr(description)}" />
<meta property="og:image" content="${escapeHtmlAttr(imageUrl)}" />
<meta property="og:url" content="${escapeHtmlAttr(pageUrl)}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${escapeHtmlAttr(title)}" />
<meta name="twitter:description" content="${escapeHtmlAttr(description)}" />
<meta name="twitter:image" content="${escapeHtmlAttr(imageUrl)}" />`;

  res.send(INVITE_TEMPLATE.replace('<title>Taklifnoma</title>', ogTags));
});

app.get('/xotira/:token', (req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, 'memory.html'));
});

app.use((req, res) => {
  res.status(404).sendFile(path.join(FRONTEND_DIR, '404.html'));
});

app.listen(PORT, () => {
  console.log(`Taklifnoma serveri ishga tushdi: http://localhost:${PORT}`);
});
