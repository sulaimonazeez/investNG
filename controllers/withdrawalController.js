const mongoose = require('mongoose');
const Withdrawal = require('../models/Withdrawal');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { generateReference } = require('../utils/jwt');
const { success, error, paginate } = require('../utils/response');

// POST /api/withdrawals/request
const requestWithdrawal = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { amount, bank_name, account_number, account_name } = req.body;
    const userId = req.user._id;

    const user = await User.findById(userId).session(session);
    if (user.walletBalance < +amount) {
      await session.abortTransaction();
      return error(res, `Insufficient balance. Available: ₦${user.walletBalance.toLocaleString()}.`, 400);
    }

    const pendingExists = await Withdrawal.findOne({ user: userId, status: 'pending' }).session(session);
    if (pendingExists) {
      await session.abortTransaction();
      return error(res, 'You already have a pending withdrawal. Wait for it to be processed.', 400);
    }

    const reference = generateReference('WDR');
    const balanceBefore = user.walletBalance;
    const balanceAfter  = balanceBefore - +amount;

    const [withdrawal] = await Withdrawal.create([{
      user: userId,
      amount: +amount,
      bankName: bank_name,
      accountNumber: account_number,
      accountName: account_name,
      reference,
    }], { session });

    // Hold funds immediately
    await User.findByIdAndUpdate(userId,
      { $inc: { walletBalance: -amount } },
      { session }
    );

    await session.commitTransaction();

    return success(res, {
      withdrawal,
      newBalance: balanceAfter,
      reference,
    }, 'Withdrawal request submitted. Processing within 24 hours.', 201);
  } catch (err) {
    await session.abortTransaction();
    console.error('Withdrawal error:', err);
    return error(res, 'Withdrawal failed. Please try again.', 500);
  } finally {
    session.endSession();
  }
};

// GET /api/withdrawals/history
const getWithdrawalHistory = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const filter = { user: req.user._id };
    const [total, withdrawals] = await Promise.all([
      Withdrawal.countDocuments(filter),
      Withdrawal.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(+limit),
    ]);
    return paginate(res, withdrawals, total, page, limit);
  } catch (err) {
    return error(res, 'Failed to fetch withdrawal history.', 500);
  }
};

// ADMIN — GET /api/admin/withdrawals
const adminGetWithdrawals = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status && status !== 'all') filter.status = status;

    const [total, withdrawals] = await Promise.all([
      Withdrawal.countDocuments(filter),
      Withdrawal.find(filter)
        .populate('user', 'fullName username phone')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(+limit),
    ]);
    return paginate(res, withdrawals, total, page, limit);
  } catch (err) {
    return error(res, 'Failed to fetch withdrawals.', 500);
  }
};

// ADMIN — PUT /api/admin/withdrawals/:id/process
const adminProcessWithdrawal = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { id } = req.params;
    const { action, admin_note } = req.body;

    const withdrawal = await Withdrawal.findOne({ _id: id, status: 'pending' }).session(session);
    if (!withdrawal) {
      await session.abortTransaction();
      return error(res, 'Withdrawal not found or already processed.', 404);
    }

    const user = await User.findById(withdrawal.user).session(session);

    if (action === 'approve') {
      await User.findByIdAndUpdate(withdrawal.user,
        { $inc: { totalWithdrawn: withdrawal.amount } },
        { session }
      );

      await Transaction.create([{
        user: withdrawal.user,
        type: 'withdrawal',
        amount: withdrawal.amount,
        balanceBefore: user.walletBalance + withdrawal.amount, // already deducted on request
        balanceAfter:  user.walletBalance,
        description: `Withdrawal of ₦${withdrawal.amount.toLocaleString()} approved`,
        referenceDoc: withdrawal._id,
        referenceType: 'Withdrawal',
      }], { session });

      withdrawal.status     = 'approved';
      withdrawal.approvedBy = req.user._id;
      withdrawal.approvedAt = new Date();
      withdrawal.adminNote  = admin_note || null;
    } else {
      // Refund the held amount
      const refundBefore = user.walletBalance;
      const refundAfter  = refundBefore + withdrawal.amount;

      await User.findByIdAndUpdate(withdrawal.user,
        { $inc: { walletBalance: withdrawal.amount } },
        { session }
      );

      await Transaction.create([{
        user: withdrawal.user,
        type: 'refund',
        amount: withdrawal.amount,
        balanceBefore: refundBefore,
        balanceAfter:  refundAfter,
        description: `Withdrawal rejected — ₦${withdrawal.amount.toLocaleString()} refunded`,
        referenceDoc: withdrawal._id,
        referenceType: 'Withdrawal',
      }], { session });

      withdrawal.status     = 'rejected';
      withdrawal.approvedBy = req.user._id;
      withdrawal.approvedAt = new Date();
      withdrawal.adminNote  = admin_note || 'Withdrawal rejected';
    }

    await withdrawal.save({ session });
    await session.commitTransaction();

    return success(res, {}, `Withdrawal ${action === 'approve' ? 'approved' : 'rejected'} successfully.`);
  } catch (err) {
    await session.abortTransaction();
    return error(res, 'Failed to process withdrawal.', 500);
  } finally {
    session.endSession();
  }
};

module.exports = { requestWithdrawal, getWithdrawalHistory, adminGetWithdrawals, adminProcessWithdrawal };
