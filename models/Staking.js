const mongoose = require("mongoose");
const { transactionStatus } = require("../utils/helper");

const StakingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    pvc: { type: Number, required: true },
    stakeTime: {
      type: Date,
      required: true,
    },
    maturityTime: {
      type: Date,
      required: true,
    },
    isClaimed: {
      type: Boolean,
      requird: true,
      default: false,
    },
    status: { type: String, default: transactionStatus.pending },
    txHash: { type: String, default: "" },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Staking", StakingSchema);
