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

userInvestmentSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id;
    ret.plan_name = ret.planName;
    ret.amount_invested = ret.amountInvested;
    ret.daily_profit = ret.dailyProfit;
    ret.total_profit = ret.totalProfit;
    ret.profit_earned = ret.profitEarned;
    ret.duration_days = ret.durationDays;
    ret.days_completed = ret.daysCompleted;
    ret.start_date = ret.startDate;
    ret.end_date = ret.endDate;
    ret.last_profit_date = ret.lastProfitDate;
    ret.progress_percent = ret.progressPercent;
    ret.created_at = ret.createdAt;
    ret.updated_at = ret.updatedAt;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});
userInvestmentSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('UserInvestment', userInvestmentSchema);
