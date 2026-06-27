const User = require('../models/User');
const UserInvestment = require('../models/UserInvestment');
const Deposit = require('../models/Deposit');
const { ReferralCommission } = require('../models/Supporting');
const { success, error } = require('../utils/response');

// GET /api/referrals/stats
const getReferralStats = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId).select('referralCode referralEarnings');

    const referredUsers = await User.find({ referredBy: userId })
      .select('fullName username createdAt')
      .sort({ createdAt: -1 });

    // Check which referred users are "valid" (deposited AND invested)
    const validChecks = await Promise.all(
      referredUsers.map(async (ru) => {
        const [hasDeposit, hasInvestment] = await Promise.all([
          Deposit.exists({ user: ru._id, status: 'approved' }),
          UserInvestment.exists({ user: ru._id, status: { $in: ['active', 'completed'] } }),
        ]);
        return { ...ru.toObject(), hasDeposited: !!hasDeposit, hasInvested: !!hasInvestment };
      })
    );

    const validCount = validChecks.filter(u => u.hasDeposited && u.hasInvested).length;

    const commissions = await ReferralCommission.find({ referrer: userId })
      .populate('referred', 'fullName username')
      .sort({ createdAt: -1 })
      .limit(50);

    const appUrl = process.env.APP_URL || 'http://localhost:3000';

    return success(res, {
      referralCode:    user.referralCode,
      referralLink:    `${appUrl}/register?ref=${user.referralCode}`,
      totalReferrals:  referredUsers.length,
      validReferrals:  validCount,
      referralEarnings: user.referralEarnings,
      referredUsers:   validChecks,
      commissionHistory: commissions,
    });
  } catch (err) {
    console.error('Referral stats error:', err);
    return error(res, 'Failed to fetch referral data.', 500);
  }
};

module.exports = { getReferralStats };
