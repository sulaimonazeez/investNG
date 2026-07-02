const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  fullName: {
    type: String, required: true, trim: true, minlength: 2, maxlength: 100,
  },
  username: {
    type: String, required: true, unique: true, lowercase: true, trim: true,
    minlength: 3, maxlength: 30, match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers and underscores'],
  },
  phone: {
    type: String, required: true, unique: true, trim: true,
  },
  passwordHash: {
    type: String, required: true, select: false,
  },
  role: {
    type: String, enum: ['user', 'admin'], default: 'user',
  },
  status: {
    type: String, enum: ['active', 'suspended', 'banned'], default: 'active',
  },
  avatarUrl: { type: String, default: null },

  // Referral
  referralCode: { type: String, required: true, unique: true, uppercase: true },
  referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

  // Wallet
  walletBalance:    { type: Number, default: 0, min: 0 },
  totalEarned:      { type: Number, default: 0, min: 0 },
  totalWithdrawn:   { type: Number, default: 0, min: 0 },
  totalDeposited:   { type: Number, default: 0, min: 0 },
  referralEarnings: { type: Number, default: 0, min: 0 },

  lastLoginAt: { type: Date, default: null },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes
userSchema.index({ username: 1 });
userSchema.index({ phone: 1 });
userSchema.index({ referralCode: 1 });
userSchema.index({ referredBy: 1 });
userSchema.index({ createdAt: -1 });

userSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id;
    ret.full_name = ret.fullName;
    ret.avatar_url = ret.avatarUrl;
    ret.referral_code = ret.referralCode;
    ret.referred_by = ret.referredBy;
    ret.wallet_balance = ret.walletBalance;
    ret.total_earned = ret.totalEarned;
    ret.total_withdrawn = ret.totalWithdrawn;
    ret.total_deposited = ret.totalDeposited;
    ret.referral_earnings = ret.referralEarnings;
    ret.last_login_at = ret.lastLoginAt;
    ret.created_at = ret.createdAt;
    ret.updated_at = ret.updatedAt;
    delete ret._id;
    delete ret.__v;
    delete ret.passwordHash;
    return ret;
  },
});

// Instance methods
userSchema.methods.comparePassword = async function (password) {
  return bcrypt.compare(password, this.passwordHash);
};

userSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  return obj;
};

// Static: generate unique referral code
userSchema.statics.generateReferralCode = async function (username) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const prefix = username.substring(0, 2).toUpperCase();
  let code, exists;
  do {
    let suffix = '';
    for (let i = 0; i < 6; i++) suffix += chars[Math.floor(Math.random() * chars.length)];
    code = prefix + suffix;
    exists = await this.findOne({ referralCode: code });
  } while (exists);
  return code;
};

module.exports = mongoose.model('User', userSchema);
