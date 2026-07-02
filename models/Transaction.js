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

transactionSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id;
    ret.balance_before = ret.balanceBefore;
    ret.balance_after = ret.balanceAfter;
    ret.reference_doc = ret.referenceDoc;
    ret.reference_type = ret.referenceType;
    ret.created_at = ret.createdAt;
    ret.updated_at = ret.updatedAt;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('Transaction', transactionSchema);
