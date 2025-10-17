const mongoose = require('mongoose');

const referralEarningsSchema = new mongoose.Schema({
  // User who earned the referral bonus
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  winningTradeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction',
    required: false
  },

  stakingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staking',
    required: true
  },
  // Referral level (1-20)
  level: {
    type: Number,
    required: true,
    min: 1,
    max: 20
  },
  originalWinningAmount: {
    type: Number,
    required: true
  },
  // Referral percentage based on level
  referralPercentage: {
    type: Number,
    required: true
  },
  // Actual earning amount
  earningAmount: {
    type: Number,
    required: true
  },
  // Status of the earning
  status: {
    type: String,
    enum: ['pending', 'credited', 'failed'],
    default: 'pending'
  }
}, {
  timestamps: true
});

// Add indexes for better query performance
referralEarningsSchema.index({ userId: 1, createdAt: -1 });
referralEarningsSchema.index({ stakingId: 1 });
referralEarningsSchema.index({ level: 1 });
referralEarningsSchema.index({ status: 1 });

const ReferralEarnings = mongoose.model('ReferralEarnings', referralEarningsSchema);

module.exports = ReferralEarnings; 