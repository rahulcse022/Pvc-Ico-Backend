const PrivateSaleModel = require("../models/PrivateSale");
const { transactionStatus } = require("../utils/helper");

// Create a new private sale
exports.create = async (req, res) => {
  try {
    const { pvc, usdt, price, txHash } = req.body;
    const userId = req.user.userId;

    const newPrivateSale = new PrivateSaleModel({
      userId,
      pvc,
      usdt,
      price,
      status: transactionStatus.success,
      txHash,
    });

    await newPrivateSale.save();

    res.status(201).json({
      success: true,
      message: "Private sale created successfully",
      data: newPrivateSale,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get private sale by ID
exports.getById = async (req, res) => {
  try {
    const privateSaleId = req.params.privateSaleId;
    const privateSale = await PrivateSaleModel.findById(privateSaleId);

    if (!privateSale) {
      return res
        .status(404)
        .json({ success: false, message: "Private sale not found" });
    }

    res.status(200).json({
      success: true,
      data: privateSale,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all private sales by User Id
exports.getByUserId = async (req, res) => {
  try {
    const userId = req.user.userId;
    const privateSales = await PrivateSaleModel.find({ userId });

    res.status(200).json({
      success: true,
      data: privateSales,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
