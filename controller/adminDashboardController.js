const User = require("../models/User");
const Wallet = require("../models/Wallet");
const Staking = require("../models/Staking");
const PrivateSale = require("../models/PrivateSale");
const Referral = require("../models/Referral");
const ReferralEarnings = require("../models/ReferralEarnings");
const Withdraw = require("../models/Withdraw");
const TokenPrice = require("../models/TokenPrice");

// Helper function to get date ranges
const getDateRanges = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(today);
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    const yearAgo = new Date(today);
    yearAgo.setFullYear(yearAgo.getFullYear() - 1);

    return { today, weekAgo, monthAgo, yearAgo, now };
};

// Get comprehensive admin dashboard statistics
exports.getAdminStatistics = async (req, res) => {
    try {
        const { today, weekAgo, monthAgo, yearAgo, now } = getDateRanges();

        // ==================== USERS STATISTICS ====================
        const usersStats = await Promise.all([
            User.countDocuments(),
            User.countDocuments({ role: "user" }),
            User.countDocuments({ role: "admin" }),
            User.countDocuments({ isActive: true }),
            User.countDocuments({ isSuspended: true }),
            User.countDocuments({ isActiveReferral: true }),
            User.countDocuments({ createdAt: { $gte: today } }),
            User.countDocuments({ createdAt: { $gte: weekAgo } }),
            User.countDocuments({ createdAt: { $gte: monthAgo } }),
            User.countDocuments({ createdAt: { $gte: yearAgo } }),
            User.aggregate([
                {
                    $group: {
                        _id: null,
                        totalReferrals: { $sum: "$totalReferrals" },
                        totalReferralEarnings: { $sum: "$totalReferralEarnings" },
                    },
                },
            ]),
        ]);

        const [
            totalUsers,
            totalRegularUsers,
            totalAdmins,
            activeUsers,
            suspendedUsers,
            activeReferralUsers,
            newUsersToday,
            newUsersThisWeek,
            newUsersThisMonth,
            newUsersThisYear,
            userAggregates,
        ] = usersStats;

        const userStats = {
            total: totalUsers,
            byRole: {
                users: totalRegularUsers,
                admins: totalAdmins,
            },
            byStatus: {
                active: activeUsers,
                suspended: suspendedUsers,
                activeReferral: activeReferralUsers,
            },
            newUsers: {
                today: newUsersToday,
                thisWeek: newUsersThisWeek,
                thisMonth: newUsersThisMonth,
                thisYear: newUsersThisYear,
            },
            totalReferrals: userAggregates[0]?.totalReferrals || 0,
            totalReferralEarnings: userAggregates[0]?.totalReferralEarnings || 0,
        };

        // ==================== WALLETS STATISTICS ====================
        const walletsStats = await Promise.all([
            Wallet.countDocuments(),
            Wallet.aggregate([
                {
                    $group: {
                        _id: null,
                        totalBalance: { $sum: "$balance" },
                        averageBalance: { $avg: "$balance" },
                        minBalance: { $min: "$balance" },
                        maxBalance: { $max: "$balance" },
                    },
                },
            ]),
        ]);

        const [totalWallets, walletAggregates] = walletsStats;

        const walletStats = {
            total: totalWallets,
            balance: {
                total: walletAggregates[0]?.totalBalance || 0,
                average: walletAggregates[0]?.averageBalance || 0,
                min: walletAggregates[0]?.minBalance || 0,
                max: walletAggregates[0]?.maxBalance || 0,
            },
        };

        // ==================== STAKING STATISTICS ====================
        const stakingStats = await Promise.all([
            Staking.countDocuments(),
            Staking.aggregate([
                {
                    $group: {
                        _id: null,
                        totalStaked: { $sum: "$pvc" },
                        averageStake: { $avg: "$pvc" },
                        minStake: { $min: "$pvc" },
                        maxStake: { $max: "$pvc" },
                    },
                },
            ]),
            Staking.countDocuments({ isClaimed: false }),
            Staking.countDocuments({ isClaimed: true }),
            Staking.countDocuments({
                maturedAt: { $lte: now },
                isClaimed: false,
            }),
            Staking.countDocuments({
                maturedAt: { $gt: now },
                isClaimed: false,
            }),
            Staking.countDocuments({ createdAt: { $gte: today } }),
            Staking.countDocuments({ createdAt: { $gte: weekAgo } }),
            Staking.countDocuments({ createdAt: { $gte: monthAgo } }),
            Staking.aggregate([
                {
                    $match: { isClaimed: true },
                },
                {
                    $group: {
                        _id: null,
                        totalClaimed: { $sum: "$pvc" },
                    },
                },
            ]),
        ]);

        const [
            totalStakes,
            stakingAggregates,
            unclaimedStakes,
            claimedStakes,
            maturedUnclaimedStakes,
            activeStakes,
            newStakesToday,
            newStakesThisWeek,
            newStakesThisMonth,
            claimedAggregates,
        ] = stakingStats;

        const stakingStatsData = {
            total: totalStakes,
            totalStaked: stakingAggregates[0]?.totalStaked || 0,
            averageStake: stakingAggregates[0]?.averageStake || 0,
            minStake: stakingAggregates[0]?.minStake || 0,
            maxStake: stakingAggregates[0]?.maxStake || 0,
            byStatus: {
                claimed: claimedStakes,
                unclaimed: unclaimedStakes,
                maturedUnclaimed: maturedUnclaimedStakes,
                active: activeStakes,
            },
            totalClaimed: claimedAggregates[0]?.totalClaimed || 0,
            newStakes: {
                today: newStakesToday,
                thisWeek: newStakesThisWeek,
                thisMonth: newStakesThisMonth,
            },
        };

        // ==================== PRIVATE SALE STATISTICS ====================
        const privateSaleStats = await Promise.all([
            PrivateSale.countDocuments(),
            PrivateSale.aggregate([
                {
                    $group: {
                        _id: null,
                        totalPVC: { $sum: "$pvc" },
                        totalUSDT: { $sum: "$usdt" },
                        averagePVC: { $avg: "$pvc" },
                        averageUSDT: { $avg: "$usdt" },
                    },
                },
            ]),
            PrivateSale.countDocuments({ status: "pending" }),
            PrivateSale.countDocuments({ status: "completed" }),
            PrivateSale.countDocuments({ status: "rejected" }),
            PrivateSale.countDocuments({ createdAt: { $gte: today } }),
            PrivateSale.countDocuments({ createdAt: { $gte: weekAgo } }),
            PrivateSale.countDocuments({ createdAt: { $gte: monthAgo } }),
        ]);

        const [
            totalPrivateSales,
            privateSaleAggregates,
            pendingPrivateSales,
            completedPrivateSales,
            rejectedPrivateSales,
            newPrivateSalesToday,
            newPrivateSalesThisWeek,
            newPrivateSalesThisMonth,
        ] = privateSaleStats;

        const privateSaleStatsData = {
            total: totalPrivateSales,
            totalPVC: privateSaleAggregates[0]?.totalPVC || 0,
            totalUSDT: privateSaleAggregates[0]?.totalUSDT || 0,
            averagePVC: privateSaleAggregates[0]?.averagePVC || 0,
            averageUSDT: privateSaleAggregates[0]?.averageUSDT || 0,
            byStatus: {
                pending: pendingPrivateSales,
                completed: completedPrivateSales,
                rejected: rejectedPrivateSales,
            },
            newSales: {
                today: newPrivateSalesToday,
                thisWeek: newPrivateSalesThisWeek,
                thisMonth: newPrivateSalesThisMonth,
            },
        };

        // ==================== REFERRAL STATISTICS ====================
        const referralStats = await Promise.all([
            Referral.countDocuments(),
            Referral.countDocuments({ status: "active" }),
            Referral.countDocuments({ status: "inactive" }),
            Referral.countDocuments({ createdAt: { $gte: today } }),
            Referral.countDocuments({ createdAt: { $gte: weekAgo } }),
            Referral.countDocuments({ createdAt: { $gte: monthAgo } }),
        ]);

        const [
            totalReferrals,
            activeReferrals,
            inactiveReferrals,
            newReferralsToday,
            newReferralsThisWeek,
            newReferralsThisMonth,
        ] = referralStats;

        const referralStatsData = {
            total: totalReferrals,
            byStatus: {
                active: activeReferrals,
                inactive: inactiveReferrals,
            },
            newReferrals: {
                today: newReferralsToday,
                thisWeek: newReferralsThisWeek,
                thisMonth: newReferralsThisMonth,
            },
        };

        // ==================== REFERRAL EARNINGS STATISTICS ====================
        const referralEarningsStats = await Promise.all([
            ReferralEarnings.countDocuments(),
            ReferralEarnings.aggregate([
                {
                    $group: {
                        _id: null,
                        totalEarnings: { $sum: "$earningAmount" },
                        averageEarning: { $avg: "$earningAmount" },
                        minEarning: { $min: "$earningAmount" },
                        maxEarning: { $max: "$earningAmount" },
                    },
                },
            ]),
            ReferralEarnings.countDocuments({ status: "pending" }),
            ReferralEarnings.countDocuments({ status: "credited" }),
            ReferralEarnings.countDocuments({ status: "failed" }),
            ReferralEarnings.countDocuments({ createdAt: { $gte: today } }),
            ReferralEarnings.countDocuments({ createdAt: { $gte: weekAgo } }),
            ReferralEarnings.countDocuments({ createdAt: { $gte: monthAgo } }),
        ]);

        const [
            totalReferralEarnings,
            earningsAggregates,
            pendingEarnings,
            creditedEarnings,
            failedEarnings,
            newEarningsToday,
            newEarningsThisWeek,
            newEarningsThisMonth,
        ] = referralEarningsStats;

        const referralEarningsStatsData = {
            total: totalReferralEarnings,
            totalEarnings: earningsAggregates[0]?.totalEarnings || 0,
            averageEarning: earningsAggregates[0]?.averageEarning || 0,
            minEarning: earningsAggregates[0]?.minEarning || 0,
            maxEarning: earningsAggregates[0]?.maxEarning || 0,
            byStatus: {
                pending: pendingEarnings,
                credited: creditedEarnings,
                failed: failedEarnings,
            },
            newEarnings: {
                today: newEarningsToday,
                thisWeek: newEarningsThisWeek,
                thisMonth: newEarningsThisMonth,
            },
        };

        // ==================== WITHDRAWAL STATISTICS ====================
        const withdrawalStats = await Promise.all([
            Withdraw.countDocuments(),
            Withdraw.aggregate([
                {
                    $group: {
                        _id: null,
                        totalAmount: { $sum: "$amount" },
                        averageAmount: { $avg: "$amount" },
                        minAmount: { $min: "$amount" },
                        maxAmount: { $max: "$amount" },
                    },
                },
            ]),
            Withdraw.countDocuments({ status: "pending" }),
            Withdraw.countDocuments({ status: "completed" }),
            Withdraw.countDocuments({ status: "rejected" }),
            Withdraw.countDocuments({ method: "bank" }),
            Withdraw.countDocuments({ method: "crypto" }),
            Withdraw.aggregate([
                {
                    $match: { status: "completed" },
                },
                {
                    $group: {
                        _id: "$method",
                        totalAmount: { $sum: "$amount" },
                        count: { $sum: 1 },
                    },
                },
            ]),
            Withdraw.countDocuments({ createdAt: { $gte: today } }),
            Withdraw.countDocuments({ createdAt: { $gte: weekAgo } }),
            Withdraw.countDocuments({ createdAt: { $gte: monthAgo } }),
        ]);

        const [
            totalWithdrawals,
            withdrawalAggregates,
            pendingWithdrawals,
            completedWithdrawals,
            rejectedWithdrawals,
            bankWithdrawals,
            cryptoWithdrawals,
            withdrawalsByMethod,
            newWithdrawalsToday,
            newWithdrawalsThisWeek,
            newWithdrawalsThisMonth,
        ] = withdrawalStats;

        const withdrawalStatsData = {
            total: totalWithdrawals,
            totalAmount: withdrawalAggregates[0]?.totalAmount || 0,
            averageAmount: withdrawalAggregates[0]?.averageAmount || 0,
            minAmount: withdrawalAggregates[0]?.minAmount || 0,
            maxAmount: withdrawalAggregates[0]?.maxAmount || 0,
            byStatus: {
                pending: pendingWithdrawals,
                completed: completedWithdrawals,
                rejected: rejectedWithdrawals,
            },
            byMethod: {
                bank: bankWithdrawals,
                crypto: cryptoWithdrawals,
                completedByMethod: withdrawalsByMethod.map((item) => ({
                    method: item._id,
                    count: item.count,
                    totalAmount: item.totalAmount,
                })),
            },
            newWithdrawals: {
                today: newWithdrawalsToday,
                thisWeek: newWithdrawalsThisWeek,
                thisMonth: newWithdrawalsThisMonth,
            },
        };

        // ==================== TOKEN PRICE STATISTICS ====================
        const tokenPriceStats = await Promise.all([
            TokenPrice.countDocuments(),
            TokenPrice.findOne().sort({ createdAt: -1 }),
            TokenPrice.findOne().sort({ createdAt: 1 }),
            TokenPrice.aggregate([
                {
                    $group: {
                        _id: null,
                        averagePrice: { $avg: "$price" },
                        minPrice: { $min: "$price" },
                        maxPrice: { $max: "$price" },
                    },
                },
            ]),
            TokenPrice.countDocuments({ createdAt: { $gte: today } }),
            TokenPrice.countDocuments({ createdAt: { $gte: weekAgo } }),
            TokenPrice.countDocuments({ createdAt: { $gte: monthAgo } }),
        ]);

        const [
            totalTokenPrices,
            latestTokenPrice,
            firstTokenPrice,
            priceAggregates,
            newPricesToday,
            newPricesThisWeek,
            newPricesThisMonth,
        ] = tokenPriceStats;

        const tokenPriceStatsData = {
            total: totalTokenPrices,
            current: latestTokenPrice?.price || 0,
            first: firstTokenPrice?.price || 0,
            change: latestTokenPrice?.price
                ? latestTokenPrice.price - (firstTokenPrice?.price || 0)
                : 0,
            changePercentage: latestTokenPrice?.price && firstTokenPrice?.price
                ? ((latestTokenPrice.price - firstTokenPrice.price) / firstTokenPrice.price) * 100
                : 0,
            average: priceAggregates[0]?.averagePrice || 0,
            min: priceAggregates[0]?.minPrice || 0,
            max: priceAggregates[0]?.maxPrice || 0,
            newPrices: {
                today: newPricesToday,
                thisWeek: newPricesThisWeek,
                thisMonth: newPricesThisMonth,
            },
        };

        // ==================== OVERALL FINANCIAL SUMMARY ====================
        const financialSummary = {
            totalWalletBalance: walletStats.balance.total,
            totalStaked: stakingStatsData.totalStaked,
            totalClaimed: stakingStatsData.totalClaimed,
            totalPrivateSaleUSDT: privateSaleStatsData.totalUSDT,
            totalReferralEarnings: referralEarningsStatsData.totalEarnings,
            totalWithdrawn: withdrawalStatsData.totalAmount,
            netBalance:
                walletStats.balance.total +
                stakingStatsData.totalStaked -
                stakingStatsData.totalClaimed -
                withdrawalStatsData.totalAmount,
        };

        // ==================== RESPONSE ====================
        res.status(200).json({
            success: true,
            message: "Admin dashboard statistics retrieved successfully",
            data: {
                users: userStats,
                wallets: walletStats,
                staking: stakingStatsData,
                privateSale: privateSaleStatsData,
                referrals: referralStatsData,
                referralEarnings: referralEarningsStatsData,
                withdrawals: withdrawalStatsData,
                tokenPrice: tokenPriceStatsData,
                financialSummary,
                generatedAt: new Date().toISOString(),
            },
        });
    } catch (error) {
        console.error("Error fetching admin statistics:", error);
        res.status(500).json({
            success: false,
            message: "Error fetching admin dashboard statistics",
            error: error.message,
        });
    }
};

