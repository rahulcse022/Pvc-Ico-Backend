const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: [true, "User ID is required"],
      trim: true,
    },
    amount: {
      type: Number,
      required: [true, "Amount is required"],
    },
    txHash: {
      type: String,
      required: false, // Made optional for betting transactions
      trim: true,
    },
    fundType: {
      type: String,
      required: [true, "Fund type is required"],
      enum: ["crypto", "fiat", "booster", "betting"],
      trim: true,
    },
    transactionType: {
      type: String,
      required: [true, "Transaction type is required"],
      enum: ["trading", "deposit", "withdraw", "booster"],
      trim: true,
    },
    transactionStatus: {
      type: String,
      required: [true, "Transaction status is required"],
      enum: ["pending", "completed", "failed", "cancelled"],
      trim: true,
    },
    fromAddress: {
      type: String,
      required: false,
      trim: true,
    },
    toAddress: {
      type: String,
      required: false,
      trim: true,
    },
    blockNumber: {
      type: Number,
      required: false,
    },
    // Betting specific fields
    betId: {
      type: String,
      required: false,
      trim: true,
    },
    betAmount: {
      type: Number,
      required: false,
    },
    adminCharges: {
      type: Number,
      required: false,
      default: 0,
    },
    prediction: {
      type: String,
      required: false,
      enum: ["BUY", "SELL"],
      trim: true,
    },
    result: {
      type: String,
      required: false,
      enum: ["pending", "win", "loss", "tie"],
      trim: true,
    },
    roundNumber: {
      type: Number,
      required: false,
    },
    multiplier: {
      type: Number,
      required: false,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Add indexes for better performance on concurrent operations
transactionSchema.index({ userId: 1, transactionType: 1, roundNumber: 1 }); // For checking existing bets
transactionSchema.index({ transactionType: 1, roundNumber: 1, result: 1 }); // For result declaration
transactionSchema.index({ userId: 1, createdAt: -1 }); // For user transaction history
transactionSchema.index({ betId: 1 }, { unique: true, sparse: true }); // For unique bet IDs
transactionSchema.index({ roundNumber: 1, createdAt: 1 }); // For round-based queries
transactionSchema.index({ transactionType: 1, transactionStatus: 1 }); // For transaction filtering

const Transaction = mongoose.model("Transaction", transactionSchema);

module.exports = Transaction;
