const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'hiregenius-dev-secret-change-me';
const GUEST_USER = { id: 'guest', name: 'Guest User', email: 'guest@example.com' };

function authRequired(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    req.user = GUEST_USER;
    return next();
  }

  if (token === 'guest-token') {
    req.user = GUEST_USER;
    return next();
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

module.exports = { authRequired, JWT_SECRET };
