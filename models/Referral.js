const mongoose = require('mongoose');

const referralSchema = new mongoose.Schema({
  // Referrer (the user who referred someone)
  referrerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Referred user (the user who was referred)
  referredId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  // Referral code used
  referralCode: {
    type: String,
    required: true
  },
  // Level of referral (1-20)
  level: {
    type: Number,
    required: true,
    min: 1,
    max: 20
  },
  // Total earnings from this referral
  totalEarnings: {
    type: Number,
    default: 0
  },
  // Status of referral
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  // Referral chain (for multi-level tracking)
  referralChain: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    level: {
      type: Number,
      min: 1,
      max: 20
    }
  }]
}, {
  timestamps: true
});

// Add indexes for better query performance
referralSchema.index({ referrerId: 1, level: 1 });
referralSchema.index({ referredId: 1 });
referralSchema.index({ referralCode: 1 });

const Referral = mongoose.model('Referral', referralSchema);

module.exports = Referral; 