const jwt = require('jsonwebtoken');
const db = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'taklifnoma-dev-secret-change-me';
const COOKIE_NAME = 'tn_token';

function signToken(user) {
  return jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, {
    expiresIn: '30d'
  });
}

function requireAuth(req, res, next) {
  const token = req.cookies[COOKIE_NAME];
  if (!token) return res.status(401).json({ error: 'Tizimga kirilmagan' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Sessiya muddati tugagan, qayta kiring' });
  }
}

function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    const row = db.prepare('SELECT is_admin FROM users WHERE id = ?').get(req.user.id);
    if (!row || !row.is_admin) return res.status(403).json({ error: 'Ruxsat yo\'q' });
    next();
  });
}

function attachUser(req, res, next) {
  const token = req.cookies[COOKIE_NAME];
  if (token) {
    try {
      req.user = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      req.user = null;
    }
  }
  next();
}

module.exports = { signToken, requireAuth, requireAdmin, attachUser, COOKIE_NAME };
