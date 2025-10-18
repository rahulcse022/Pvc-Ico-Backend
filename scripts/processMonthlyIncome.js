const connectDB = require('../config/database');
const MonthlyIncome = require('../models/MonthlyIncome');
const Transaction = require('../models/Transactions');
const User = require('../models/User');
const Wallet = require('../models/Wallet');
const getLevelIncomeOriginal = require('../utils/getLevel');


// Calculate monthly income for a specific user and month
const calculateMonthlyIncome = async (userId, month, year) => {
  try {
    // Get the start and end of the month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999); // Last day of month

    // Find all betting transactions for the user in the specified month
    const transactions = await Transaction.find({
      userId: userId.toString(),
      transactionStatus: 'completed',
      transactionType: "trading",
      createdAt: {
        $gte: startDate,
        $lte: endDate
      }
    });

    let totalBetAmount = 0;
    let totalWins = 0;
    let totalLosses = 0;

    // Calculate totals from transactions
    transactions.forEach(transaction => {
      if (transaction.betAmount) {
        totalBetAmount += Math.abs(transaction.betAmount);
      }

      if (transaction?.result === 'win') {
        totalWins += 1;
      } else if (transaction?.result === 'loss') {
        totalLosses += 1;
      }
    });

    // Calculate monthly income (5% of total bet amount)
    const conver99PercentTo100Percent = totalBetAmount / 0.99;
    const { level, income } = getLevelIncomeOriginal(conver99PercentTo100Percent);

    return {
      totalWins,
      totalLosses,
      totalBetAmount: conver99PercentTo100Percent,
      monthlyIncome: income,
      level: level,
      transactionCount: transactions.length
    };
  } catch (error) {
    console.error('Error calculating monthly income:', error);
    throw error;
  }
};

// Process monthly income for all users
const processMonthlyIncome = async (month, year) => {
  try {
    // Connect to database
    await connectDB();
    console.log('📊 Database connected for monthly income processing');
    console.log(`Processing monthly income for ${month}/${year}...`);

    // Get all users
    const users = await User.find({ role: 'user' });
    let processedCount = 0;
    let totalIncomeDistributed = 0;

    for (const user of users) {
      try {
        // Check if monthly income already calculated for this user and month
        const existingMonthlyIncome = await MonthlyIncome.findOne({
          userId: user._id,
          month,
          year
        });

        if (existingMonthlyIncome) {
          console.log(`Monthly income already calculated for user ${user._id} for ${month}/${year}`);
          continue;
        }

        // Calculate monthly income
        const incomeData = await calculateMonthlyIncome(user._id.toString(), month, year);

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
            monthlyIncome: incomeData.monthlyIncome
          });

          await monthlyIncome.save();

          // Add income to user's wallet
          const wallet = await Wallet.findOne({ userId: user._id.toString() });
          if (wallet) {
            wallet.balance += incomeData.monthlyIncome;
            wallet.level = incomeData.level;
            await wallet.save();
          }

          processedCount++;
          totalIncomeDistributed += incomeData.monthlyIncome;

          console.log(`Processed monthly income for user ${user._id}: ${incomeData.monthlyIncome} PVC`);
        }
      } catch (error) {
        console.error(`Error processing monthly income for user ${user._id}:`, error);
      }
    }

    console.log(`Monthly income processing completed for ${month}/${year}`);
    console.log(`Processed: ${processedCount} users`);
    console.log(`Total income distributed: ${totalIncomeDistributed} PVC`);

    console.log('📊 Database operations completed');

    return {
      processedCount,
      totalIncomeDistributed,
      month,
      year
    };

  } catch (error) {
    console.error('Error processing monthly income:', error);
    throw error;
  }
};

// Main function
const processMonthlyIncomeJob = async () => {
  try {
    // Get command line arguments
    const args = process.argv.slice(2);
    let month, year;

    if (args.length >= 2) {
      month = parseInt(args[0]);
      year = parseInt(args[1]);
    } else {
      // Default to previous month
      const now = new Date();
      const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      month = previousMonth.getMonth() + 1;
      year = previousMonth.getFullYear();
    }

    // Validate month and year
    if (month < 1 || month > 12) {
      console.error('Invalid month (1-12)');
      process.exit(1);
    }

    if (year < 2020 || year > 2030) {
      console.error('Invalid year');
      process.exit(1);
    }

    console.log(`Starting monthly income processing for ${month}/${year}...`);

    const result = await processMonthlyIncome(month, year);

    console.log('Monthly income processing completed successfully!');
    console.log('Results:', result);
  } catch (error) {
    console.error('Error in main function:', error);
  }
};

module.exports = processMonthlyIncomeJob;