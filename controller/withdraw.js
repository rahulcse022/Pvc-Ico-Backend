// Modals
const Transaction = require("../models/Transactions");
const Wallet = require("../models/Wallet");
const Withdraw = require("../models/Withdraw");
const {
  BANK_WITHDRAWAL_CHARGES,
  CRYPTO_WITHDRAWAL_CHARGES,
} = require("../utils/constant");

// Get user's withdrawal history
exports.getUserWithdrawals = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { status, page = 1, limit = 20 } = req.query;

    // Build query
    const query = { userId };

    if (status && status !== "all") {
      query.status = status;
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get withdrawals with pagination
    const withdrawals = await Withdraw.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const total = await Withdraw.countDocuments(query);

    // Calculate stats
    const stats = await Withdraw.aggregate([
      { $match: { userId: userId } },
      {
        $group: {
          _id: null,
          totalWithdrawals: { $sum: 1 },
          totalAmount: { $sum: "$amount" },
          pendingCount: {
            $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] },
          },
          completedCount: {
            $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
          },
          rejectedCount: {
            $sum: { $cond: [{ $eq: ["$status", "rejected"] }, 1, 0] },
          },
        },
      },
    ]);

    const withdrawalStats = stats[0] || {
      totalWithdrawals: 0,
      totalAmount: 0,
      pendingCount: 0,
      completedCount: 0,
      rejectedCount: 0,
    };

    res.status(200).json({
      success: true,
      message: "Withdrawals fetched successfully",
      data: {
        withdrawals: withdrawals.map((w) => w.toObject()),
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalItems: total,
          itemsPerPage: parseInt(limit),
        },
        stats: withdrawalStats,
      },
    });
  } catch (error) {
    console.error("Get withdrawals error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching withdrawals",
      error: error.message,
    });
  }
};

exports.adminList = async (req, res) => {
  try {
    const { status = "pending", page = 1, limit = 10 } = req.query;

    const filter = { status };

    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Unauthorized access",
      });
    }

    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);
    const skip = (pageNumber - 1) * limitNumber;

    const tx = await Withdraw.find(filter)
      .populate("userId", "fullName email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNumber);
    const totalCount = await Withdraw.countDocuments(filter);

    const totalPages = Math.ceil(totalCount / limitNumber);

    res.status(200).json({
      success: true,
      message: "Withdrawal transaction fetched  successfully",
      data: tx,
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
    console.error("Error fetching withdrawal tx:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching withdrawal tx",
      error: error.message,
    });
  }
};

// Get withdrawal by ID
exports.getWithdrawalById = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { withdrawalId } = req.params;

    const withdrawal = await Withdraw.findOne({
      _id: withdrawalId,
      userId,
    });

    if (!withdrawal) {
      return res.status(404).json({
        success: false,
        message: "Withdrawal not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Withdrawal fetched successfully",
      data: {
        withdrawal: withdrawal.toObject(),
      },
    });
  } catch (error) {
    console.error("Get withdrawal by ID error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching withdrawal",
      error: error.message,
    });
  }
};

