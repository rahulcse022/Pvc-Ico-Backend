const TokenPriceModel = require("../models/TokenPrice");

// Create a new token price entry
exports.create = async (req, res) => {
  try {
    const { price, date } = req.body;
    const userId = req.user.userId;

    // Validate admin role
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only admin can update token price data",
      });
    }

    // Validate admin role
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only admin can add token price data",
      });
    }

    const newTokenPrice = new TokenPriceModel({
      price,
      date: date || new Date(),
      createdBy: userId,
    });

    await newTokenPrice.save();

    res.status(201).json({
      success: true,
      message: "Token price data added successfully",
      data: newTokenPrice,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all token price entries
exports.getAll = async (req, res) => {
  try {
    const tokenPrices = await TokenPriceModel.find()
      .sort({ date: 1 })
      .select("price date createdAt");

    res.status(200).json({
      success: true,
      data: tokenPrices,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get token price by ID
exports.getById = async (req, res) => {
  try {
    const tokenPriceId = req.params.tokenPriceId;
    const tokenPrice = await TokenPriceModel.findById(tokenPriceId);

    if (!tokenPrice) {
      return res.status(404).json({
        success: false,
        message: "Token price data not found",
      });
    }

    res.status(200).json({
      success: true,
      data: tokenPrice,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update token price
exports.update = async (req, res) => {
  try {
    const tokenPriceId = req.params.tokenPriceId;
    const { price, date } = req.body;

    // Validate admin role
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only admin can update token price data",
      });
    }

    const tokenPrice = await TokenPriceModel.findById(tokenPriceId);

    if (!tokenPrice) {
      return res.status(404).json({
        success: false,
        message: "Token price data not found",
      });
    }

    tokenPrice.price = price || tokenPrice.price;
    tokenPrice.date = date || tokenPrice.date;

    await tokenPrice.save();

    res.status(200).json({
      success: true,
      message: "Token price data updated successfully",
      data: tokenPrice,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete token price
exports.delete = async (req, res) => {
  try {
    const tokenPriceId = req.params.tokenPriceId;

    // Validate admin role
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only admin can delete token price data",
      });
    }

    const tokenPrice = await TokenPriceModel.findByIdAndDelete(tokenPriceId);

    if (!tokenPrice) {
      return res.status(404).json({
        success: false,
        message: "Token price data not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Token price data deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
