const mongoose = require("mongoose");

const levels = [
  "V0",
  "V1",
  "V2",
  "V3",
  "V4",
  "V5",
  "V6",
  "V7",
  "V8",
  "V9",
  "V10",
  "V11",
  "V12",
];

const walletSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: [true, "User ID is required"],
      trim: true,
    },
    level: {
      type: String,
      required: [true, "Level is required"],
      enum: levels,
      default: levels[0],
      trim: true,
    },
    balance: {
      type: Number,
      required: [true, "Balance is required"],
    },
  },
  {
    timestamps: true,
  }
);

const Wallet = mongoose.model("Wallet", walletSchema);

module.exports = Wallet;
