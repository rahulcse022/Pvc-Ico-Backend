const connectDB = require('../config/database');
const User = require('../models/User');

// This script is no longer needed as we use accountNumber directly
// Kept for backward compatibility but does nothing
const generateReferralCodesJob = async () => {
  try {
    // Connect to database
    await connectDB();
    console.log('📊 Database connected');

    console.log('✅ All users now use accountNumber as referral code. No migration needed.');

    console.log('📊 Database operations completed');

  } catch (error) {
    console.error("❌ Error:", error.message);
  }
};

// Run the script
module.exports = generateReferralCodesJob; 