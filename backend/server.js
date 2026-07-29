const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cookieParser = require('cookie-parser');

const authRoutes = require('./routes/auth');
const googleAuthRoutes = require('./routes/googleAuth');
const invitationRoutes = require('./routes/invitations');
const publicRoutes = require('./routes/public');
const adminRoutes = require('./routes/admin');
const uploadRoutes = require('./routes/uploads');
const geocodeRoutes = require('./routes/geocode');

const app = express();
const PORT = process.env.PORT || 3001;
const FRONTEND_DIR = path.join(__dirname, '..', 'frontend');
const UPLOAD_DIR = path.join(__dirname, 'uploads');

app.use(express.json());
app.use(cookieParser());

app.use('/api/auth', authRoutes);
app.use('/api/auth', googleAuthRoutes);
app.use('/api/invitations', invitationRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/geocode', geocodeRoutes);

app.use('/uploads', express.static(UPLOAD_DIR));
app.use(express.static(FRONTEND_DIR));

// Clean URLs for multi-page frontend (no build step, no client router)
const pages = ['login', 'register', 'dashboard', 'create', 'edit', 'admin', 'contact', 'preview'];
pages.forEach((p) => {
  app.get(`/${p}`, (req, res) => res.sendFile(path.join(FRONTEND_DIR, `${p}.html`)));
});

// Public invitation page: /i/:slug -> static shell that fetches data client-side
app.get('/i/:slug', (req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, 'i.html'));
});

app.use((req, res) => {
  res.status(404).sendFile(path.join(FRONTEND_DIR, '404.html'));
});

app.listen(PORT, () => {
  console.log(`Taklifnoma serveri ishga tushdi: http://localhost:${PORT}`);
});
