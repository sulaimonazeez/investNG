const mongoose = require('mongoose');

const userInvestmentSchema = new mongoose.Schema({
  user:           { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  plan:           { type: mongoose.Schema.Types.ObjectId, ref: 'InvestmentPlan', required: true },
  planName:       { type: String, required: true }, // snapshot
  amountInvested: { type: Number, required: true },
  dailyProfit:    { type: Number, required: true },
  totalProfit:    { type: Number, required: true },
  profitEarned:   { type: Number, default: 0 },
  durationDays:   { type: Number, required: true },
  daysCompleted:  { type: Number, default: 0 },
  status: {
    type: String, enum: ['active', 'completed', 'cancelled'], default: 'active',
  },
  startDate:      { type: Date, required: true },
  endDate:        { type: Date, required: true },
  lastProfitDate: { type: Date, default: null },
}, { timestamps: true });

userInvestmentSchema.index({ user: 1, status: 1 });
userInvestmentSchema.index({ status: 1, lastProfitDate: 1 });

userInvestmentSchema.virtual('progressPercent').get(function () {
  return Math.min(100, Math.round((this.daysCompleted / this.durationDays) * 100));
});

userInvestmentSchema.set('toJSON', { virtuals: true });
userInvestmentSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('UserInvestment', userInvestmentSchema);
