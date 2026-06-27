const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      // Mongoose 8 no longer needs these options, but keeping for clarity
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });

    console.log(`✅ MongoDB connected: ${conn.connection.host}`);

    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB error:', err.message);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️  MongoDB disconnected. Reconnecting...');
    });

  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    console.error('   Check your MONGODB_URI in .env');
    process.exit(1);
  }
};

module.exports = connectDB;
