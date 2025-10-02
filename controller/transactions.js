const Transaction = require("../models/Transactions");
const User = require("../models/User");
const Wallet = require("../models/Wallet");
const ReferralEarnings = require("../models/ReferralEarnings");
const Web3 = require("web3");
const { RPC_URL } = require("../env");

// Configure your provider here
const web3 = new Web3(RPC_URL);

const USDT_ADDRESS = "0x55d398326f99059fF775485246999027B3197955";

const USDT_ABI = [
  {
    constant: true,
    inputs: [{ name: "_owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "balance", type: "uint256" }],
    type: "function",
  },
];

exports.getUSDTBalance = async (walletAddress) => {
  try {
    const contract = new web3.eth.Contract(USDT_ABI, USDT_ADDRESS);
    const balance = await contract.methods.balanceOf(walletAddress).call();

    // USDT uses 6 decimals (not 18 like most ERC-20 tokens)
    const formattedBalance = balance / 1e6;

    console.log(`USDT Balance for ${walletAddress}: ${formattedBalance}`);
    return formattedBalance;
  } catch (err) {
    console.error("❌ Failed to fetch USDT balance:", err.message);
    return null;
  }
};

exports.create = async (req, res) => {
  try {
    const userId = req.user.userId;
    const {
      amount,
      fundType,
      transactionType,
      transactionStatus,
      txHash,
      betAmount,
      prediction,
      result,
      roundNumber,
      adminCharges,
    } = req.body;

    // Handle betting transactions with atomic operations
    if (transactionType === "trading") {
      // Validate required fields for betting
      if (!betAmount || !prediction || !roundNumber) {
        return res.status(400).json({
          success: false,
          message:
            "Bet amount, prediction, and round number are required for trading transactions",
        });
      }

      // Check if round is still active (not completed)
      const globalTimer = 10;
      if (
        !globalTimer ||
        globalTimer.roundNumber !== parseInt(roundNumber) ||
        !globalTimer.isActive
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Round is not active or has already completed. Please try the next round.",
        });
      }

      // Allow multiple bets per round - no validation restrictions
      // Users can place unlimited BUY and SELL bets on the same round

      // Find user's wallet
      const wallet = await Wallet.findOne({ userId });
      if (!wallet) {
        return res.status(400).json({
          success: false,
          message: "Wallet not found for user",
        });
      }

      // Check sufficient balance
      if (wallet.balance < Math.abs(amount)) {
        return res.status(400).json({
          success: false,
          message: "Insufficient wallet balance for betting",
        });
      }

      // Generate unique betId with timestamp and user info
      const betId = `bet_${Date.now()}_${userId}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      // Create transaction record
      const tx = new Transaction({
        userId,
        amount,
        fundType,
        transactionType,
        transactionStatus,
        betId,
        betAmount,
        prediction,
        result: result || "pending",
        roundNumber,
        adminCharges: adminCharges || 0,
      });

      // Save transaction first
      await tx.save();

      // Then update wallet balance
      wallet.balance += amount; // amount is negative for bets
      await wallet.save();

      res.status(201).json({
        success: true,
        message: "Betting transaction created successfully",
        data: {
          tx: tx.toObject(),
          wallet: wallet.toObject(),
        },
      });
      return;
    }

    // Handle deposit and withdraw (existing logic)
    // Only require txHash for deposit and withdraw transactions, not for trading
    if (transactionType !== "trading" && !txHash) {
      return res.status(400).json({
        success: false,
        message:
          "Transaction hash (txHash) is required for deposit and withdraw transactions",
      });
    }

    // Fetch transaction details from blockchain using web3.js (only for deposit/withdraw)
    let fromAddress = null;
    let toAddress = null;
    let blockNumber = null;

    if (transactionType === "deposit" || transactionType === "withdraw") {
      try {
        const tx = await web3.eth.getTransaction(txHash);
        if (!tx) {
          return res.status(400).json({
            success: false,
            message: "Transaction not found on blockchain",
          });
        }
        fromAddress = tx.from;
        toAddress = tx.to;
        blockNumber = tx.blockNumber ? Number(tx.blockNumber) : null;
      } catch (err) {
        console.log("errr -> ", err);

        return res.status(500).json({
          success: false,
          message: "Error fetching transaction from blockchain",
          error: err.message,
        });
      }
    }

    const existingUser = await User.findById(userId);
    if (!existingUser) {
      return res.status(400).json({
        success: false,
        message: "User not found",
      });
    }

    existingUser.isActive = true; // Ensure user is active
    await existingUser.save();

    // Find the user's wallet
    const wallet = await Wallet.findOne({ userId });
    if (!wallet) {
      return res.status(400).json({
        success: false,
        message: "Wallet not found for user",
      });
    }

    // Handle deposit and withdraw
    if (transactionType === "deposit") {
      wallet.balance += amount;
    } else if (transactionType === "withdraw") {
      if (wallet.balance < amount) {
        return res.status(400).json({
          success: false,
          message: "Insufficient wallet balance for withdrawal",
        });
      }
      wallet.balance -= amount;
    }
    // Save wallet changes if deposit or withdraw
    if (transactionType === "deposit" || transactionType === "withdraw") {
      await wallet.save();
    }

    // Only create transaction record for deposit and withdraw (trading transactions are handled above)
    if (transactionType === "deposit" || transactionType === "withdraw") {
      const tx = new Transaction({
        userId,
        amount,
        fundType,
        transactionType,
        transactionStatus,
        txHash,
        fromAddress,
        toAddress,
        blockNumber,
      });

      await tx.save();
    }

    res.status(201).json({
      success: true,
      message:
        transactionType === "trading"
          ? "Betting transaction created successfully"
          : "Transaction created successfully",
      data: {
        wallet: wallet.toObject(),
      },
    });
  } catch (error) {
    console.error("Transaction creation error:", error);
    res.status(500).json({
      success: false,
      message: "Error in transaction creation",
      error: error.message,
    });
  }
};

exports.list = async (req, res) => {
  try {
    // Extract userId from token
    const userId = req.user.userId;

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    const tx = await Transaction.find({ userId });

    res.status(200).json({
      success: true,
      message: "Transaction list fetched successfully",
      data: tx,
    });
  } catch (error) {
    console.error("Transaction list error:", error);
    res.status(500).json({
      success: false,
      message: "Error in transaction list",
      error: error.message,
    });
  }
};

exports.adminList = async (req, res) => {
  try {
    const { userId } = req.query;

    // Build query dynamically
    const query = userId ? { userId: String(userId) } : {};
    console.log(
      "Admin transaction query------------------------------- > :",
      query
    );

    const tx = await Transaction.find(query);

    res.status(200).json({
      success: true,
      message: "Transaction list fetched successfully",
      data: tx,
    });
  } catch (error) {
    console.error("Transaction list error:", error);
    res.status(500).json({
      success: false,
      message: "Error in transaction list",
      error: error.message,
    });
  }
};

// Process winning trade and referral earnings
exports.processWinningTrade = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { winningAmount, roundNumber } = req.body;

    if (!winningAmount || !roundNumber) {
      return res.status(400).json({
        success: false,
        message: "Winning amount and round number are required",
      });
    }

    // Process referral earnings
    const wallet = await Wallet.findOne({ userId: userId });
    if (wallet) {
      wallet.balance += winningAmount;
      await wallet.save();
    }

    await processReferralEarnings(userId, winningAmount, roundNumber);

    res.status(200).json({
      success: true,
      message: "Winning trade processed successfully",
      data: {
        winningAmount,
        roundNumber,
      },
    });
  } catch (error) {
    console.error("Process winning trade error:", error);
    res.status(500).json({
      success: false,
      message: "Error processing winning trade",
      error: error.message,
    });
  }
};

// Process referral earnings for winning trades
const processReferralEarnings = async (
  winningUserId,
  winningAmount,
  roundNumber
) => {
  try {
    // Find the user who won
    const winningUser = await User.findById(winningUserId);
    if (!winningUser) {
      console.error("Winning user not found:", winningUserId);
      return;
    }

    // Referral percentage levels
    const REFERRAL_PERCENTAGES = {
      1: 5.0, // Level 1: 5%
      2: 2.5, // Level 2: 2.5%
      3: 2.5, // Level 3: 2.5%
      4: 2.5, // Level 4: 2.5%
      5: 2.5, // Level 5: 2.5%
      6: 1.5, // Level 6: 1.5%
      7: 1.0, // Level 7: 1%
      8: 0.5, // Level 8: 0.5%
      9: 0.5, // Level 9: 0.5%
      10: 0.5, // Level 10: 0.5%
      11: 0.4, // Level 11: 0.4%
      12: 0.4, // Level 12: 0.4%
      13: 0.4, // Level 13: 0.4%
      14: 0.4, // Level 14: 0.4%
      15: 0.4, // Level 15: 0.4%
      16: 0.4, // Level 16: 0.4%
      17: 0.4, // Level 17: 0.4%
      18: 0.4, // Level 18: 0.4%
      19: 0.4, // Level 19: 0.4%
      20: 0.4, // Level 20: 0.4%
    };

    // Build referral chain (up to 20 levels)
    const referralChain = [];
    let currentUserId = winningUser._id;
    let level = 1;

    console.log(`Building referral chain for user: ${winningUser._id}`);

    while (level <= 20 && currentUserId) {
      const currentUser = await User.findById(currentUserId);
      if (!currentUser) {
        console.log(`User not found at level ${level}: ${currentUserId}`);
        break;
      }

      if (!currentUser.referredBy) {
        console.log(
          `No referrer found at level ${level} for user ${currentUserId}`
        );
        break;
      }

      console.log(
        `Found referral at level ${level}: ${currentUser.referredBy} referred by ${currentUserId}`
      );
      referralChain.push({
        userId: currentUser.referredBy,
        level: level,
      });

      currentUserId = currentUser.referredBy;
      level++;
    }

    console.log(`Total referral chain length: ${referralChain.length}`);

    if (referralChain.length === 0) {
      console.log(`No referral chain found for user ${winningUser._id}`);
    }

    // Process earnings for each level in the chain
    for (const referral of referralChain) {
      const percentage = REFERRAL_PERCENTAGES[referral.level];
      if (!percentage) {
        console.error("Invalid referral level:", referral.level);
        continue;
      }

      const earningAmount = (winningAmount * percentage) / 100;
      console.log(
        `Processing level ${referral.level} referral for user ${referral.userId}: ${earningAmount} PVC (${percentage}%)`
      );

      // Create referral earning record
      const referralEarning = new ReferralEarnings({
        userId: referral.userId,
        winningUserId: winningUserId,
        level: referral.level,
        originalWinningAmount: winningAmount,
        referralPercentage: percentage,
        earningAmount: earningAmount,
        status: "pending",
        roundNumber: roundNumber,
      });

      await referralEarning.save();
      console.log(`Created referral earning record: ${referralEarning._id}`);

      // Update user's total referral earnings
      await User.findByIdAndUpdate(referral.userId, {
        $inc: { totalReferralEarnings: earningAmount },
      });

      // Credit the wallet
      const wallet = await Wallet.findOne({
        userId: referral.userId.toString(),
      });
      if (wallet) {
        wallet.balance += earningAmount;
        await wallet.save();
        console.log(
          `Credited wallet for user ${referral.userId}: +${earningAmount} PVC`
        );
      } else {
        console.error(`Wallet not found for user ${referral.userId}`);
      }

      // Update earning status to credited
      await ReferralEarnings.findByIdAndUpdate(referralEarning._id, {
        status: "credited",
      });
    }

    console.log(
      `Processed referral earnings for user ${winningUserId}, amount: ${winningAmount}, levels: ${referralChain.length}`
    );
  } catch (error) {
    console.error("Error processing referral earnings:", error);
    // Don't throw the error to prevent breaking the main transaction flow
    // The referral earnings are a bonus feature and shouldn't break the core functionality
  }
};

exports.activity = async (req, res) => {
  try {
    const tx = await Transaction.find({});

    res.status(200).json({
      success: true,
      message: "Transaction Activity fetched successfully",
      data: tx,
    });
  } catch (error) {
    console.error("Transaction Activity error:", error);
    res.status(500).json({
      success: false,
      message: "Error in transaction Activity",
      error: error.message,
    });
  }
};

// Get betting transactions for a specific round
exports.getBets = async (req, res) => {
  try {
    const { roundNumber } = req.query;
    const userId = req.user.userId;

    if (!roundNumber) {
      return res.status(400).json({
        success: false,
        message: "Round number is required",
      });
    }

    // Find betting transactions for the specified round
    const bets = await Transaction.find({
      transactionType: "trading",
      roundNumber: parseInt(roundNumber),
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: "Betting transactions fetched successfully",
      data: bets,
    });
  } catch (error) {
    console.error("Get bets error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching betting transactions",
      error: error.message,
    });
  }
};

// Get betting activities for a specific round
exports.getActivities = async (req, res) => {
  try {
    const { roundNumber } = req.query;

    if (!roundNumber) {
      return res.status(400).json({
        success: false,
        message: "Round number is required",
      });
    }

    // Find betting transactions for the specified round (these serve as activities)
    const activities = await Transaction.find({
      transactionType: "trading",
      roundNumber: parseInt(roundNumber),
    })
      .populate("userId", "username")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: "Betting activities fetched successfully",
      data: activities,
    });
  } catch (error) {
    console.error("Get activities error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching betting activities",
      error: error.message,
    });
  }
};

// Get user's betting history
exports.getUserBets = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { roundNumber } = req.query;

    let query = {
      userId,
      transactionType: "trading",
    };

    if (roundNumber) {
      query.roundNumber = parseInt(roundNumber);
    }

    const userBets = await Transaction.find(query).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: "User betting history fetched successfully",
      data: userBets,
    });
  } catch (error) {
    console.error("Get user bets error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching user betting history",
      error: error.message,
    });
  }
};

// Update bet result (for when round completes)
exports.updateBetResult = async (req, res) => {
  try {
    const { betId, result, multiplier } = req.body;

    if (!betId || !result) {
      return res.status(400).json({
        success: false,
        message: "Bet ID and result are required",
      });
    }

    const updatedBet = await Transaction.findOneAndUpdate(
      { betId },
      {
        result,
        multiplier: multiplier || 0,
      },
      { new: true }
    );

    if (!updatedBet) {
      return res.status(404).json({
        success: false,
        message: "Bet not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Bet result updated successfully",
      data: updatedBet,
    });
  } catch (error) {
    console.error("Update bet result error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating bet result",
      error: error.message,
    });
  }
};

// Get transaction statistics and total profit for a user
exports.getTransactionStats = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get all transactions for the user
    const transactions = await Transaction.find({ userId }).sort({
      createdAt: -1,
    });

    // Calculate statistics
    const stats = {
      totalWins: 0,
      totalLosses: 0,
      totalFunds: 0,
      totalProfit: 0,
      pendingCount: 0,
      totalBets: 0,
      totalDeposits: 0,
      totalWithdrawals: 0,
    };

    let totalProfit = 0;

    transactions.forEach((transaction) => {
      switch (transaction.transactionType) {
        case "trading":
          if (transaction.result === "win") {
            stats.totalWins++;
          } else if (transaction.result === "loss") {
            stats.totalLosses++;
          }
          totalProfit += transaction.amount;
          break;
        case "deposit":
          stats.totalFunds++;
          stats.totalDeposits++;
          totalProfit += transaction.amount;
          break;
        case "withdraw":
          stats.totalWithdrawals++;
          totalProfit += transaction.amount;
          break;
        case "booster":
          stats.totalBoosters++;
          totalProfit += transaction.amount;
          break;
      }
    });

    stats.totalProfit = totalProfit;

    res.status(200).json({
      success: true,
      message: "Transaction statistics fetched successfully",
      data: {
        stats,
        transactions: transactions.map((tx) => ({
          id: tx._id,
          amount: tx.amount,
          betAmount: tx.betAmount,
          transactionType: tx.transactionType,
          prediction: tx.prediction,
          result: tx.result,
          timestamp: tx.createdAt,
          multiplier: tx.multiplier,
          roundNumber: tx.roundNumber,
        })),
      },
    });
  } catch (error) {
    console.error("Get transaction stats error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching transaction statistics",
      error: error.message,
    });
  }
};

// Get total profit from betting (profit deduction tracking)
exports.getTotalBettingProfit = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Calculate total profit from betting transactions
    // This represents the profit deduction (0.5 PVC per bet)
    const bettingTransactions = await Transaction.find({
      userId,
      transactionType: "trading",
    });

    // Calculate total profit deduction (0.5 PVC per bet)
    const totalProfitDeduction = bettingTransactions.length * 0.5;

    res.status(200).json({
      success: true,
      message: "Total betting profit fetched successfully",
      data: {
        totalProfit: totalProfitDeduction,
        totalBets: bettingTransactions.length,
      },
    });
  } catch (error) {
    console.error("Get total betting profit error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching total betting profit",
      error: error.message,
    });
  }
};

// Update multiple bet results for a round completion
exports.updateRoundResults = async (req, res) => {
  try {
    const { roundNumber, winner } = req.body;

    if (!roundNumber || !winner) {
      return res.status(400).json({
        success: false,
        message: "Round number and winner are required",
      });
    }

    // Find all pending bets for this round
    const pendingBets = await Transaction.find({
      transactionType: "trading",
      roundNumber: parseInt(roundNumber),
      result: "pending",
    });

    const updatedBets = [];

    for (const bet of pendingBets) {
      const isWinningBet = bet.prediction === winner;
      let individualWinnings = 0;
      let multiplier = 0;

      if (isWinningBet && winner !== "tie") {
        // New winning calculation: bet amount * 2 - 1
        individualWinnings = bet.betAmount * 2 - 1;
        multiplier = individualWinnings / bet.betAmount;
      }

      const updatedBet = await Transaction.findByIdAndUpdate(
        bet._id,
        {
          result: isWinningBet && winner !== "tie" ? "win" : "loss",
          multiplier: multiplier,
          amount:
            isWinningBet && winner !== "tie"
              ? individualWinnings
              : -bet.betAmount,
        },
        { new: true }
      );

      updatedBets.push(updatedBet);
    }

    res.status(200).json({
      success: true,
      message: "Round results updated successfully",
      data: {
        updatedBets,
        roundNumber,
        winner,
      },
    });
  } catch (error) {
    console.error("Update round results error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating round results",
      error: error.message,
    });
  }
};

// Get pending transactions for debugging
exports.getPendingTransactions = async (req, res) => {
  try {
    const pendingTransactions = await Transaction.find({
      transactionType: "trading",
      result: "pending",
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: "Pending transactions retrieved successfully",
      data: pendingTransactions,
    });
  } catch (error) {
    console.error("Get pending transactions error:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving pending transactions",
      error: error.message,
    });
  }
};

// Fix stuck transactions by updating their round numbers to match completed rounds
exports.fixStuckTransactions = async (req, res) => {
  try {
    const { userId } = req.user;

    // Get all pending transactions for this user
    const pendingTransactions = await Transaction.find({
      userId,
      transactionType: "trading",
      result: "pending",
    });

    const fixedTransactions = [];

    for (const transaction of pendingTransactions) {
      // Check if the round for this transaction has already completed
      // We'll mark it as a loss since the round has passed
      const updatedTransaction = await Transaction.findByIdAndUpdate(
        transaction._id,
        {
          result: "loss",
          amount: -transaction.betAmount, // User loses their bet
          multiplier: 0,
        },
        { new: true }
      );

      fixedTransactions.push(updatedTransaction);
    }

    res.status(200).json({
      success: true,
      message: "Stuck transactions fixed successfully",
      data: {
        fixedCount: fixedTransactions.length,
        transactions: fixedTransactions,
      },
    });
  } catch (error) {
    console.error("Fix stuck transactions error:", error);
    res.status(500).json({
      success: false,
      message: "Error fixing stuck transactions",
      error: error.message,
    });
  }
};
