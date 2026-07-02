const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const InvestmentPlan = require('../models/InvestmentPlan');
const UserInvestment = require('../models/UserInvestment');
const Deposit = require('../models/Deposit');
const Withdrawal = require('../models/Withdrawal');
const { DailyProfitLog, Announcement } = require('../models/Supporting');
const { generateToken } = require('../utils/jwt');
const { success, error, paginate } = require('../utils/response');

// POST /api/admin/auth/register
const adminRegister = async (req, res) => {
  try {
    const { full_name, username, phone, password, secret_key } = req.body;
    if (secret_key !== process.env.ADMIN_SECRET_KEY) return error(res, 'Invalid admin secret key.', 403);

    const exists = await User.findOne({ $or: [{ username: username.toLowerCase() }, { phone }] });
    if (exists) return error(res, 'Username or phone already exists.', 409);

    const referralCode = await User.generateReferralCode(username);
    const admin = await User.create({
      fullName: full_name, username: username.toLowerCase(), phone,
      passwordHash: await bcrypt.hash(password, 12),
      role: 'admin', referralCode,
    });

    const token = generateToken({ userId: admin._id, role: 'admin' });
    return success(res, { token }, 'Admin account created.', 201);
  } catch (err) {
    return error(res, 'Failed to create admin.', 500);
  }
};

// GET /api/admin/dashboard
const adminDashboard = async (req, res) => {
  try {
    const now = new Date();
    const todayStart = new Date(now.setHours(0, 0, 0, 0));
    const weekAgo = new Date(Date.now() - 7 * 86400000);
    const fourteenDaysAgo = new Date(Date.now() - 14 * 86400000);

    const [
      totalUsers, activeUsers, newToday, newThisWeek,
      depositStats, withdrawalStats, investmentStats, profitPaid,
      dailySignups, dailyDeposits,
      pendingDeposits, pendingWithdrawals,
    ] = await Promise.all([
      User.countDocuments({ role: 'user' }),
      User.countDocuments({ role: 'user', status: 'active' }),
      User.countDocuments({ role: 'user', createdAt: { $gte: todayStart } }),
      User.countDocuments({ role: 'user', createdAt: { $gte: weekAgo } }),

      // Deposit stats
      Deposit.aggregate([
        { $group: {
          _id: null,
          total: { $sum: 1 },
          pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
          approvedAmount: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, '$amount', 0] } },
          pendingAmount:  { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, '$amount', 0] } },
        }},
      ]),

      Withdrawal.aggregate([
        { $group: {
          _id: null,
          total: { $sum: 1 },
          pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
          paidOut:       { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, '$amount', 0] } },
          pendingAmount: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, '$amount', 0] } },
        }},
      ]),

      UserInvestment.aggregate([
        { $group: {
          _id: null,
          total: { $sum: 1 },
          active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
          totalInvested: { $sum: '$amountInvested' },
        }},
      ]),

      DailyProfitLog.aggregate([{ $group: { _id: null, total: { $sum: '$amount' } } }]),

      // Daily signups last 14 days
      User.aggregate([
        { $match: { role: 'user', createdAt: { $gte: fourteenDaysAgo } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
        { $project: { _id: 0, date: '$_id', count: 1 } },
      ]),

      // Daily approved deposits last 14 days
      Deposit.aggregate([
        { $match: { status: 'approved', approvedAt: { $gte: fourteenDaysAgo } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$approvedAt' } }, amount: { $sum: '$amount' } } },
        { $sort: { _id: 1 } },
        { $project: { _id: 0, date: '$_id', amount: 1 } },
      ]),

      Deposit.find({ status: 'pending' })
        .populate('user', 'fullName username')
        .sort({ createdAt: -1 }).limit(5),

      Withdrawal.find({ status: 'pending' })
        .populate('user', 'fullName username')
        .sort({ createdAt: -1 }).limit(5),
    ]);

    const depositRow = depositStats[0] || {};
    const withdrawalRow = withdrawalStats[0] || {};
    const investmentRow = investmentStats[0] || {};

    return success(res, {
      users: {
        total_users: totalUsers,
        active_users: activeUsers,
        new_today: newToday,
        new_this_week: newThisWeek,
      },
      deposits: {
        total_deposits: depositRow.total || 0,
        pending_deposits: depositRow.pending || 0,
        total_approved_amount: depositRow.approvedAmount || 0,
        pending_amount: depositRow.pendingAmount || 0,
      },
      withdrawals: {
        total_withdrawals: withdrawalRow.total || 0,
        pending_withdrawals: withdrawalRow.pending || 0,
        total_paid_out: withdrawalRow.paidOut || 0,
        pending_amount: withdrawalRow.pendingAmount || 0,
      },
      investments: {
        total_investments: investmentRow.total || 0,
        active_investments: investmentRow.active || 0,
        total_invested: investmentRow.totalInvested || 0,
        total_profit_paid: profitPaid[0]?.total || 0,
      },
      charts: {
        daily_signups: dailySignups,
        daily_deposits: dailyDeposits,
      },
      pending: {
        deposits: pendingDeposits.map(dep => {
          const obj = dep.toJSON();
          obj.full_name = dep.user?.fullName || null;
          obj.username = dep.user?.username || null;
          return obj;
        }),
        withdrawals: pendingWithdrawals.map(w => {
          const obj = w.toJSON();
          obj.full_name = w.user?.fullName || null;
          obj.username = w.user?.username || null;
          return obj;
        }),
      },
    });
  } catch (err) {
    console.error('Admin dashboard error:', err);
    return error(res, 'Failed to load admin dashboard.', 500);
  }
};

