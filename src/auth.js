const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

function registerUser(db, { email, password, role }) {
  const rounds = Number(process.env.BCRYPT_ROUNDS || 10);
  const hash = bcrypt.hashSync(password, rounds);
  const userRole = role === 'admin' ? 'admin' : 'user';
  const result = db
    .prepare('INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)')
    .run(email, hash, userRole);
  return { id: result.lastInsertRowid, email, role: userRole };
}

function loginUser(db, { email, password }) {
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) return null;
  if (!bcrypt.compareSync(password, user.password_hash)) return null;
  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
  return { token, user: { id: user.id, email: user.email, role: user.role } };
}

function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'missing token' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    return next();
  } catch {
    return res.status(401).json({ error: 'invalid token' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'forbidden' });
    }
    return next();
  };
}

module.exports = { registerUser, loginUser, authMiddleware, requireRole };
