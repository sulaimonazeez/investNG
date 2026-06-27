const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  user:          { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: {
    type: String,
    enum: ['deposit', 'withdrawal', 'investment', 'profit', 'referral_bonus', 'refund'],
    required: true,
  },
  amount:        { type: Number, required: true },
  balanceBefore: { type: Number, required: true },
  balanceAfter:  { type: Number, required: true },
  description:   { type: String, required: true },
  referenceDoc:  { type: mongoose.Schema.Types.ObjectId, default: null }, // deposit/withdrawal/investment id
  referenceType: { type: String, default: null },
  status:        { type: String, enum: ['pending', 'completed', 'failed'], default: 'completed' },
}, { timestamps: true });

transactionSchema.index({ user: 1, createdAt: -1 });
transactionSchema.index({ user: 1, type: 1 });
transactionSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Transaction', transactionSchema);
