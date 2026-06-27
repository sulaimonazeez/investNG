const mongoose = require('mongoose');
const InvestmentPlan = require('../models/InvestmentPlan');
const UserInvestment = require('../models/UserInvestment');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { success, error, paginate } = require('../utils/response');

// GET /api/investments/plans
const getPlans = async (req, res) => {
  try {
    const plans = await InvestmentPlan.find({ isActive: true }).sort({ sortOrder: 1 });
    return success(res, plans);
  } catch (err) {
    return error(res, 'Failed to fetch plans.', 500);
  }
};

// POST /api/investments/buy
const buyPlan = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { plan_id } = req.body;
    const userId = req.user._id;

    const [user, plan] = await Promise.all([
      User.findById(userId).session(session),
      InvestmentPlan.findOne({ _id: plan_id, isActive: true }).session(session),
    ]);

    if (!plan) {
      await session.abortTransaction();
      return error(res, 'Investment plan not found or inactive.', 404);
    }

    if (user.walletBalance < plan.price) {
      await session.abortTransaction();
      return error(res, `Insufficient balance. Need ₦${plan.price.toLocaleString()}, have ₦${user.walletBalance.toLocaleString()}.`, 400);
    }

    // Check purchase limit
    const activeCount = await UserInvestment.countDocuments({
      user: userId, plan: plan._id, status: 'active',
    }).session(session);

    if (activeCount >= plan.maxPurchase) {
      await session.abortTransaction();
      return error(res, `Maximum ${plan.maxPurchase} active investments allowed for this plan.`, 400);
    }

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + plan.durationDays);

    // Create investment
    const [investment] = await UserInvestment.create([{
      user: userId,
      plan: plan._id,
      planName: plan.name,
      amountInvested: plan.price,
      dailyProfit: plan.dailyProfit,
      totalProfit: plan.totalProfit,
      durationDays: plan.durationDays,
      startDate,
      endDate,
    }], { session });

    const balanceBefore = user.walletBalance;
    const balanceAfter = balanceBefore - plan.price;

    // Debit wallet
    await User.findByIdAndUpdate(userId,
      { $inc: { walletBalance: -plan.price } },
      { session }
    );

    // Record transaction
    await Transaction.create([{
      user: userId,
      type: 'investment',
      amount: plan.price,
      balanceBefore,
      balanceAfter,
      description: `Purchased ${plan.name} investment plan`,
      referenceDoc: investment._id,
      referenceType: 'UserInvestment',
    }], { session });

    await session.commitTransaction();

    const populated = await UserInvestment.findById(investment._id).populate('plan', 'name imageUrl dailyRoiPercent');

    return success(res, {
      investment: populated,
      newBalance: balanceAfter,
    }, `🎉 Successfully invested in ${plan.name}! Daily earnings start tomorrow.`, 201);

  } catch (err) {
    await session.abortTransaction();
    console.error('Buy plan error:', err);
    return error(res, 'Investment failed. Please try again.', 500);
  } finally {
    session.endSession();
  }
};

// GET /api/investments/my
const getMyInvestments = async (req, res) => {
  try {
    const { status = 'all', page = 1, limit = 20 } = req.query;
    const filter = { user: req.user._id };
    if (status !== 'all') filter.status = status;

    const [total, investments] = await Promise.all([
      UserInvestment.countDocuments(filter),
      UserInvestment.find(filter)
        .populate('plan', 'name imageUrl dailyRoiPercent')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(+limit),
    ]);

    return paginate(res, investments, total, page, limit);
  } catch (err) {
    return error(res, 'Failed to fetch investments.', 500);
  }
};

// GET /api/investments/stats
const getInvestmentStats = async (req, res) => {
  try {
    const userId = req.user._id;
    const stats = await UserInvestment.aggregate([
      { $match: { user: userId } },
      { $group: {
        _id: null,
        totalInvestments: { $sum: 1 },
        activeCount:      { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
        completedCount:   { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        totalInvested:    { $sum: '$amountInvested' },
        totalProfitEarned:{ $sum: '$profitEarned' },
        dailyIncome:      { $sum: { $cond: [{ $eq: ['$status', 'active'] }, '$dailyProfit', 0] } },
      }},
    ]);
    return success(res, stats[0] || {});
  } catch (err) {
    return error(res, 'Failed to fetch stats.', 500);
  }
};

module.exports = { getPlans, buyPlan, getMyInvestments, getInvestmentStats };
