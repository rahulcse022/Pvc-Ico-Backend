const mongoose = require("mongoose");

const withdrawSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    transactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Transaction",
      required: true,
    },
    method: {
      type: String,
      enum: ["bank", "crypto"],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 1000,
    },
    status: {
      type: String,
      enum: ["pending", "rejected", "completed"],
      default: "pending",
    },
    // Bank transfer details
    bankDetails: {
      accountNumber: {
        type: String,
        required: function () {
          return this.method === "bank";
        },
      },
      ifscCode: {
        type: String,
        required: function () {
          return this.method === "bank";
        },
      },
      accountHolderName: {
        type: String,
        required: function () {
          return this.method === "bank";
        },
      },
      bankName: {
        type: String,
        required: function () {
          return this.method === "bank";
        },
      },
      branch: {
        type: String,
        required: function () {
          return this.method === "bank";
        },
      },
    },
    // Crypto details
    cryptoDetails: {
      cryptoAddress: {
        type: String,
        required: function () {
          return this.method === "crypto";
        },
      },
    },
    // Admin notes
    adminNotes: {
      type: String,
      default: "",
    },
    // Processing details
    processedAt: {
      type: Date,
    },
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    transactionId: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Add indexes for better query performance
withdrawSchema.index({ userId: 1, createdAt: -1 });
withdrawSchema.index({ status: 1 });
withdrawSchema.index({ method: 1 });

// Pre-save middleware to validate amount
withdrawSchema.pre("save", function (next) {
  if (this.amount < 1000) {
    return next(new Error("Minimum withdrawal amount is 1000 PVC"));
  }
  next();
});

const Withdraw = mongoose.model("Withdraw", withdrawSchema);

module.exports = Withdraw;
