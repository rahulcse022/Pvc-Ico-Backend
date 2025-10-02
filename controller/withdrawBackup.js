// Modals
const Transaction = require("../models/Transactions");
const Wallet = require("../models/Wallet");
const Withdraw = require("../models/Withdraw");
const {
  BANK_WITHDRAWAL_CHARGES,
  CRYPTO_WITHDRAWAL_CHARGES,
} = require("../utils/constant");

// Create a new withdrawal request
exports.createWithdrawal = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { method, amount, bankDetails, cryptoDetails } = req.body;

    // Validation
    if (!method || !amount) {
      return res.status(400).json({
        success: false,
        message: "Method and amount are required",
      });
    }

    if (amount < 10) {
      return res.status(400).json({
        success: false,
        message: "Minimum withdrawal amount is 1000 PVC",
      });
    }

    // Validate method-specific details
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
      return res.status(400).json({
        success: false,
        message: "Invalid withdrawal method",
      });
    }

    // Check if user has pending withdrawals
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

    // Create withdrawal request
    const withdrawal = new Withdraw({
      userId,
      method,
      amount,
      bankDetails: method === "bank" ? bankDetails : undefined,
      cryptoDetails: method === "crypto" ? cryptoDetails : undefined,
    });

    await withdrawal.save();

    // Create transaction record for withdrawal
    try {
      await Transaction.create({
        userId,
        type: "fund",
        amount: -amount, // Negative amount for withdrawal
        betAmount: amount,
        transactionType: "withdraw",
        prediction: `${method.toUpperCase()} WITHDRAWAL`,
        result: "pending",
        multiplier: 1,
        roundNumber: 0,
      });
    } catch (transactionError) {
      console.error(
        "Failed to create withdrawal transaction:",
        transactionError
      );
    }

    res.status(201).json({
      success: true,
      message: "Withdrawal request submitted successfully",
      data: {
        withdrawal: withdrawal.toObject(),
      },
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
      .populate("userId", "name email")
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

// Cancel or Approve withdrawal request (based on action param)
exports.updateWithdrawalStatus = async (req, res) => {
  try {
    const { withdrawalId } = req.params;
    const { action } = req.query; // action can be 'cancel' or 'approve'

    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Unauthorized access",
      });
    }

    if (!["rejected", "approved"].includes(action)) {
      return res.status(400).json({
        success: false,
        message: "Invalid action. Must be 'rejected' or 'approved'",
      });
    }

    const withdrawal = await Withdraw.findById(withdrawalId);

    if (!withdrawal) {
      return res.status(404).json({
        success: false,
        message: "Withdrawal not found",
      });
    }

    // Cancel by user (only if status is pending)
    if (action === "rejected") {
      if (withdrawal.status !== "pending") {
        return res.status(400).json({
          success: false,
          message: "Only pending withdrawals can be cancelled",
        });
      }

      withdrawal.status = "rejected";
      await withdrawal.save();

      return res.status(200).json({
        success: true,
        message: "Withdrawal rejected successfully",
      });
    }

    // Approve by admin
    if (action === "approved") {
      if (req.user.role !== "admin") {
        return res.status(403).json({
          success: false,
          message: "Only admin can approve withdrawals",
        });
      }

      if (withdrawal.status !== "pending") {
        return res.status(400).json({
          success: false,
          message: "Only pending withdrawals can be approved",
        });
      }

      withdrawal.status = "completed";
      withdrawal.approvedAt = new Date();

      // Find the user's wallet
      const wallet = await Wallet.findOne({ userId: withdrawal?.userId });
      if (!wallet) {
        return res.status(400).json({
          success: false,
          message: "Wallet not found for user",
        });
      }

      if (wallet.balance < withdrawal.amount) {
        return res.status(400).json({
          success: false,
          message: "Insufficient wallet balance for withdrawal",
        });
      }
      const adminChargesPercent =
        withdrawal.method === "bank"
          ? BANK_WITHDRAWAL_CHARGES
          : CRYPTO_WITHDRAWAL_CHARGES;

      const adminCharges = (withdrawal.amount * adminChargesPercent) / 100;
      wallet.balance -= withdrawal.amount;

      const tx = new Transaction({
        userId: withdrawal.userId,
        amount: -withdrawal.amount,
        fundType: withdrawal.method === "crypto" ? "crypto" : "fiat",
        transactionType: "withdraw",
        transactionStatus: "completed",
        adminCharges: adminCharges,
      });

      await Promise.all([
        await tx.save(),
        await withdrawal.save(),
        await wallet.save(),
      ]);

      return res.status(200).json({
        success: true,
        message: "Withdrawal approved successfully",
      });
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
