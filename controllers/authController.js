const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { generateToken } = require('../utils/jwt');
const { success, error } = require('../utils/response');

// POST /api/auth/register
const register = async (req, res) => {
  try {
    const { full_name, username, phone, password, referral_code } = req.body;

    // Uniqueness checks
    const existingUsername = await User.findOne({ username: username.toLowerCase() });
    if (existingUsername) return error(res, 'Username already taken. Choose another.', 409);

    const existingPhone = await User.findOne({ phone });
    if (existingPhone) return error(res, 'Phone number already registered.', 409);

    // Resolve referrer
    let referredBy = null;
    if (referral_code) {
      const referrer = await User.findOne({ referralCode: referral_code.toUpperCase() });
      if (referrer) referredBy = referrer._id;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const referralCode = await User.generateReferralCode(username);

    const user = await User.create({
      fullName: full_name.trim(),
      username: username.toLowerCase(),
      phone,
      passwordHash,
      referralCode,
      referredBy,
    });

    const token = generateToken({ userId: user._id, role: user.role });

    return success(res, { token, user: user.toSafeObject() },
      'Account created successfully! Welcome to InvestNaija.', 201);
  } catch (err) {
    console.error('Register error:', err);
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern)[0];
      return error(res, `${field === 'username' ? 'Username' : 'Phone'} already exists.`, 409);
    }
    return error(res, 'Registration failed. Please try again.', 500);
  }
};

// POST /api/auth/login
const login = async (req, res) => {
  try {
    const { identifier, password } = req.body;
    const isPhone = /^[0-9+]/.test(identifier);

    const user = await User.findOne(
      isPhone ? { phone: identifier } : { username: identifier.toLowerCase() }
    ).select('+passwordHash');

    if (!user) return error(res, 'Invalid credentials. Check your username/phone and password.', 401);
    if (user.status === 'banned')     return error(res, 'Your account has been permanently banned.', 403);
    if (user.status === 'suspended')  return error(res, 'Your account is suspended. Contact support.', 403);

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return error(res, 'Invalid credentials. Check your username/phone and password.', 401);

    user.lastLoginAt = new Date();
    await user.save();

    const token = generateToken({ userId: user._id, role: user.role });

    return success(res, { token, user: user.toSafeObject() },
      `Welcome back, ${user.fullName.split(' ')[0]}!`);
  } catch (err) {
    console.error('Login error:', err);
    return error(res, 'Login failed. Please try again.', 500);
  }
};

// GET /api/auth/me
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('referredBy', 'username fullName');
    return success(res, user.toSafeObject());
  } catch (err) {
    return error(res, 'Failed to fetch profile.', 500);
  }
};

// PUT /api/auth/change-password
const changePassword = async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    const user = await User.findById(req.user._id).select('+passwordHash');
    const isMatch = await user.comparePassword(current_password);
    if (!isMatch) return error(res, 'Current password is incorrect.', 400);

    user.passwordHash = await bcrypt.hash(new_password, 12);
    await user.save();
    return success(res, {}, 'Password changed successfully.');
  } catch (err) {
    return error(res, 'Failed to change password.', 500);
  }
};

module.exports = { register, login, getMe, changePassword };
