require('dotenv').config();
const connectDB = require('../config/database');
const InvestmentPlan = require('../models/InvestmentPlan');

const plans = [
  { name: 'Starter',  description: 'Perfect for beginners. Low risk, steady returns.',          price: 2000,   dailyProfit: 130,   totalProfit: 3900,   durationDays: 30, dailyRoiPercent: 6.50, totalRoiPercent: 95.00,  maxPurchase: 10, sortOrder: 1 },
  { name: 'Bronze',   description: 'Great for growing your portfolio steadily.',                 price: 6000,   dailyProfit: 350,   totalProfit: 10500,  durationDays: 30, dailyRoiPercent: 5.83, totalRoiPercent: 75.00,  maxPurchase: 10, sortOrder: 2 },
  { name: 'Silver',   description: 'Mid-tier investment for consistent earners.',                price: 12000,  dailyProfit: 650,   totalProfit: 19500,  durationDays: 30, dailyRoiPercent: 5.42, totalRoiPercent: 62.50,  maxPurchase: 10, sortOrder: 3 },
  { name: 'Gold',     description: 'Higher returns for confident investors.',                    price: 24000,  dailyProfit: 1300,  totalProfit: 39000,  durationDays: 30, dailyRoiPercent: 5.42, totalRoiPercent: 62.50,  maxPurchase: 8,  sortOrder: 4 },
  { name: 'Platinum', description: 'Premium plan with excellent daily ROI.',                    price: 40000,  dailyProfit: 2400,  totalProfit: 72000,  durationDays: 30, dailyRoiPercent: 6.00, totalRoiPercent: 80.00,  maxPurchase: 5,  sortOrder: 5 },
  { name: 'Diamond',  description: 'Our top-tier investment plan for serious earners.',          price: 70000,  dailyProfit: 4550,  totalProfit: 136500, durationDays: 30, dailyRoiPercent: 6.50, totalRoiPercent: 95.00,  maxPurchase: 5,  sortOrder: 6 },
  { name: 'Elite',    description: 'For serious investors seeking maximum growth.',              price: 100000, dailyProfit: 7000,  totalProfit: 210000, durationDays: 30, dailyRoiPercent: 7.00, totalRoiPercent: 110.00, maxPurchase: 3,  sortOrder: 7 },
  { name: 'VIP',      description: 'Ultimate investment tier. Maximum daily earnings.',          price: 200000, dailyProfit: 16000, totalProfit: 480000, durationDays: 30, dailyRoiPercent: 8.00, totalRoiPercent: 140.00, maxPurchase: 2,  sortOrder: 8 },
];

const seed = async () => {
  await connectDB();
  console.log('🌱 Seeding investment plans...');
  for (const plan of plans) {
    const exists = await InvestmentPlan.findOne({ name: plan.name });
    if (!exists) {
      await InvestmentPlan.create(plan);
      console.log(`  ✅ Created: ${plan.name}`);
    } else {
      console.log(`  ⏭  Exists:  ${plan.name}`);
    }
  }
  console.log('\n✅ Seed complete!');
  process.exit(0);
};

seed().catch(err => { console.error(err); process.exit(1); });
