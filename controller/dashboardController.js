const BoosterIncome = require("../models/BoosterIncome");
const Transaction = require("../models/Transactions");
const User = require("../models/User");
const Withdraw = require("../models/Withdraw");

exports.getDashboardStats = async (req, res) => {
  try {
    const [
      totalUsers,
      activeUsers,
      inactiveUsers,
      totalDeposits,
      totalWithdrawals,
      pendingWithdrawals,
      adminIncome,
      boosterTotal,
      referralEarnings,
    ] = await Promise.all([
      // 1. Total registered users
      User.countDocuments({ role: "user" }),

      // 6. Active Users
      User.countDocuments({ role: "user", isActive: true }),

      // 7. Inactive Users
      User.countDocuments({ role: "user", isActive: false }),

      // 1. Total Deposits
      Transaction.aggregate([
        {
          $match: {
            transactionType: "deposit",
            transactionStatus: "completed",
          },
        },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]).then((res) => res[0]?.total || 0),

      // 2. Total Withdrawals
      Transaction.aggregate([
        {
          $match: {
            transactionType: "withdraw",
            transactionStatus: "completed",
          },
        },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]).then((res) => res[0]?.total || 0),

      // (not in UI but retained)
      Withdraw.countDocuments({ status: "pending" }),

      // 3. Admin Income (sum of adminCharges field)
      Transaction.aggregate([
        {
          $match: {
            transactionStatus: "completed",
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$adminCharges" },
          },
        },
      ]).then((res) => res[0]?.total || 0),

      // 4. Booster Total
      BoosterIncome.aggregate([
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]).then((res) => res[0]?.total || 0),

      // 8. Referrals (sum of referralEarnings from user table)
      User.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: "$referralEarnings" },
          },
        },
      ]).then((res) => res[0]?.total || 0),
    ]);

    // 9. Monthly Income (temporarily 0)
    const monthlyIncome = 0;

    res.status(200).json({
      success: true,
      message: "Dashboard stats fetched successfully",
      data: {
        totalDeposits,
        totalWithdrawals: totalWithdrawals * -1,
        adminIncome,
        boosterTotal,
        totalUsers,
        activeUsers,
        inactiveUsers,
        referralCount: referralEarnings,
        monthlyIncome,
        pendingWithdrawals,
      },
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard stats",
      error: error.message,
    });
  }
};
