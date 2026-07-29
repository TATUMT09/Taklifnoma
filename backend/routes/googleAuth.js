const express = require('express');
const crypto = require('crypto');
const db = require('../db');
const { signToken, COOKIE_NAME } = require('../middleware/auth');

const router = express.Router();

const STATE_COOKIE = 'tn_oauth_state';
const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: 'lax',
  maxAge: 30 * 24 * 60 * 60 * 1000
};

function isConfigured() {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

function redirectUriFor(req) {
  return process.env.GOOGLE_REDIRECT_URI || `${req.protocol}://${req.get('host')}/api/auth/google/callback`;
}

router.get('/google', (req, res) => {
  if (!isConfigured()) {
    return res.redirect('/login?error=google_not_configured');
  }

  const state = crypto.randomBytes(16).toString('hex');
  res.cookie(STATE_COOKIE, state, { httpOnly: true, sameSite: 'lax', maxAge: 5 * 60 * 1000 });

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUriFor(req),
    response_type: 'code',
    scope: 'openid email profile',
    state,
    prompt: 'select_account'
  });

  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
});

router.get('/google/callback', async (req, res) => {
  if (!isConfigured()) {
    return res.redirect('/login?error=google_not_configured');
  }

  const { code, state, error } = req.query;
  const expectedState = req.cookies[STATE_COOKIE];
  res.clearCookie(STATE_COOKIE);

  if (error || !code || !state || state !== expectedState) {
    return res.redirect('/login?error=google_failed');
  }

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUriFor(req),
        grant_type: 'authorization_code'
      })
    });
    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      return res.redirect('/login?error=google_failed');
    }

    const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });
    const profile = await profileRes.json();
    if (!profileRes.ok || !profile.sub || !profile.email) {
      return res.redirect('/login?error=google_failed');
    }

    const email = profile.email.toLowerCase().trim();
    const name = profile.name || email.split('@')[0];

    let row = db.prepare('SELECT * FROM users WHERE google_id = ?').get(profile.sub);
    if (!row) {
      row = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
      if (row) {
        db.prepare('UPDATE users SET google_id = ?, avatar_url = ? WHERE id = ?')
          .run(profile.sub, profile.picture || null, row.id);
      } else {
        const info = db
          .prepare('INSERT INTO users (name, email, google_id, avatar_url) VALUES (?, ?, ?, ?)')
          .run(name, email, profile.sub, profile.picture || null);
        row = { id: info.lastInsertRowid, name, email };
      }
    }

    const user = { id: row.id, name: row.name, email: row.email };
    const token = signToken(user);
    res.cookie(COOKIE_NAME, token, COOKIE_OPTS);
    res.redirect('/dashboard');
  } catch (e) {
    res.redirect('/login?error=google_failed');
  }
});

module.exports = router;
