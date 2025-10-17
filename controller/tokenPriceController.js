const TokenPriceModel = require("../models/TokenPrice");
const validateInput = require("../utils/validateInput");

// Create a new token price entry
exports.create = async (req, res) => {
  try {
    const { price, date } = req.body;
    const userId = req.user.userId;

    // Validate admin role
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only admin can manage token price data",
      });
    }

    // Input validation using validateInput utility
    const validationError = validateInput({
      price: { value: price, required: true, type: "number" },
    });

    if (validationError) {
      return res.status(400).json(validationError);
    }

    // Additional validation for positive price
    if (price <= 0) {
      return res.status(400).json({
        success: false,
        message: "Price must be a positive number",
      });
    }
    const tokenDate = date ? new Date(date) : new Date();
    if (date && isNaN(tokenDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid date format",
      });
    }

    // Check if a token price entry exists for the given date
    const existingTokenPrice = await TokenPriceModel.findOne({
      date: {
        $gte: new Date(tokenDate.setHours(0, 0, 0, 0)),
        $lt: new Date(tokenDate.setHours(23, 59, 59, 999)),
      },
    });

    if (existingTokenPrice) {
      // Update existing entry
      const updatedTokenPrice = await TokenPriceModel.findOneAndUpdate(
        { _id: existingTokenPrice._id },
        { price, updatedBy: userId, updatedAt: new Date() },
        { new: true }
      );

      return res.status(200).json({
        success: true,
        message: "Token price data updated successfully",
        data: updatedTokenPrice,
      });
    }

    // Create new entry if none exists
    const newTokenPrice = new TokenPriceModel({
      price,
      date: tokenDate,
      createdBy: userId,
    });

    await newTokenPrice.save();

    res.status(201).json({
      success: true,
      message: "Token price data added successfully",
      data: newTokenPrice,
    });
  } catch (error) {
    console.error("Error in create token price:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while processing the token price",
    });
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

    // Input validation using validateInput utility
    const validationError = validateInput({
      tokenPriceId: { value: tokenPriceId, required: true, type: "string", isMongoId: true },
    });

    if (validationError) {
      return res.status(400).json(validationError);
    }

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

    // Input validation using validateInput utility
    const validationError = validateInput({
      tokenPriceId: { value: tokenPriceId, required: true, type: "string", isMongoId: true },
    });

    if (validationError) {
      return res.status(400).json(validationError);
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

    // Input validation using validateInput utility
    const validationError = validateInput({
      tokenPriceId: { value: tokenPriceId, required: true, type: "string", isMongoId: true },
    });

    if (validationError) {
      return res.status(400).json(validationError);
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
