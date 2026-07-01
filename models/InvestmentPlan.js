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

investmentPlanSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id;
    ret.daily_profit = ret.dailyProfit;
    ret.total_profit = ret.totalProfit;
    ret.duration_days = ret.durationDays;
    ret.daily_roi_percent = ret.dailyRoiPercent;
    ret.total_roi_percent = ret.totalRoiPercent;
    ret.min_purchase = ret.minPurchase;
    ret.max_purchase = ret.maxPurchase;
    ret.is_active = ret.isActive;
    ret.sort_order = ret.sortOrder;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('InvestmentPlan', investmentPlanSchema);

