const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { BankAccount, Announcement, DailyProfitLog } = require('../models/Supporting');
const UserInvestment = require('../models/UserInvestment');
const { success, error, paginate } = require('../utils/response');

// GET /api/users/dashboard
const getDashboard = async (req, res) => {
  try {
    const userId = req.user._id;

    const [user, investStats, todayProfit, referralCount, recentTx, monthlyEarnings, announcements] =
      await Promise.all([
        User.findById(userId),

        UserInvestment.aggregate([
          { $match: { user: userId } },
          { $group: {
            _id: null,
            activeInvestments: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
            dailyIncome:       { $sum: { $cond: [{ $eq: ['$status', 'active'] }, '$dailyProfit', 0] } },
            totalProfitEarned: { $sum: '$profitEarned' },
            totalInvested:     { $sum: '$amountInvested' },
          }},
        ]),

        DailyProfitLog.aggregate([
          { $match: { user: userId, profitDate: {
            $gte: new Date(new Date().setHours(0,0,0,0)),
            $lt:  new Date(new Date().setHours(23,59,59,999)),
          }}},
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),

        User.countDocuments({ referredBy: userId }),

        Transaction.find({ user: userId }).sort({ createdAt: -1 }).limit(10),

        DailyProfitLog.aggregate([
          { $match: { user: userId, profitDate: { $gte: new Date(Date.now() - 180 * 86400000) } } },
          { $group: {
            _id: { $dateToString: { format: '%Y-%m', date: '$profitDate' } },
            earnings: { $sum: '$amount' },
          }},
          { $sort: { _id: 1 } },
          { $project: { _id: 0, month: '$_id', earnings: 1 } },
        ]),

        Announcement.find({ isActive: true }).sort({ createdAt: -1 }).limit(3),
      ]);

    const s = investStats[0] || { activeInvestments: 0, dailyIncome: 0, totalProfitEarned: 0, totalInvested: 0 };

    return success(res, {
      user,
      stats: {
        ...s,
        todayProfit: todayProfit[0]?.total || 0,
        totalReferrals: referralCount,
      },
      recentTransactions: recentTx,
      monthlyEarnings,
      announcements,
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    return error(res, 'Failed to load dashboard.', 500);
  }
};

// GET /api/users/transactions
const getTransactions = async (req, res) => {
  try {
    const { type, page = 1, limit = 20 } = req.query;
    const filter = { user: req.user._id };
    if (type && type !== 'all') filter.type = type;

    const [total, transactions] = await Promise.all([
      Transaction.countDocuments(filter),
      Transaction.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(+limit),
    ]);

    return paginate(res, transactions, total, page, limit);
  } catch (err) {
    return error(res, 'Failed to fetch transactions.', 500);
  }
};

// PUT /api/users/profile
const updateProfile = async (req, res) => {
  try {
    const { full_name, phone } = req.body;
    const userId = req.user._id;

    if (phone) {
      const existing = await User.findOne({ phone, _id: { $ne: userId } });
      if (existing) return error(res, 'Phone number already in use.', 409);
    }

    const updates = {};
    if (full_name) updates.fullName = full_name.trim();
    if (phone) updates.phone = phone;

    const user = await User.findByIdAndUpdate(userId, updates, { new: true });
    return success(res, user.toSafeObject(), 'Profile updated successfully.');
  } catch (err) {
    return error(res, 'Failed to update profile.', 500);
  }
};

// GET /api/users/bank-account
const getBankAccount = async (req, res) => {
  try {
    const bank = await BankAccount.findOne({ user: req.user._id });
    return success(res, bank || null);
  } catch (err) {
    return error(res, 'Failed to fetch bank account.', 500);
  }
};

// PUT /api/users/bank-account
const saveBankAccount = async (req, res) => {
  try {
    const { bank_name, account_number, account_name } = req.body;
    const bank = await BankAccount.findOneAndUpdate(
      { user: req.user._id },
      { bankName: bank_name, accountNumber: account_number, accountName: account_name },
      { new: true, upsert: true, runValidators: true }
    );
    return success(res, bank, 'Bank account saved successfully.');
  } catch (err) {
    return error(res, 'Failed to save bank account.', 500);
  }
};

module.exports = { getDashboard, getTransactions, updateProfile, getBankAccount, saveBankAccount };
