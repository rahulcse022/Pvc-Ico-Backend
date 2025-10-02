const userController = require("../controller/user");
// const transactionsController = require("../controller/transactions");
// const walletController = require("../controller/wallet");
// const withdrawController = require("../controller/withdraw");
// const referralController = require("../controller/referral");
// const monthlyIncomeController = require("../controller/monthlyIncome");
// const boosterIncomeController = require("../controller/boosterIncomeController");
// const dashboardController = require("../controller/dashboardController");

const { JWT_TOKEN } = require("../env");
const jwt = require("jsonwebtoken");
const express = require("express");
const router = express();

// Middleware to authenticate and verify the token
const authenticateToken = (req, res, next) => {
  const token = req.header("Authorization");

  if (!token) {
    return res.status(401).json({ message: "Access denied, token missing" });
  }

  try {
    const tokenWithoutBearer = token.startsWith("Bearer ")
      ? token.slice(7, token.length)
      : token;
    const decoded = jwt.verify(tokenWithoutBearer, JWT_TOKEN);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(400).json({ message: "Invalid or expired token" });
  }
};

router.post("/login", userController.login);
router.post("/admin/login", userController.adminLogin);
router.post("/register", userController.register);
router.get("/users/list", authenticateToken, userController.list);
router.get("/auth/validate", authenticateToken, userController.validateToken);
router.put("/profile/update", authenticateToken, userController.updateProfile);

// Password reset routes
router.post("/forgot-password", userController.forgotPassword);
router.post("/reset-password", userController.resetPassword);
router.get("/validate-reset-token/:token", userController.validateResetToken);

// // Monthly income routes
// router.get(
//   "/monthly-income",
//   authenticateToken,
//   monthlyIncomeController.getUserMonthlyIncome
// );
// router.post(
//   "/monthly-income/process",
//   authenticateToken,
//   monthlyIncomeController.processMonthlyIncome
// );
// router.get(
//   "/monthly-income/stats",
//   authenticateToken,
//   monthlyIncomeController.getMonthlyIncomeStats
// );
// router.post(
//   "/monthly-income/mark-paid",
//   authenticateToken,
//   monthlyIncomeController.markMonthlyIncomeAsPaid
// );

// // Transactions routes
// router.post(
//   "/transactions/create",
//   authenticateToken,
//   transactionsController.create
// );
// router.get(
//   "/transactions/list",
//   authenticateToken,
//   transactionsController.list
// );
// router.get(
//   "/transactions/admin/list",
//   authenticateToken,
//   transactionsController.adminList
// );
// router.get(
//   "/transactions/activity",
//   authenticateToken,
//   transactionsController.activity
// );

// // Betting routes
// router.get(
//   "/transactions/bets",
//   authenticateToken,
//   transactionsController.getBets
// );

// router.get(
//   "/transactions/live-bet",
//   authenticateToken,
//   transactionsController.getLiveBet
// );
// router.get(
//   "/transactions/activities",
//   authenticateToken,
//   transactionsController.getActivities
// );
// router.get(
//   "/transactions/user-bets",
//   authenticateToken,
//   transactionsController.getUserBets
// );
// router.put(
//   "/transactions/update-bet-result",
//   authenticateToken,
//   transactionsController.updateBetResult
// );

// // New transaction statistics routes
// router.get(
//   "/transactions/stats",
//   authenticateToken,
//   transactionsController.getTransactionStats
// );
// router.get(
//   "/transactions/total-profit",
//   authenticateToken,
//   transactionsController.getTotalBettingProfit
// );
// router.put(
//   "/transactions/update-round-results",
//   authenticateToken,
//   transactionsController.updateRoundResults
// );

// router.get(
//   "/transactions/pending",
//   authenticateToken,
//   transactionsController.getPendingTransactions
// );

// router.post(
//   "/transactions/fix-stuck",
//   authenticateToken,
//   transactionsController.fixStuckTransactions
// );

// router.get("/wallet/get", authenticateToken, walletController.get);

// router.post(
//   "/transactions/win",
//   authenticateToken,
//   transactionsController.processWinningTrade
// );

// // Withdraw routes
// router.post(
//   "/withdraw/create",
//   authenticateToken,
//   withdrawController.createWithdrawal
// );
// router.get(
//   "/withdraw/list",
//   authenticateToken,
//   withdrawController.getUserWithdrawals
// );
// router.get(
//   "/withdraw/admin/list",
//   authenticateToken,
//   withdrawController.adminList
// );
// router.get(
//   "/withdraw/:withdrawalId",
//   authenticateToken,
//   withdrawController.getWithdrawalById
// );
// router.put(
//   "/withdraw/action/:withdrawalId",
//   authenticateToken,
//   withdrawController.updateWithdrawalStatus
// );

// // Referral routes
// router.post("/referral/validate", referralController.validateReferralCode);
// router.get(
//   "/referral/info",
//   authenticateToken,
//   referralController.getReferralInfo
// );
// router.get(
//   "/referral/earnings",
//   authenticateToken,
//   referralController.getReferralEarnings
// );
// router.post(
//   "/referral/generate-code",
//   authenticateToken,
//   referralController.generateReferralCode
// );

// // Booster income routes
// router.post(
//   "/booster-income/create",
//   authenticateToken,
//   boosterIncomeController.createStake
// );
// router.get(
//   "/booster-income/list",
//   authenticateToken,
//   boosterIncomeController.getBoosterStakes
// );

// // Dashboard stats route
// router.get(
//   "/dashboard/stats",
//   authenticateToken,
//   dashboardController.getDashboardStats
// );

module.exports = router;
