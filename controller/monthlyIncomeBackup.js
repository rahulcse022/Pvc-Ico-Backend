const MonthlyIncome = require("../models/MonthlyIncome");
const Transaction = require("../models/Transactions");
const User = require("../models/User");
const Wallet = require("../models/Wallet");
const getLevelIncomeOriginal = require("../utils/getLevel");

const calculateMonthlyIncome = async (userId) => {
  try {
    const monthlyTransactions = await Transaction.find({
      userId: userId.toString(),
      transactionStatus: "completed",
      transactionType: "trading",
    });

    let monthlyBet = 0;
    let conver99PercentTo100Percent = 0;

    monthlyTransactions.forEach((tx) => {
      if (tx.betAmount) monthlyBet += Math.abs(tx.betAmount);
    });

    conver99PercentTo100Percent = monthlyBet / 0.99;

    const { level, income } = getLevelIncomeOriginal(conver99PercentTo100Percent);

    return {
      totalBetAmount: conver99PercentTo100Percent,
      monthlyIncome: income,
      level: level,
    };
  } catch (error) {
    console.error("Error calculating monthly income:", error);
    throw error;
  }
};

exports.processMonthlyIncome = async (req, res) => {
  try {
    const users = await User.find({ role: "user" });
    let processedCount = 0;
    let totalIncomeDistributed = 0;

    for (const user of users) {
      try {
        const exists = await MonthlyIncome.findOne({
          userId: user._id,
        });
        if (exists) continue;

        const incomeData = await calculateMonthlyIncome(user._id.toString());

        if (incomeData.totalBetAmount > 0 && incomeData.monthlyIncome > 0) {
          await MonthlyIncome.create({
            userId: user._id,
            totalBetAmount: incomeData.totalBetAmount,
            totalWins: incomeData.totalWins,
            totalLosses: incomeData.totalLosses,
            monthlyIncome: incomeData.monthlyIncome,
          });

          const wallet = await Wallet.findOne({ userId: user._id });
          if (wallet) {
            wallet.balance += incomeData.monthlyIncome;
            wallet.level = incomeData.level;
            await wallet.save();
          }

          processedCount++;
          totalIncomeDistributed += incomeData.monthlyIncome;
        }
      } catch (err) {
        console.error(`Error processing user ${user._id}`, err);
      }
    }

    res.status(200).json({
      success: true,
      message: `Processed monthly income `,
      data: { processedCount, totalIncomeDistributed },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error processing monthly income",
      error: error.message,
    });
  }
};

// Get monthly income for a specific user
exports.getUserMonthlyIncome = async (req, res) => {
  try {
    // Calculate current month's data
    const incomeData = await calculateMonthlyIncome(req.user.userId);

    res.status(200).json({
      success: true,
      message: "Monthly income data retrieved successfully",
      data: incomeData,
    });
  } catch (error) {
    console.error("Error getting user monthly income:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving monthly income data",
      error: error.message,
    });
  }
};

// Get monthly income statistics (admin only)
exports.getMonthlyIncomeStats = async (req, res) => {
  try {
    const monthlyIncomes = await MonthlyIncome.find({}).populate(
      "userId",
      "fullName email"
    );

    const totalIncome = monthlyIncomes.reduce(
      (sum, income) => sum + income.monthlyIncome,
      0
    );
    const totalPaidIncome = monthlyIncomes
      .filter((income) => income.isPaid)
      .reduce((sum, income) => sum + income.monthlyIncome, 0);

    res.status(200).json({
      success: true,
      message: "Monthly income statistics retrieved successfully",
      data: {
        monthlyIncomes,
        totalIncome,
        totalPaidIncome,
        totalRecords: monthlyIncomes.length,
      },
    });
  } catch (error) {
    console.error("Error getting monthly income stats:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving monthly income statistics",
      error: error.message,
    });
  }
};

// Mark monthly income as paid (admin only)
exports.markMonthlyIncomeAsPaid = async (req, res) => {
  try {
    const { monthlyIncomeId } = req.body;

    if (!monthlyIncomeId) {
      return res.status(400).json({
        success: false,
        message: "Monthly income ID is required",
      });
    }

    const monthlyIncome = await MonthlyIncome.findById(monthlyIncomeId);
    if (!monthlyIncome) {
      return res.status(404).json({
        success: false,
        message: "Monthly income record not found",
      });
    }

    if (monthlyIncome.isPaid) {
      return res.status(400).json({
        success: false,
        message: "Monthly income is already marked as paid",
      });
    }

    monthlyIncome.isPaid = true;
    monthlyIncome.paidAt = new Date();
    await monthlyIncome.save();

    res.status(200).json({
      success: true,
      message: "Monthly income marked as paid successfully",
      data: {
        monthlyIncome: monthlyIncome.toObject(),
      },
    });
  } catch (error) {
    console.error("Error marking monthly income as paid:", error);
    res.status(500).json({
      success: false,
      message: "Error marking monthly income as paid",
      error: error.message,
    });
  }
};
