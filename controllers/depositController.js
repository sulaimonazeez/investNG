const mongoose = require('mongoose');
const Deposit = require('../models/Deposit');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { PlatformSettings } = require('../models/Supporting');
const { generateReference } = require('../utils/jwt');
const { success, error, paginate } = require('../utils/response');

// Helper — load payment settings from DB
const getPaymentSettings = async () => {
  const settings = await PlatformSettings.find({ group: 'payment' });
  const map = {};
  settings.forEach(s => { map[s.key] = s.value; });
  return {
    bankName:      map.payment_bank_name      || 'Guaranty Trust Bank',
    accountNumber: map.payment_account_number || '0123456789',
    accountName:   map.payment_account_name   || 'InvestNaija Limited',
    instructions:  map.payment_instructions   || [],
  };
};

// Helper — convert multer memory buffer to Base64
const fileToBase64 = (file) => {
  if (!file) return null;
  return { data: file.buffer.toString('base64'), mimeType: file.mimetype };
};

// GET /api/deposits/payment-info
const getPaymentInfo = async (req, res) => {
  try {
    const info = await getPaymentSettings();
    return success(res, info);
  } catch (err) {
    return error(res, 'Failed to fetch payment info.', 500);
  }
};

// POST /api/deposits/request
const requestDeposit = async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || +amount < 1000) return error(res, 'Minimum deposit is ₦1,000.', 400);

    const reference = generateReference('DEP');
    const paymentProof = fileToBase64(req.file);

    const deposit = await Deposit.create({
      user: req.user._id, amount: +amount, reference, paymentProof,
    });

    const payInfo = await getPaymentSettings();
    return success(res, { deposit, paymentInfo: { ...payInfo, amount: +amount, reference } },
      'Deposit request submitted. Transfer the amount and await confirmation.', 201);
  } catch (err) {
    console.error('Deposit request error:', err);
    return error(res, 'Failed to submit deposit.', 500);
  }
};

// POST /api/deposits/:id/upload-receipt
const uploadReceipt = async (req, res) => {
  try {
    if (!req.file) return error(res, 'No file uploaded.', 400);
    const deposit = await Deposit.findOne({ _id: req.params.id, user: req.user._id, status: 'pending' });
    if (!deposit) return error(res, 'Deposit not found or already processed.', 404);
    deposit.paymentProof = fileToBase64(req.file);
    await deposit.save();
    return success(res, {}, 'Receipt uploaded successfully.');
  } catch (err) {
    return error(res, 'Failed to upload receipt.', 500);
  }
};

// GET /api/deposits/history
const getDepositHistory = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const filter = { user: req.user._id };
    const [total, deposits] = await Promise.all([
      Deposit.countDocuments(filter),
      Deposit.find(filter).sort({ createdAt: -1 }).skip((page-1)*limit).limit(+limit),
    ]);
    return paginate(res, deposits, total, page, limit);
  } catch (err) {
    return error(res, 'Failed to fetch deposit history.', 500);
  }
};

// ADMIN — GET /api/admin/deposits
const adminGetDeposits = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status && status !== 'all') filter.status = status;
    const [total, deposits] = await Promise.all([
      Deposit.countDocuments(filter),
      Deposit.find(filter)
        .populate('user', 'fullName username phone walletBalance')
        .populate('approvedBy', 'fullName username')
        .sort({ createdAt: -1 }).skip((page-1)*limit).limit(+limit),
    ]);
    return paginate(res, deposits, total, page, limit);
  } catch (err) {
    return error(res, 'Failed to fetch deposits.', 500);
  }
};

// ADMIN — PUT /api/admin/deposits/:id/process
const adminProcessDeposit = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { id } = req.params;
    const { action, admin_note } = req.body;
    if (!['approve','reject'].includes(action)) {
      await session.abortTransaction();
      return error(res, 'Action must be "approve" or "reject".', 400);
    }
    const deposit = await Deposit.findOne({ _id: id, status: 'pending' }).session(session);
    if (!deposit) { await session.abortTransaction(); return error(res, 'Deposit not found or already processed.', 404); }

    if (action === 'approve') {
      const user = await User.findById(deposit.user).session(session);
      const balanceBefore = user.walletBalance;
      const balanceAfter  = balanceBefore + deposit.amount;
      await User.findByIdAndUpdate(deposit.user,
        { $inc: { walletBalance: deposit.amount, totalDeposited: deposit.amount } }, { session });
      await Transaction.create([{
        user: deposit.user, type: 'deposit', amount: deposit.amount,
        balanceBefore, balanceAfter,
        description: `Deposit of ₦${deposit.amount.toLocaleString()} approved`,
        referenceDoc: deposit._id, referenceType: 'Deposit',
      }], { session });
      deposit.status = 'approved'; deposit.approvedBy = req.user._id;
      deposit.approvedAt = new Date(); deposit.adminNote = admin_note || null;
    } else {
      deposit.status = 'rejected'; deposit.approvedBy = req.user._id;
      deposit.approvedAt = new Date(); deposit.adminNote = admin_note || 'Deposit rejected by admin';
    }
    await deposit.save({ session });
    await session.commitTransaction();
    return success(res, {}, `Deposit ${action === 'approve' ? 'approved ✅' : 'rejected ❌'} successfully.`);
  } catch (err) {
    await session.abortTransaction();
    return error(res, 'Failed to process deposit.', 500);
  } finally { session.endSession(); }
};

