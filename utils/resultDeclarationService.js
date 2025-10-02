const Transaction = require("../models/Transactions");
const User = require("../models/User");
const Wallet = require("../models/Wallet");
const ReferralEarnings = require("../models/ReferralEarnings");
const GlobalTimer = require("../models/GlobalTimer");

class ResultDeclarationService {
  constructor() {
    this.isDeclaring = false; // Prevent multiple simultaneous declarations
  }

  // Automatically declare results for a completed round
  async declareResults(roundNumber) {
    // Prevent multiple simultaneous declarations
    if (this.isDeclaring) {
      console.log(
        `🔄 Result declaration already in progress for round ${roundNumber}, skipping...`
      );
      return;
    }

    this.isDeclaring = true;

    try {
      console.log(
        `🎯 Backend: Starting automatic result declaration for round ${roundNumber}`
      );

      // Find all pending bets for this round
      const pendingBets = await Transaction.find({
        transactionType: "trading",
        roundNumber: parseInt(roundNumber),
        result: "pending",
      });

      if (pendingBets.length === 0) {
        console.log(`⚠️ No pending bets found for round ${roundNumber}`);
        return;
      }

      console.log(
        `📊 Found ${pendingBets.length} pending bets for round ${roundNumber}`
      );

      // Calculate total buy and sell amounts
      let totalBuyAmount = 0;
      let totalSellAmount = 0;

      pendingBets.forEach((bet) => {
        if (bet.prediction === "BUY") {
          totalBuyAmount += bet.betAmount;
        } else if (bet.prediction === "SELL") {
          totalSellAmount += bet.betAmount;
        }
      });

      // Determine winner based on amounts (LESS amount wins)
      let winner;
      if (totalBuyAmount < totalSellAmount) {
        winner = "BUY";
      } else if (totalSellAmount < totalBuyAmount) {
        winner = "SELL";
      } else {
        winner = "tie";
      }

      console.log(
        `🏆 Round ${roundNumber} result: ${winner} (BUY: ${totalBuyAmount}, SELL: ${totalSellAmount})`
      );

      // Store the result in GlobalTimer for synchronized access
      try {
        const globalTimer = await GlobalTimer.findOne();
        if (globalTimer) {
          globalTimer.lastRoundBuyAmount = totalBuyAmount;
          globalTimer.lastRoundSellAmount = totalSellAmount;
          globalTimer.lastRoundCompletedAt = new Date();
          await globalTimer.save();
          console.log(
            `💾 Stored round ${roundNumber} result in GlobalTimer: ${winner}`
          );
        }
      } catch (error) {
        console.error("Error storing result in GlobalTimer:", error);
      }

      // Update all bets with results
      const updatedBets = [];
      const winningUsers = new Set(); // Track users who won for referral processing

      for (const bet of pendingBets) {
        const isWinningBet = bet.prediction === winner;
        let individualWinnings = 0;
        let multiplier = 0;

        if (isWinningBet && winner !== "tie") {
          // Calculate winnings: bet amount * 2 - 1
          individualWinnings = bet.betAmount * 2 - 1;
          multiplier = individualWinnings / bet.betAmount;

          // Track winning user for referral processing
          winningUsers.add(bet.userId.toString());
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

        // Update user's wallet if they won
        if (isWinningBet && winner !== "tie") {
          try {
            const wallet = await Wallet.findOne({ userId: bet.userId });
            if (wallet) {
              wallet.balance += individualWinnings;
              await wallet.save();
              console.log(
                `💰 Updated wallet for user ${bet.userId}: +${individualWinnings}`
              );
            }
          } catch (error) {
            console.error(
              `Error updating wallet for user ${bet.userId}:`,
              error
            );
          }
        }
      }

      // Process referral earnings for all winning users
      for (const winningUserId of winningUsers) {
        try {
          const winningUser = await User.findById(winningUserId);
          if (winningUser) {
            // Find the user's winning transaction to get the winning amount
            const winningTransaction = updatedBets.find(
              (bet) =>
                bet.userId.toString() === winningUserId && bet.result === "win"
            );

            if (winningTransaction) {
              await this.processReferralEarnings(
                winningUserId,
                winningTransaction.amount,
                roundNumber
              );
            }
          }
        } catch (error) {
          console.error(
            `Error processing referral earnings for user ${winningUserId}:`,
            error
          );
        }
      }

      console.log(
        `✅ Backend: Successfully declared results for round ${roundNumber}`
      );
      console.log(
        `📈 Summary: ${
          updatedBets.filter((bet) => bet.result === "win").length
        } winners, ${
          updatedBets.filter((bet) => bet.result === "loss").length
        } losers`
      );
    } catch (error) {
      console.error(
        `❌ Error declaring results for round ${roundNumber}:`,
        error
      );
    } finally {
      // Always release the lock
      this.isDeclaring = false;
    }
  }

  // Process referral earnings for winning trades
  async processReferralEarnings(winningUserId, winningAmount, roundNumber) {
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
          `Level ${level}: ${currentUserId} -> ${currentUser.referredBy}`
        );

        // Find the referrer
        const referrer = await User.findById(currentUser.referredBy);
        if (!referrer) {
          console.log(
            `Referrer not found at level ${level}: ${currentUser.referredBy}`
          );
          break;
        }

        referralChain.push({
          level,
          userId: referrer._id,
          percentage: REFERRAL_PERCENTAGES[level] || 0,
        });

        currentUserId = referrer._id;
        level++;
      }

      console.log(`Referral chain built: ${referralChain.length} levels`);

      // Process referral earnings for each level
      for (const referral of referralChain) {
        try {
          const referralAmount = (winningAmount * referral.percentage) / 100;

          if (referralAmount > 0) {
            // Update referrer's wallet
            const referrerWallet = await Wallet.findOne({
              userId: referral.userId,
            });
            if (referrerWallet) {
              referrerWallet.balance += referralAmount;
              await referrerWallet.save();
              console.log(
                `💰 Referral earnings: Level ${referral.level}, User ${referral.userId}, Amount: ${referralAmount}`
              );
            }

            // Create referral earnings record
            const referralEarning = new ReferralEarnings({
              referrerId: referral.userId,
              referredUserId: winningUserId,
              amount: referralAmount,
              percentage: referral.percentage,
              level: referral.level,
              roundNumber: roundNumber,
              sourceTransaction: winningUserId,
            });

            await referralEarning.save();
            console.log(
              `📝 Referral earnings record created for level ${referral.level}`
            );
          }
        } catch (error) {
          console.error(
            `Error processing referral earnings for level ${referral.level}:`,
            error
          );
        }
      }
    } catch (error) {
      console.error("Error processing referral earnings:", error);
    }
  }
}

const resultDeclarationService = new ResultDeclarationService();
module.exports = resultDeclarationService;