// Updated createWithdrawal logic with wallet balance check and immediate deduction
exports.createWithdrawal = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { method, amount, bankDetails, cryptoDetails } = req.body;

    if (!method || !amount) {
      return res
        .status(400)
        .json({ success: false, message: "Method and amount are required" });
    }

    if (amount < 1000) {
      return res.status(400).json({
        success: false,
        message: "Minimum withdrawal amount is 1000 PVC",
      });
    }

    if (method === "bank") {
      if (
        !bankDetails ||
        !bankDetails.accountNumber ||
        !bankDetails.ifscCode ||
        !bankDetails.accountHolderName ||
        !bankDetails.bankName ||
        !bankDetails.branch
      ) {
        return res.status(400).json({
          success: false,
          message: "All bank details are required for bank transfer",
        });
      }
    } else if (method === "crypto") {
      if (!cryptoDetails || !cryptoDetails.cryptoAddress) {
        return res.status(400).json({
          success: false,
          message: "Crypto address is required for crypto withdrawal",
        });
      }
    } else {
      return res
        .status(400)
        .json({ success: false, message: "Invalid withdrawal method" });
    }

    const wallet = await Wallet.findOne({ userId });
    if (!wallet || wallet.balance < amount) {
      return res
        .status(400)
        .json({ success: false, message: "Insufficient wallet balance" });
    }

    const pendingWithdrawals = await Withdraw.countDocuments({
      userId,
      status: "pending",
    });
    if (pendingWithdrawals >= 3) {
      return res.status(400).json({
        success: false,
        message: "You can have maximum 3 pending withdrawal requests",
      });
    }

    wallet.balance -= amount;
    await wallet.save();

    // Create transaction record for withdrawal

    const tx = await Transaction.create({
      userId,
      fundType: "crypto",
      amount: -amount,
      transactionType: "withdraw",
      transactionStatus: "completed"
    });

    const withdrawal = await Withdraw.create({
      userId,
      transactionId: tx._id,
      method,
      amount,
      status: "pending",
      bankDetails: method === "bank" ? bankDetails : undefined,
      cryptoDetails: method === "crypto" ? cryptoDetails : undefined,
    });

    res.status(201).json({
      success: true,
      message: "Withdrawal request submitted successfully",
      data: { withdrawal: withdrawal.toObject() },
    });
  } catch (error) {
    console.error("Create withdrawal error:", error);
    res.status(500).json({
      success: false,
      message: "Error creating withdrawal request",
      error: error.message,
    });
  }
};

// Updated updateWithdrawalStatus to refund wallet on rejection
exports.updateWithdrawalStatus = async (req, res) => {
  try {
    const { withdrawalId } = req.params;
    const { action } = req.query;

    if (req.user.role !== "admin") {
      return res
        .status(403)
        .json({ success: false, message: "Unauthorized access" });
    }

    if (!["rejected", "approved"].includes(action)) {
      return res.status(400).json({
        success: false,
        message: "Invalid action. Must be 'rejected' or 'approved'",
      });
    }

    const withdrawal = await Withdraw.findById(withdrawalId);
    if (!withdrawal) {
      return res
        .status(404)
        .json({ success: false, message: "Withdrawal not found" });
    }

    const wallet = await Wallet.findOne({ userId: withdrawal.userId });
    if (!wallet) {
      return res
        .status(400)
        .json({ success: false, message: "Wallet not found for user" });
    }

    if (action === "rejected") {
      if (withdrawal.status !== "pending") {
        return res.status(400).json({
          success: false,
          message: "Only pending withdrawals can be rejected",
        });
      }

      withdrawal.status = "rejected";
      await withdrawal.save();

      wallet.balance += withdrawal.amount; // Refund amount
      await wallet.save();

      // update transaction by id (withdrawal.transactionId);
      const tx = await Transaction.findByIdAndUpdate(withdrawal.transactionId, {
        transactionStatus: "completed",
      });

      return res.status(200).json({
        success: true,
        message: "Withdrawal rejected and amount refunded",
      });
    }

    if (action === "approved") {
      if (withdrawal.status !== "pending") {
        return res.status(400).json({
          success: false,
          message: "Only pending withdrawals can be approved",
        });
      }

      withdrawal.status = "completed";
      withdrawal.approvedAt = new Date();

      const adminChargesPercent =
        withdrawal.method === "bank"
          ? BANK_WITHDRAWAL_CHARGES
          : CRYPTO_WITHDRAWAL_CHARGES;
      const adminCharges = (withdrawal.amount * adminChargesPercent) / 100;

      // update transaction by id (withdrawal.transactionId);
      const tx = await Transaction.findByIdAndUpdate(withdrawal.transactionId, {
        transactionStatus: "completed",
        adminCharges,
      });

      await Promise.all([tx.save(), withdrawal.save()]);

      return res
        .status(200)
        .json({ success: true, message: "Withdrawal approved successfully" });
    }
  } catch (error) {
    console.error("Update withdrawal error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating withdrawal status",
      error: error.message,
    });
  }
};
