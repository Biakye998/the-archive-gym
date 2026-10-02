const jwt = require('jsonwebtoken');
const { pool, auditLog } = require('../database');

const JWT_SECRET = process.env.JWT_SECRET || 'archive-gym-secret-change-in-production';
const JWT_EXPIRES_IN = '24h';

function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

function authRequired(allowedRoles = null) {
  return (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1] || req.cookies?.token;

    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    req.admin = decoded;

    if (allowedRoles && !allowedRoles.includes(decoded.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
}

module.exports = {
  JWT_SECRET,
  JWT_EXPIRES_IN,
  generateToken,
  verifyToken,
  authRequired,
  auditLog
};
