const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const { authenticate, adminOnly } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const upload = require('../middleware/upload');

const authCtrl     = require('../controllers/authController');
const userCtrl     = require('../controllers/userController');
const investCtrl   = require('../controllers/investmentController');
const depositCtrl  = require('../controllers/depositController');
const withdrawCtrl = require('../controllers/withdrawalController');
const referralCtrl = require('../controllers/referralController');
const adminCtrl    = require('../controllers/adminController');

// ─── AUTH ─────────────────────────────────────────────────
router.post('/auth/register', [
  body('full_name').trim().notEmpty().isLength({ min: 2, max: 100 }).withMessage('Full name required'),
  body('username').trim().matches(/^[a-zA-Z0-9_]{3,30}$/).withMessage('Username: 3–30 alphanumeric/underscore'),
  body('phone').trim().matches(/^(\+234|0)[0-9]{10}$/).withMessage('Enter a valid Nigerian phone number'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('confirm_password').custom((v, { req }) => {
    if (v !== req.body.password) throw new Error('Passwords do not match');
    return true;
  }),
  validate,
], authCtrl.register);

router.post('/auth/login', [
  body('identifier').trim().notEmpty().withMessage('Username or phone required'),
  body('password').notEmpty().withMessage('Password required'),
  validate,
], authCtrl.login);

router.get('/auth/me',              authenticate, authCtrl.getMe);
router.put('/auth/change-password', authenticate, [
  body('current_password').notEmpty().withMessage('Current password required'),
  body('new_password').isLength({ min: 6 }).withMessage('New password must be 6+ characters'),
  validate,
], authCtrl.changePassword);

// ─── USER ─────────────────────────────────────────────────
router.get('/users/dashboard',    authenticate, userCtrl.getDashboard);
router.get('/users/transactions', authenticate, userCtrl.getTransactions);
router.put('/users/profile',      authenticate, userCtrl.updateProfile);
router.get('/users/bank-account', authenticate, userCtrl.getBankAccount);
router.put('/users/bank-account', authenticate, [
  body('bank_name').notEmpty().withMessage('Bank name required'),
  body('account_number').isLength({ min: 10, max: 10 }).withMessage('Account number must be 10 digits'),
  body('account_name').notEmpty().withMessage('Account name required'),
  validate,
], userCtrl.saveBankAccount);

// ─── INVESTMENTS ──────────────────────────────────────────
router.get('/investments/plans',  investCtrl.getPlans);
router.post('/investments/buy',   authenticate, [
  body('plan_id').notEmpty().withMessage('Plan ID required'),
  validate,
], investCtrl.buyPlan);
router.get('/investments/my',     authenticate, investCtrl.getMyInvestments);
router.get('/investments/stats',  authenticate, investCtrl.getInvestmentStats);

// ─── DEPOSITS ─────────────────────────────────────────────
router.get('/deposits/payment-info', authenticate, depositCtrl.getPaymentInfo);

// Submit deposit + optional receipt in one multipart request
router.post('/deposits/request', authenticate,
  upload.single('receipt'),
  depositCtrl.requestDeposit
);

// Upload/replace receipt for existing deposit
router.post('/deposits/:id/upload-receipt', authenticate,
  upload.single('receipt'),
  depositCtrl.uploadReceipt
);

router.get('/deposits/history', authenticate, depositCtrl.getDepositHistory);

// ─── WITHDRAWALS ──────────────────────────────────────────
router.post('/withdrawals/request', authenticate, [
  body('amount').isFloat({ min: 1000 }).withMessage('Minimum withdrawal is ₦1,000'),
  body('bank_name').notEmpty().withMessage('Bank name required'),
  body('account_number').isLength({ min: 10, max: 10 }).withMessage('Account number must be 10 digits'),
  body('account_name').notEmpty().withMessage('Account name required'),
  validate,
], withdrawCtrl.requestWithdrawal);
router.get('/withdrawals/history', authenticate, withdrawCtrl.getWithdrawalHistory);

// ─── REFERRALS ────────────────────────────────────────────
router.get('/referrals/stats', authenticate, referralCtrl.getReferralStats);

// ─── ADMIN AUTH ───────────────────────────────────────────
router.post('/admin/auth/register', adminCtrl.adminRegister);

// ─── ADMIN (all routes below require admin JWT) ───────────
router.use('/admin', authenticate, adminOnly);

// Dashboard
router.get('/admin/dashboard', adminCtrl.adminDashboard);

// Users
router.get('/admin/users',                    adminCtrl.adminGetUsers);
router.get('/admin/users/:id/detail',         depositCtrl.adminGetUserDetail);
router.put('/admin/users/:id/status',         adminCtrl.adminUpdateUserStatus);
router.post('/admin/users/:id/credit',        depositCtrl.adminCreditUser);
router.post('/admin/users/:id/debit',         depositCtrl.adminDebitUser);

// Transactions (all users)
router.get('/admin/transactions',             depositCtrl.adminGetTransactions);

// Deposits
router.get('/admin/deposits',                 depositCtrl.adminGetDeposits);
router.put('/admin/deposits/:id/process',     depositCtrl.adminProcessDeposit);

// Withdrawals
router.get('/admin/withdrawals',              withdrawCtrl.adminGetWithdrawals);
router.put('/admin/withdrawals/:id/process',  withdrawCtrl.adminProcessWithdrawal);

// Plans
router.get('/admin/plans',           adminCtrl.adminGetPlans);
router.post('/admin/plans',          adminCtrl.adminCreatePlan);
router.put('/admin/plans/:id',       adminCtrl.adminUpdatePlan);
router.delete('/admin/plans/:id',    adminCtrl.adminDeletePlan);

// Announcements
router.get('/admin/announcements',          adminCtrl.getAnnouncements);
router.post('/admin/announcements',         adminCtrl.createAnnouncement);
router.delete('/admin/announcements/:id',   adminCtrl.deleteAnnouncement);

module.exports = router;
