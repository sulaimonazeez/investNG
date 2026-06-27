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

module.exports = mongoose.model('Withdrawal', withdrawalSchema);
