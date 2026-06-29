const { PlatformSettings } = require('../models/Supporting');
const { success, error } = require('../utils/response');

const DEFAULT_SETTINGS = [
  { key: 'payment_bank_name',      value: 'Guaranty Trust Bank', label: 'Bank Name',           group: 'payment' },
  { key: 'payment_account_number', value: '0123456789',          label: 'Account Number',      group: 'payment' },
  { key: 'payment_account_name',   value: 'InvestNaija Limited', label: 'Account Name',        group: 'payment' },
  { key: 'payment_instructions',   value: [
    'Transfer your desired amount to the account above',
    'Use your username as the payment narration/description',
    'Upload your payment receipt below',
    'Your wallet will be credited within 30 minutes',
  ], label: 'Payment Instructions', group: 'payment' },

  { key: 'support_whatsapp', value: 'https://wa.me/2348000000000', label: 'WhatsApp Link', group: 'support' },
  { key: 'support_telegram', value: 'https://t.me/investnaija',    label: 'Telegram Link', group: 'support' },
  { key: 'support_email',    value: 'support@investnaija.com',     label: 'Support Email', group: 'support' },
  { key: 'support_phone',    value: '+2348000000000',              label: 'Support Phone', group: 'support' },

  { key: 'app_name',         value: 'InvestNaija',            label: 'App Name',             group: 'app' },
  { key: 'app_tagline',      value: 'Grow Your Wealth Daily', label: 'Tagline',              group: 'app' },
  { key: 'min_deposit',      value: 1000,                     label: 'Min Deposit (₦)',      group: 'app' },
  { key: 'min_withdrawal',   value: 1000,                     label: 'Min Withdrawal (₦)',   group: 'app' },
  { key: 'withdrawal_fee',   value: 0,                        label: 'Withdrawal Fee (%)',   group: 'app' },
  { key: 'signup_bonus',     value: 500,                      label: 'Signup Bonus (₦)',     group: 'app' },

  { key: 'faq_items', value: [
    { id:1, question:'How do I make a deposit?',        answer:'Go to the Deposit page, pick an amount, transfer to our bank account using your username as narration, upload your receipt and submit. Your wallet will be credited within 30 minutes.', category:'deposit',    icon:'💰' },
    { id:2, question:'How do I withdraw my earnings?',  answer:'Go to the Withdraw page, enter the amount, select your bank, enter your account number and name, then submit. Withdrawals are processed within 24 hours.',                              category:'withdrawal', icon:'🏦' },
    { id:3, question:'How do I buy an investment plan?',answer:'Go to the Invest page, choose a plan that fits your budget, and click "Invest". The amount will be deducted from your wallet and you will start earning daily returns from the next day.', category:'investment', icon:'📈' },
    { id:4, question:'How do I invite friends?',        answer:'Go to the Team page, copy your referral link or code, and share it with friends. When they register, deposit and invest using your link, you earn a commission automatically.',         category:'referral',   icon:'👥' },
    { id:5, question:'How do I earn daily returns?',    answer:'Once you purchase an investment plan, you earn a fixed daily return every 24 hours. Earnings are credited directly to your wallet balance.',                                            category:'investment', icon:'💎' },
    { id:6, question:'Is my money safe?',               answer:'Yes. We use bank-grade security, encrypted transactions, and all withdrawals are manually reviewed by our team before processing.',                                                      category:'security',   icon:'🔒' },
  ], label: 'FAQ Items', group: 'faq' },
];

const seedSettings = async () => {
  for (const s of DEFAULT_SETTINGS) {
    await PlatformSettings.findOneAndUpdate(
      { key: s.key },
      { $setOnInsert: s },
      { upsert: true }
    );
  }
};

// Helper used by other controllers
const getSetting = async (key, fallback = null) => {
  const doc = await PlatformSettings.findOne({ key });
  return doc ? doc.value : fallback;
};

const getPublicSettings = async (req, res) => {
  try {
    const settings = await PlatformSettings.find({ group: { $in: ['payment','support','app','faq'] } });
    const result = {};
    settings.forEach(s => { result[s.key] = s.value; });
    return success(res, result);
  } catch (err) {
    return error(res, 'Failed to fetch settings.', 500);
  }
};

const adminGetSettings = async (req, res) => {
  try {
    const settings = await PlatformSettings.find().sort({ group:1, key:1 });
    const grouped = {};
    settings.forEach(s => {
      if (!grouped[s.group]) grouped[s.group] = [];
      grouped[s.group].push(s);
    });
    return success(res, grouped);
  } catch (err) {
    return error(res, 'Failed to fetch settings.', 500);
  }
};

const adminUpdateSettings = async (req, res) => {
  try {
    const { settings } = req.body;
    if (!Array.isArray(settings)) return error(res, 'Settings must be an array.', 400);
    await Promise.all(settings.map(({ key, value }) =>
      PlatformSettings.findOneAndUpdate({ key }, { value }, { upsert: true })
    ));
    return success(res, {}, 'Settings updated successfully.');
  } catch (err) {
    return error(res, 'Failed to update settings.', 500);
  }
};

const adminUpdateSetting = async (req, res) => {
  try {
    const setting = await PlatformSettings.findOneAndUpdate(
      { key: req.params.key },
      { value: req.body.value },
      { new: true, upsert: true }
    );
    return success(res, setting, 'Setting updated.');
  } catch (err) {
    return error(res, 'Failed to update setting.', 500);
  }
};

module.exports = { seedSettings, getSetting, getPublicSettings, adminGetSettings, adminUpdateSettings, adminUpdateSetting };
