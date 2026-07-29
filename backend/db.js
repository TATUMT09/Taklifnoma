const path = require('path');
const bcrypt = require('bcryptjs');
const Database = require('better-sqlite3');

const dbPath = path.join(__dirname, 'data', 'app.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT,
    google_id TEXT UNIQUE,
    avatar_url TEXT,
    is_admin INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS invitations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    slug TEXT NOT NULL UNIQUE,
    theme TEXT NOT NULL DEFAULT 'zumrad',
    layout TEXT NOT NULL DEFAULT 'nafis',
    event_type TEXT NOT NULL DEFAULT 'toy',
    groom_name TEXT NOT NULL DEFAULT '',
    bride_name TEXT NOT NULL DEFAULT '',
    family_name TEXT NOT NULL DEFAULT '',
    event_date TEXT,
    event_time TEXT,
    venue_name TEXT NOT NULL DEFAULT '',
    address TEXT NOT NULL DEFAULT '',
    map_link TEXT NOT NULL DEFAULT '',
    telegram_group TEXT NOT NULL DEFAULT '',
    photo_url TEXT NOT NULL DEFAULT '',
    song_url TEXT NOT NULL DEFAULT '',
    custom_message TEXT NOT NULL DEFAULT '',
    language TEXT NOT NULL DEFAULT 'uz',
    views INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS rsvps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invitation_id INTEGER NOT NULL REFERENCES invitations(id) ON DELETE CASCADE,
    guest_name TEXT NOT NULL DEFAULT '',
    attending TEXT NOT NULL DEFAULT 'yes',
    guests_count INTEGER NOT NULL DEFAULT 1,
    wish TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS contact_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL DEFAULT '',
    contact TEXT NOT NULL DEFAULT '',
    message TEXT NOT NULL,
    is_read INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_invitations_user ON invitations(user_id);
  CREATE INDEX IF NOT EXISTS idx_rsvps_invitation ON rsvps(invitation_id);
`);

// Migrate older databases created before Google sign-in was added.
const userColumns = db.prepare("PRAGMA table_info(users)").all().map((c) => c.name);
if (!userColumns.includes('google_id')) {
  db.exec('ALTER TABLE users ADD COLUMN google_id TEXT');
}
if (!userColumns.includes('avatar_url')) {
  db.exec('ALTER TABLE users ADD COLUMN avatar_url TEXT');
}
if (!userColumns.includes('is_admin')) {
  db.exec('ALTER TABLE users ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0');
}

const invitationColumns = db.prepare("PRAGMA table_info(invitations)").all().map((c) => c.name);
if (!invitationColumns.includes('photo_url')) {
  db.exec("ALTER TABLE invitations ADD COLUMN photo_url TEXT NOT NULL DEFAULT ''");
}
if (!invitationColumns.includes('song_url')) {
  db.exec("ALTER TABLE invitations ADD COLUMN song_url TEXT NOT NULL DEFAULT ''");
}
if (!invitationColumns.includes('layout')) {
  db.exec("ALTER TABLE invitations ADD COLUMN layout TEXT NOT NULL DEFAULT 'nafis'");
}
if (!invitationColumns.includes('custom_message')) {
  db.exec("ALTER TABLE invitations ADD COLUMN custom_message TEXT NOT NULL DEFAULT ''");
}

// Seed the admin account on every startup (idempotent), if configured via env.
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
if (ADMIN_EMAIL && ADMIN_PASSWORD) {
  const existingAdmin = db.prepare('SELECT id FROM users WHERE email = ?').get(ADMIN_EMAIL);
  if (existingAdmin) {
    db.prepare('UPDATE users SET is_admin = 1 WHERE id = ?').run(existingAdmin.id);
  } else {
    db.prepare('INSERT INTO users (name, email, password_hash, is_admin) VALUES (?, ?, ?, 1)')
      .run('Admin', ADMIN_EMAIL, bcrypt.hashSync(ADMIN_PASSWORD, 10));
  }
} else {
  console.warn('ADMIN_EMAIL / ADMIN_PASSWORD not set in .env — no admin account seeded.');
}

module.exports = db;
