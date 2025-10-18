const crypto = require('crypto');
const connectDB = require('../config/database');
const User = require('../models/User');

// Generate unique referral code
const generateReferralCode = () => {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
};

const generateReferralCodesJob = async () => {
  try {
    // Connect to database
    await connectDB();
    console.log('📊 Database connected for referral codes generation');

    // Find users without referral codes
    const usersWithoutReferralCodes = await User.find({
      $or: [
        { referralCode: { $exists: false } },
        { referralCode: null },
        { referralCode: '' }
      ]
    });

    let successCount = 0;
    let errorCount = 0;

    for (const user of usersWithoutReferralCodes) {
      try {
        // Generate unique referral code
        let referralCode;
        let isUnique = false;
        let attempts = 0;

        while (!isUnique && attempts < 10) {
          referralCode = generateReferralCode();
          const existingUser = await User.findOne({ referralCode });
          if (!existingUser) {
            isUnique = true;
          }
          attempts++;
        }

        if (!isUnique) {
          errorCount++;
          continue;
        }

        // Update user with referral code
        user.referralCode = referralCode;
        await user.save();
        successCount++;
      } catch (error) {
        errorCount++;
      }
    }

    console.log(`\nSummary:`);
    console.log(`- Successfully generated referral codes: ${successCount}`);
    console.log(`- Total users processed: ${usersWithoutReferralCodes.length}`);

    console.log('📊 Database operations completed');

  } catch (error) {
    console.error("❌ Error running generate referral codes job:", error.message);
  }
};

// Run the script
module.exports = generateReferralCodesJob; 