// ADMIN — GET /api/admin/transactions
const adminGetTransactions = async (req, res) => {
  try {
    const { type, page = 1, limit = 20, user_id } = req.query;
    const filter = {};
    if (type && type !== 'all') filter.type = type;
    if (user_id) filter.user = user_id;
    const [total, transactions] = await Promise.all([
      Transaction.countDocuments(filter),
      Transaction.find(filter).populate('user', 'fullName username phone')
        .sort({ createdAt: -1 }).skip((page-1)*limit).limit(+limit),
    ]);
    return paginate(res, transactions, total, page, limit);
  } catch (err) {
    return error(res, 'Failed to fetch transactions.', 500);
  }
};

// ADMIN — GET /api/admin/users/:id/detail
const adminGetUserDetail = async (req, res) => {
  try {
    const [user, transactions, investments, deposits, withdrawals] = await Promise.all([
      User.findById(req.params.id).select('-passwordHash'),
      Transaction.find({ user: req.params.id }).sort({ createdAt: -1 }).limit(20),
      require('../models/UserInvestment').find({ user: req.params.id }).populate('plan','name').sort({ createdAt: -1 }),
      Deposit.find({ user: req.params.id }).sort({ createdAt: -1 }).limit(10),
      require('../models/Withdrawal').find({ user: req.params.id }).sort({ createdAt: -1 }).limit(10),
    ]);
    if (!user) return error(res, 'User not found.', 404);
    return success(res, { user, transactions, investments, deposits, withdrawals });
  } catch (err) {
    return error(res, 'Failed to fetch user details.', 500);
  }
};

// ADMIN — POST /api/admin/users/:id/credit
const adminCreditUser = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { amount, description } = req.body;
    if (!amount || +amount <= 0) { await session.abortTransaction(); return error(res, 'Invalid amount.', 400); }
    const user = await User.findById(req.params.id).session(session);
    if (!user) { await session.abortTransaction(); return error(res, 'User not found.', 404); }
    const balanceBefore = user.walletBalance;
    const balanceAfter  = balanceBefore + +amount;
    await User.findByIdAndUpdate(req.params.id, { $inc: { walletBalance: +amount } }, { session });
    await Transaction.create([{
      user: req.params.id, type: 'deposit', amount: +amount, balanceBefore, balanceAfter,
      description: description || 'Manual credit by admin', referenceType: 'AdminCredit',
    }], { session });
    await session.commitTransaction();
    return success(res, { newBalance: balanceAfter }, `₦${(+amount).toLocaleString()} credited to user's wallet.`);
  } catch (err) {
    await session.abortTransaction();
    return error(res, 'Failed to credit user.', 500);
  } finally { session.endSession(); }
};

// ADMIN — POST /api/admin/users/:id/debit
const adminDebitUser = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { amount, description } = req.body;
    if (!amount || +amount <= 0) { await session.abortTransaction(); return error(res, 'Invalid amount.', 400); }
    const user = await User.findById(req.params.id).session(session);
    if (!user) { await session.abortTransaction(); return error(res, 'User not found.', 404); }
    if (user.walletBalance < +amount) { await session.abortTransaction(); return error(res, 'Insufficient balance.', 400); }
    const balanceBefore = user.walletBalance;
    const balanceAfter  = balanceBefore - +amount;
    await User.findByIdAndUpdate(req.params.id, { $inc: { walletBalance: -amount } }, { session });
    await Transaction.create([{
      user: req.params.id, type: 'withdrawal', amount: +amount, balanceBefore, balanceAfter,
      description: description || 'Manual debit by admin', referenceType: 'AdminDebit',
    }], { session });
    await session.commitTransaction();
    return success(res, { newBalance: balanceAfter }, `₦${(+amount).toLocaleString()} debited from user's wallet.`);
  } catch (err) {
    await session.abortTransaction();
    return error(res, 'Failed to debit user.', 500);
  } finally { session.endSession(); }
};

module.exports = {
  getPaymentInfo, requestDeposit, uploadReceipt,
  getDepositHistory, adminGetDeposits, adminProcessDeposit,
  adminGetTransactions, adminGetUserDetail, adminCreditUser, adminDebitUser,
};
