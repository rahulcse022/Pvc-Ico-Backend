const MonthlyIncome = require("../models/MonthlyIncome");
const Transaction = require("../models/Transactions");
const User = require("../models/User");
const Wallet = require("../models/Wallet");
const getLevelIncomeOriginal = require("../utils/getLevel");

// Calculate monthly income for a specific user and month
const calculateMonthlyIncome = async (userId, month, year) => {
  try {
    // Get the start and end of the month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999); // Last day of month

    // Find all betting transactions for the user in the specified month
    const transactions = await Transaction.find({
      userId: userId.toString(),
      transactionStatus: "completed",
      transactionType: "trading",
      createdAt: {
        $gte: startDate,
        $lte: endDate,
      },
    });

    let monthlyBet = 0;
    let totalWins = 0;
    let totalLosses = 0;
    let monthlyIncome = 0;
    let conver99PercentTo100Percent = 0;

    // Calculate totals from transactions
    transactions.forEach((transaction) => {
      if (transaction.betAmount) {
        monthlyBet += Math.abs(transaction.betAmount);
      }

      if (transaction.result === "win") {
        totalWins += 1;
        monthlyIncome += transaction.amount || 0;
      } else if (transaction.result === "loss") {
        totalLosses += 1;
        // For losses, we don't add to income (it's already negative)
      }
    });

    // Calculate monthly income (5% of total bet amount)
    conver99PercentTo100Percent = monthlyBet / 0.99;

    const { level, income } = getLevelIncomeOriginal(
      conver99PercentTo100Percent
    );

    return {
      totalBetAmount: conver99PercentTo100Percent,
      monthlyIncome: income,
      level: level,
      totalWins,
      totalLosses,
      monthlyBet,
      transactionCount: transactions.length,
    };
  } catch (error) {
    console.error("Error calculating monthly income:", error);
    throw error;
  }
};

// Process monthly income for all users (to be run at end of month)
exports.processMonthlyIncome = async (req, res) => {
  try {
    const { month, year } = req.body;

    if (!month || !year) {
      return res.status(400).json({
        success: false,
        message: "Month and year are required",
      });
    }

    // Validate month and year
    if (month < 1 || month > 12) {
      return res.status(400).json({
        success: false,
        message: "Invalid month (1-12)",
      });
    }

    if (year < 2020 || year > 2030) {
      return res.status(400).json({
        success: false,
        message: "Invalid year",
      });
    }

    // Get all users
    const users = await User.find({ role: "user" });
    let processedCount = 0;
    let totalIncomeDistributed = 0;

    for (const user of users) {
      try {
        // Check if monthly income already calculated for this user and month
        const existingMonthlyIncome = await MonthlyIncome.findOne({
          userId: user._id,
          month,
          year,
        });

        if (existingMonthlyIncome) {
          console.log(
            `Monthly income already calculated for user ${user._id} for ${month}/${year}`
          );
          continue;
        }

        // Calculate monthly income
        const incomeData = await calculateMonthlyIncome(
          user._id.toString(),
          month,
          year
        );

        // Only create record if user had betting activity
        if (incomeData.totalBetAmount > 0 && incomeData.monthlyIncome > 0) {
          // Create monthly income record
          const monthlyIncome = new MonthlyIncome({
            userId: user._id,
            month,
            year,
            totalBetAmount: incomeData.totalBetAmount,
            totalWins: incomeData.totalWins,
            totalLosses: incomeData.totalLosses,
            monthlyIncome: incomeData.monthlyIncome,
          });

          await monthlyIncome.save();

          // Add income to user's wallet
          const wallet = await Wallet.findOne({ userId: user._id.toString() });
          if (wallet) {
            wallet.balance += incomeData.monthlyIncome;
            await wallet.save();
          }

          processedCount++;
          totalIncomeDistributed += incomeData.monthlyIncome;

          console.log(
            `Processed monthly income for user ${user._id}: ${incomeData.monthlyIncome} PVC`
          );
        }
      } catch (error) {
        console.error(
          `Error processing monthly income for user ${user._id}:`,
          error
        );
      }
    }

    res.status(200).json({
      success: true,
      message: `Monthly income processed successfully for ${month}/${year}`,
      data: {
        processedCount,
        totalIncomeDistributed,
        month,
        year,
      },
    });
  } catch (error) {
    console.error("Error processing monthly income:", error);
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
    const userId = req.user.userId;

    // Get user's monthly income records
    const monthlyIncomes = await MonthlyIncome.find({ userId })
      .sort({ year: -1, month: -1 })
      .limit(12); // Last 12 months

    // Calculate current month's potential income (not yet processed)
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const incomeData = await calculateMonthlyIncome(
      userId,
      currentMonth,
      currentYear
    );
    const currentMonthData = {
      month: currentMonth,
      year: currentYear,
      totalBetAmount: incomeData.totalBetAmount,
      totalWins: incomeData.totalWins,
      totalLosses: incomeData.totalLosses,
      monthlyIncome: incomeData.monthlyIncome,
      isPaid: false,
      isCurrentMonth: true,
    };

    // Calculate total lifetime income
    const totalLifetimeIncome = monthlyIncomes.reduce((sum, income) => {
      return sum + (income.isPaid ? income.monthlyIncome : 0);
    }, 0);

    res.status(200).json({
      success: true,
      message: "Monthly income data retrieved successfully",
      data: {
        monthlyIncomes,
        currentMonthData,
        totalLifetimeIncome,
        totalRecords: monthlyIncomes.length,
      },
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
    const { month, year } = req.query;

    let query = {};
    if (month && year) {
      query.month = parseInt(month);
      query.year = parseInt(year);
    }

    const monthlyIncomes = await MonthlyIncome.find(query)
      .populate("userId", "name email")
      .sort({ year: -1, month: -1 });

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
