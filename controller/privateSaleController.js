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

// Get all private sales (Admin)
exports.adminList = async (req, res) => {
  try {
    let { page = 1, limit = 10, search = "" } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);

    if (isNaN(page) || page < 1) page = 1;
    if (isNaN(limit) || limit < 1) limit = 10;

    const skip = (page - 1) * limit;

    // ✅ Build search filter
    const searchFilter = search
      ? {
          $or: [
            { "user.accountNumber": { $regex: search, $options: "i" } },
            { "user.email": { $regex: search, $options: "i" } },
          ],
        }
      : {};

    // ✅ Populate user details & apply pagination + search
    const [privateSales, total] = await Promise.all([
      PrivateSaleModel.aggregate([
        {
          $lookup: {
            from: "users", // collection name in MongoDB
            localField: "userId",
            foreignField: "_id",
            as: "user",
          },
        },
        { $unwind: "$user" },
        { $match: searchFilter },
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },
        {
          $project: {
            _id: 1,
            pvc: 1,
            usdt: 1,
            price: 1,
            status: 1,
            txHash: 1,
            createdAt: 1,
            "user.accountNumber": 1,
            "user.email": 1,
          },
        },
      ]),
      PrivateSaleModel.aggregate([
        {
          $lookup: {
            from: "users",
            localField: "userId",
            foreignField: "_id",
            as: "user",
          },
        },
        { $unwind: "$user" },
        { $match: searchFilter },
        { $count: "total" },
      ]),
    ]);

    const totalItems = total.length > 0 ? total[0].total : 0;
    const totalPages = Math.ceil(totalItems / limit);

    // ✅ Send response
    res.status(200).json({
      success: true,
      data: privateSales,
      pagination: {
        totalItems,
        totalPages,
        currentPage: page,
        pageSize: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.error("Admin List Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch admin list.",
      error: error.message,
    });
  }
};
