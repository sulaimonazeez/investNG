const mongoose = require('mongoose');

// ─── Bank Account (platform-wide, managed by admin) ───────
const platformSettingsSchema = new mongoose.Schema({
  key:   { type: String, required: true, unique: true },
  value: { type: mongoose.Schema.Types.Mixed, required: true },
  label: { type: String },
  group: { type: String, default: 'general' },
}, { timestamps: true });

platformSettingsSchema.index({ key: 1 });

// ─── Bank Account ─────────────────────────────────────────
const bankAccountSchema = new mongoose.Schema({
  user:          { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  bankName:      { type: String, required: true },
  accountNumber: { type: String, required: true },
  accountName:   { type: String, required: true },
}, { timestamps: true });

bankAccountSchema.index({ user: 1 });

// ─── Announcement ─────────────────────────────────────────
const announcementSchema = new mongoose.Schema({
  title:     { type: String, required: true },
  content:   { type: String, required: true },
  type:      { type: String, enum: ['info', 'success', 'warning', 'danger'], default: 'info' },
  isActive:  { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

announcementSchema.index({ isActive: 1, createdAt: -1 });

// ─── Daily Profit Log ─────────────────────────────────────
const dailyProfitLogSchema = new mongoose.Schema({
  investment: { type: mongoose.Schema.Types.ObjectId, ref: 'UserInvestment', required: true },
  user:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount:     { type: Number, required: true },
  profitDate: { type: Date, required: true },
}, { timestamps: true });

dailyProfitLogSchema.index({ user: 1, profitDate: -1 });
dailyProfitLogSchema.index({ investment: 1, profitDate: 1 }, { unique: true });

// ─── Referral Commission ──────────────────────────────────
const referralCommissionSchema = new mongoose.Schema({
  referrer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  referred: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount:   { type: Number, required: true },
  type:     { type: String, enum: ['registration', 'investment', 'milestone'], default: 'investment' },
  status:   { type: String, enum: ['pending', 'paid'], default: 'paid' },
}, { timestamps: true });

referralCommissionSchema.index({ referrer: 1, createdAt: -1 });

module.exports = {
  PlatformSettings:   mongoose.model('PlatformSettings', platformSettingsSchema),
  BankAccount:        mongoose.model('BankAccount', bankAccountSchema),
  Announcement:       mongoose.model('Announcement', announcementSchema),
  DailyProfitLog:     mongoose.model('DailyProfitLog', dailyProfitLogSchema),
  ReferralCommission: mongoose.model('ReferralCommission', referralCommissionSchema),
};
