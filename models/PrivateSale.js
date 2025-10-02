const mongoose = require("mongoose");
const { transactionStatus } = require("../utils/helper");

const PrivateSaleSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    pvc: { type: Number, required: true },
    usdt: { type: Number, required: true },
    price: { type: Number, required: true },
    status: { type: String, default: transactionStatus.pending },
    txHash: { type: String, required: true, unique: true },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("PrivateSale", PrivateSaleSchema);
