const mongoose = require("mongoose");

const boosterIncomeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    rewardPercent: {
      type: Number,
      required: true,
    },
    stakedAt: {
      type: Date,
      default: Date.now,
    },
    isClaimed: {
      type: Boolean,
      default: false,
    },
    maturedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Automatically set maturedAt to 5 minutes after stakedAt before saving
boosterIncomeSchema.pre("save", function (next) {
  if (!this.maturedAt) {
    const stakedAt = this.stakedAt || new Date();
    // this.maturedAt = new Date(stakedAt.getTime() + 5 * 60 * 1000); // 5 minutes later
    this.maturedAt = new Date(stakedAt.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days later
  }
  next();
});

// Add index for optimized queries
boosterIncomeSchema.index({ userId: 1, isClaimed: 1 });

const BoosterIncome = mongoose.model("BoosterIncome", boosterIncomeSchema);
module.exports = BoosterIncome;
