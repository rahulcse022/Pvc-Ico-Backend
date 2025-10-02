const mongoose = require('mongoose');

const monthlyIncomeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  month: {
    type: Number,
    required: true,
    min: 1,
    max: 12
  },
  year: {
    type: Number,
    required: true
  },
  totalBetAmount: {
    type: Number,
    default: 0,
    required: true
  },
  totalWins: {
    type: Number,
    default: 0,
    required: true
  },
  totalLosses: {
    type: Number,
    default: 0,
    required: true
  },
  monthlyIncome: {
    type: Number,
    default: 0,
    required: true
  },
  isPaid: {
    type: Boolean,
    default: false
  },
  paidAt: {
    type: Date,
    default: null
  },
  // Store the calculation date to ensure we only calculate once per month
  calculatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound index to ensure one record per user per month
monthlyIncomeSchema.index({ userId: 1, month: 1, year: 1 }, { unique: true });

// Add indexes for better query performance
monthlyIncomeSchema.index({ userId: 1 });
monthlyIncomeSchema.index({ month: 1, year: 1 });
monthlyIncomeSchema.index({ isPaid: 1 });

const MonthlyIncome = mongoose.model('MonthlyIncome', monthlyIncomeSchema);

module.exports = MonthlyIncome; 