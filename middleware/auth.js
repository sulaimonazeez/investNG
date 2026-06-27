const { verifyToken } = require('../utils/jwt');
const User = require('../models/User');
const { error } = require('../utils/response');

const authenticate = async (req, res, next) => {
  try {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) return error(res, 'Authentication required.', 401);

    const decoded = verifyToken(auth.split(' ')[1]);
    const user = await User.findById(decoded.userId).select('-passwordHash');

    if (!user) return error(res, 'User not found.', 401);
    if (user.status === 'banned') return error(res, 'Account has been banned.', 403);
    if (user.status === 'suspended') return error(res, 'Account is suspended. Contact support.', 403);

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError') return error(res, 'Invalid token.', 401);
    if (err.name === 'TokenExpiredError') return error(res, 'Session expired. Please log in again.', 401);
    return error(res, 'Authentication failed.', 500);
  }
};

const adminOnly = (req, res, next) => {
  if (req.user?.role !== 'admin') return error(res, 'Admin access required.', 403);
  next();
};

module.exports = { authenticate, adminOnly };