// GET /api/admin/users
const adminGetUsers = async (req, res) => {
  try {
    const { search, status, page = 1, limit = 20 } = req.query;
    const filter = { role: 'user' };
    if (status && status !== 'all') filter.status = status;
    if (search) {
      const re = new RegExp(search, 'i');
      filter.$or = [{ fullName: re }, { username: re }, { phone: re }];
    }

    const [total, users] = await Promise.all([
      User.countDocuments(filter),
      User.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(+limit),
    ]);

    return paginate(res, users, total, page, limit);
  } catch (err) {
    return error(res, 'Failed to fetch users.', 500);
  }
};

// PUT /api/admin/users/:id/status
const adminUpdateUserStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return error(res, 'Invalid user id.', 400);
    }
    if (!['active', 'suspended', 'banned'].includes(status)) return error(res, 'Invalid status.', 400);
    const user = await User.findOneAndUpdate({ _id: req.params.id, role: 'user' }, { status });
    if (!user) return error(res, 'User not found.', 404);
    return success(res, {}, `User ${status} successfully.`);
  } catch (err) {
    return error(res, 'Failed to update user.', 500);
  }
};

// ── Plans ─────────────────────────────────────────────────
const adminGetPlans = async (req, res) => {
  try {
    const plans = await InvestmentPlan.find().sort({ sortOrder: 1 });
    return success(res, plans);
  } catch (err) { return error(res, 'Failed.', 500); }
};

const adminCreatePlan = async (req, res) => {
  try {
    const plan = await InvestmentPlan.create({
      name:            req.body.name,
      description:     req.body.description,
      price:           +req.body.price,
      dailyProfit:     +req.body.daily_profit,
      totalProfit:     +req.body.total_profit,
      durationDays:    +req.body.duration_days || 30,
      dailyRoiPercent: +req.body.daily_roi_percent,
      totalRoiPercent: +req.body.total_roi_percent,
      maxPurchase:     +req.body.max_purchase || 10,
      sortOrder:       +req.body.sort_order || 99,
    });
    return success(res, plan, 'Plan created.', 201);
  } catch (err) {
    return error(res, err.message || 'Failed to create plan.', 500);
  }
};

const numericPlanFields = new Set([
  'price', 'dailyProfit', 'totalProfit', 'durationDays',
  'dailyRoiPercent', 'totalRoiPercent', 'minPurchase', 'maxPurchase', 'sortOrder',
]);

const adminUpdatePlan = async (req, res) => {
  try {
    if (!req.params.id || !mongoose.Types.ObjectId.isValid(req.params.id)) {
      return error(res, 'Invalid or missing plan id.', 400);
    }

    const updates = {};
    const map = {
      name: 'name', description: 'description', price: 'price',
      daily_profit: 'dailyProfit', total_profit: 'totalProfit',
      duration_days: 'durationDays', daily_roi_percent: 'dailyRoiPercent',
      total_roi_percent: 'totalRoiPercent', is_active: 'isActive',
      min_purchase: 'minPurchase', max_purchase: 'maxPurchase', sort_order: 'sortOrder',
    };
    for (const [k, v] of Object.entries(map)) {
      if (req.body[k] !== undefined && req.body[k] !== '') {
        let val = req.body[k];
        if (numericPlanFields.has(v)) val = +val;
        if (v === 'isActive') val = !!(+val);
        updates[v] = val;
      }
    }

    if (Object.keys(updates).length === 0) {
      return error(res, 'No valid fields to update.', 400);
    }

    const plan = await InvestmentPlan.findByIdAndUpdate(
      req.params.id, updates, { new: true, runValidators: true }
    );
    if (!plan) return error(res, 'Plan not found.', 404);
    return success(res, plan, 'Plan updated.');
  } catch (err) {
    return error(res, err.message || 'Failed to update plan.', 500);
  }
};

const adminDeletePlan = async (req, res) => {
  try {
    const active = await UserInvestment.countDocuments({ plan: req.params.id, status: 'active' });
    if (active > 0) return error(res, 'Cannot delete a plan with active investments.', 400);
    await InvestmentPlan.findByIdAndDelete(req.params.id);
    return success(res, {}, 'Plan deleted.');
  } catch (err) { return error(res, 'Failed to delete plan.', 500); }
};

// ── Announcements ─────────────────────────────────────────
const getAnnouncements = async (req, res) => {
  try {
    const rows = await Announcement.find().sort({ createdAt: -1 });
    return success(res, rows);
  } catch (err) { return error(res, 'Failed.', 500); }
};

const createAnnouncement = async (req, res) => {
  try {
    const ann = await Announcement.create({ ...req.body, createdBy: req.user._id });
    return success(res, ann, 'Announcement created.', 201);
  } catch (err) { return error(res, 'Failed.', 500); }
};

const deleteAnnouncement = async (req, res) => {
  try {
    await Announcement.findByIdAndDelete(req.params.id);
    return success(res, {}, 'Deleted.');
  } catch (err) { return error(res, 'Failed.', 500); }
};

module.exports = {
  adminRegister, adminDashboard,
  adminGetUsers, adminUpdateUserStatus,
  adminGetPlans, adminCreatePlan, adminUpdatePlan, adminDeletePlan,
  getAnnouncements, createAnnouncement, deleteAnnouncement,
};
