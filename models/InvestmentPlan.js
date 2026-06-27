const mongoose = require('mongoose');

const investmentPlanSchema = new mongoose.Schema({
  name:            { type: String, required: true, trim: true },
  description:     { type: String, trim: true, default: '' },
  imageUrl:        { type: String, default: null },
  price:           { type: Number, required: true, min: 1 },
  dailyProfit:     { type: Number, required: true, min: 0 },
  totalProfit:     { type: Number, required: true, min: 0 },
  durationDays:    { type: Number, required: true, min: 1 },
  dailyRoiPercent: { type: Number, required: true, min: 0 },
  totalRoiPercent: { type: Number, required: true, min: 0 },
  minPurchase:     { type: Number, default: 1 },
  maxPurchase:     { type: Number, default: 10 },
  isActive:        { type: Boolean, default: true },
  sortOrder:       { type: Number, default: 99 },
}, { timestamps: true });

investmentPlanSchema.index({ isActive: 1, sortOrder: 1 });

module.exports = mongoose.model('InvestmentPlan', investmentPlanSchema);
