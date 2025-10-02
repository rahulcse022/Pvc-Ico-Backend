const BoosterIncome = require("../models/BoosterIncome");
const Transaction = require("../models/Transactions");
const Wallet = require("../models/Wallet");

const runBoosterIncomeCron = async () => {
  try {
    const now = new Date();

    // Find all unclaimed boosters that have matured
    const maturedStakes = await BoosterIncome.find({
      isClaimed: false,
      maturedAt: { $lte: now },
    });

    for (const stake of maturedStakes) {
      const bonus = (stake.amount * stake.rewardPercent) / 100;
      const total = stake.amount + bonus;

      // Update wallet balance
      const wallet = await Wallet.findOne({ userId: stake.userId });
      if (wallet) {
        wallet.balance += total;

        const tx = new Transaction({
          userId: stake.userId,
          amount: total,
          fundType: "booster",
          transactionType: "booster",
          transactionStatus: "completed",
          betAmount: stake.amount,
        });

        await Promise.all([wallet.save(), tx.save()]);
      }

      // Update booster income record
      stake.isClaimed = true;
      await stake.save();

      console.log(
        `✅ Booster matured for user ${stake.userId}, total credited: ${total}`
      );
    }
  } catch (error) {
    console.error("❌ Error running booster income cron:", error.message);
  }
};

module.exports = runBoosterIncomeCron;
