const jwt = require('jsonwebtoken');

const generateToken = (payload, expiresIn = process.env.JWT_EXPIRES_IN || '7d') =>
  jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });

const verifyToken = (token) =>
  jwt.verify(token, process.env.JWT_SECRET);

const generateReference = (prefix = 'REF') => {
  const ts = Date.now().toString(36).toUpperCase();
  const rnd = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${ts}-${rnd}`;
};

module.exports = { generateToken, verifyToken, generateReference };
