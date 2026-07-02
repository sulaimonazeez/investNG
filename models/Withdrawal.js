const mongoose = require('mongoose');

const withdrawalSchema = new mongoose.Schema({
  user:          { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount:        { type: Number, required: true, min: 1000 },
  bankName:      { type: String, required: true },
  accountNumber: { type: String, required: true },
  accountName:   { type: String, required: true },
  reference:     { type: String, required: true, unique: true },
  status:        { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  adminNote:     { type: String, default: null },
  approvedBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  approvedAt:    { type: Date, default: null },
}, { timestamps: true });

withdrawalSchema.index({ user: 1, status: 1 });
withdrawalSchema.index({ status: 1, createdAt: -1 });

withdrawalSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id;
    ret.bank_name = ret.bankName;
    ret.account_number = ret.accountNumber;
    ret.account_name = ret.accountName;
    ret.admin_note = ret.adminNote;
    ret.approved_by = ret.approvedBy;
    ret.approved_at = ret.approvedAt;
    ret.created_at = ret.createdAt;
    ret.updated_at = ret.updatedAt;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('Withdrawal', withdrawalSchema);
