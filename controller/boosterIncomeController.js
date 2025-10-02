// controllers/stakingController.js
const BoosterIncome = require("../models/BoosterIncome");
const Transaction = require("../models/Transactions");
const Wallet = require("../models/Wallet");

exports.createStake = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid amount" });
    }

    const wallet = await Wallet.findOne({ userId });
    if (!wallet || wallet.balance < amount) {
      return res
        .status(400)
        .json({ success: false, message: "Insufficient balance" });
    }

    wallet.balance -= amount;

    const tx = new Transaction({
      userId,
      amount: -amount,
      fundType: "booster",
      transactionType: "withdraw",
      transactionStatus: "completed",
    });

    const booster = new BoosterIncome({
      userId,
      amount,
      rewardPercent: 5,
    });

    await Promise.all([booster.save(), tx.save(), wallet.save()]);

    return res
      .status(201)
      .json({ success: true, message: "Booster created", data: booster });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getBoosterStakes = async (req, res) => {
  try {
    const { isClaimed, page = 1, limit = 10 } = req.query;

    const filter = {};

    if (isClaimed !== undefined) {
      filter.isClaimed = isClaimed === "true";
    }

    if (req.user.role !== "admin") {
      filter.userId = req.user.userId;
    }

    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);
    const skip = (pageNumber - 1) * limitNumber;

    const [stakes, totalCount, boostedStats] = await Promise.all([
      BoosterIncome.find(filter)
        .populate("userId", "fullName email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNumber),
      BoosterIncome.countDocuments(filter),
      BoosterIncome.aggregate([
        { $match: { isClaimed: false } },
        {
          $group: {
            _id: null,
            totalBoostedAmount: { $sum: "$amount" },
          },
        },
      ]),
    ]);

    const totalPages = Math.ceil(totalCount / limitNumber);
    const boostedAmount =
      boostedStats.length > 0 ? boostedStats[0].totalBoostedAmount : 0;

    res.status(200).json({
      success: true,
      message: "Booster stakes fetched successfully",
      data: stakes,
      boostedAmount, // ⬅️ New field
      pagination: {
        total: totalCount,
        page: pageNumber,
        limit: limitNumber,
        totalPages,
        nextPage: pageNumber < totalPages,
        prevPage: pageNumber > 1,
      },
    });
  } catch (error) {
    console.error("Error fetching booster stakes:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching booster stakes",
      error: error.message,
    });
  }
};
