const mongoose = require("mongoose");

const TokenPriceSchema = new mongoose.Schema(
  {
    price: {
      type: Number,
      required: true,
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("TokenPrice", TokenPriceSchema);
