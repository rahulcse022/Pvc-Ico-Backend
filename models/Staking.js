const mongoose = require("mongoose");

const StakingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    pvc: { type: Number, required: true },
    stakedAt: {
      type: Date,
      required: true,
    },
    maturedAt: {
      type: Date,
      required: true,
    },
    rewardPercent: {
      type: Number,
      default: 6,
    },
    isClaimed: {
      type: Boolean,
      default: false,
    },
    txHash: { type: String, required: true },
  },
  {
    timestamps: true,
  }
);

// Add index for optimized queries
StakingSchema.index({ userId: 1, isClaimed: 1 });

module.exports = mongoose.model("Staking", StakingSchema);
