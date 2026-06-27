const mongoose = require('mongoose');

const depositSchema = new mongoose.Schema({
  user:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount:     { type: Number, required: true, min: 1000 },
  reference:  { type: String, required: true, unique: true },
  paymentProof: { type: String, default: null },
  status:     { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  adminNote:  { type: String, default: null },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  approvedAt: { type: Date, default: null },
}, { timestamps: true });

depositSchema.index({ user: 1, status: 1 });
depositSchema.index({ status: 1, createdAt: -1 });
depositSchema.index({ reference: 1 });

module.exports = mongoose.model('Deposit', depositSchema);
