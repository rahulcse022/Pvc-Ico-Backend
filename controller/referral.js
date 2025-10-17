const User = require("../models/User");
const Referral = require("../models/Referral");
const ReferralEarnings = require("../models/ReferralEarnings");
const validateInput = require("../utils/validateInput");
const { ADMIN_REFERRAL_CODE } = require("../utils/constant");

// Live validate referral code and return referrer details
exports.validateReferralCode = async (req, res) => {
  try {
    const { referralCode } = req.body;

    // Input validation using validateInput utility
    const validationError = validateInput({
      referralCode: { value: referralCode, required: true, type: "string" },
    });

    if (validationError) {
      return res.status(400).json(validationError);
    }

    const cleanReferralCode = referralCode.toUpperCase().trim();

    // Check if referral code exists and referrer is active
    const referrer = await User.findOne({
      referralCode: cleanReferralCode,
      isActiveReferral: true
    }).select("-password");

    if (!referrer) {
      return res.status(400).json({
        success: false,
        message: "Invalid referral code or referrer is not active",
        data: {
          isValid: false,
          referrer: null,
        },
      });
    }

    // Return referrer details
    res.status(200).json({
      success: true,
      message: "Valid referral code",
      data: {
        referrer: {
          _id: referrer._id,
          name: referrer.name,
          email: referrer.email,
          phone: referrer.phone,
          accountNumber: referrer.accountNumber,
          referralCode: referrer.referralCode,
          isActiveReferral: referrer.isActiveReferral,
        },
        isValid: true,
        isAdminReferral: false,
      },
    });
  } catch (error) {
    console.error("Referral code validation error:", error);
    res.status(500).json({
      success: false,
      message: "Error validating referral code",
      error: error.message,
    });
  }
};

// Get commission percentage based on referral level
const getCommissionPercentage = (level) => {
  switch (level) {
    case 1:
      return 5.0; // 5% for direct referrals
    case 2:
    case 3:
    case 4:
    case 5:
      return 2.5; // 2.5% for levels 2-5
    case 6:
      return 1.5; // 1.5% for level 6
    case 7:
      return 1.0; // 1% for level 7
    case 8:
    case 9:
    case 10:
      return 0.5; // 0.5% for levels 8-10
    default:
      return 0;
  }
};

// Process referral earnings when someone stakes
exports.processReferralEarnings = async (stakerId, stakedAmount, stakingId) => {
  try {
    // Find the staker
    const staker = await User.findById(stakerId);
    if (!staker || !staker.referredBy) return;

    // Build referral chain up to 10 levels
    const referralChain = [];
    let currentUserId = staker.referredBy;
    let level = 1;

    while (currentUserId && level <= 10) {
      const referrer = await User.findById(currentUserId);
      if (!referrer) break;

      // Check if referrer is active
      if (!referrer.isActiveReferral) break;

      referralChain.push({
        userId: currentUserId,
        level: level
      });

      // Move to next level
      currentUserId = referrer.referredBy;
      level++;
    }

    // Process earnings for each level
    for (const chainItem of referralChain) {
      const commissionPercentage = getCommissionPercentage(chainItem.level);
      if (commissionPercentage === 0) continue;

      const earningAmount = (stakedAmount * commissionPercentage) / 100;

      // Create referral earning record
      const referralEarning = new ReferralEarnings({
        userId: chainItem.userId,
        stakingId: stakingId,
        level: chainItem.level,
        originalWinningAmount: stakedAmount,
        referralPercentage: commissionPercentage,
        earningAmount: earningAmount,
        status: 'credited',
      });

      await referralEarning.save();

      // Update user's total referral earnings
      await User.findByIdAndUpdate(chainItem.userId, {
        $inc: { totalReferralEarnings: earningAmount }
      });
    }
  } catch (error) {
    console.error('Error processing referral earnings:', error);
  }
};




// Get user's referral dashboard
exports.getReferralDashboard = async (req, res) => {
  try {
    const userId = req.user.userId;

    const user = await User.findById(userId).select("-password");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Get current month start and end dates
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    // Get total referrals count
    const totalReferrals = await Referral.countDocuments({ referrerId: userId });

    // Get active referrals count (users who have staked at least once)
    const activeReferrals = await Referral.aggregate([
      { $match: { referrerId: user._id } },
      {
        $lookup: {
          from: "stakings",
          localField: "referredId",
          foreignField: "userId",
          as: "stakes"
        }
      },
      {
        $match: {
          "stakes.0": { $exists: true }
        }
      },
      {
        $count: "activeCount"
      }
    ]);

    const activeReferralsCount = activeReferrals.length > 0 ? activeReferrals[0].activeCount : 0;

    // Get total income from referral earnings
    const totalIncomeResult = await ReferralEarnings.aggregate([
      { $match: { userId: user._id, status: 'credited' } },
      { $group: { _id: null, total: { $sum: "$earningAmount" } } }
    ]);

    const totalIncome = totalIncomeResult.length > 0 ? totalIncomeResult[0].total : 0;

    // Get this month's income
    const thisMonthIncomeResult = await ReferralEarnings.aggregate([
      {
        $match: {
          userId: user._id,
          status: 'credited',
          createdAt: { $gte: currentMonthStart, $lte: currentMonthEnd }
        }
      },
      { $group: { _id: null, total: { $sum: "$earningAmount" } } }
    ]);

    const thisMonthIncome = thisMonthIncomeResult.length > 0 ? thisMonthIncomeResult[0].total : 0;

    // Get level-wise breakdown
    const levelBreakdown = [];
    for (let level = 1; level <= 10; level++) {
      const levelData = await ReferralEarnings.aggregate([
        { $match: { userId: user._id, level: level, status: 'credited' } },
        {
          $group: {
            _id: null,
            totalEarnings: { $sum: "$earningAmount" },
            referralCount: { $sum: 1 }
          }
        }
      ]);

      const percentage = getCommissionPercentage(level);
      levelBreakdown.push({
        level: level,
        percentage: percentage,
        referralCount: levelData.length > 0 ? levelData[0].referralCount : 0,
        totalEarnings: levelData.length > 0 ? levelData[0].totalEarnings : 0
      });
    }

    // Get recent referrals (last 10)
    const recentReferrals = await Referral.find({ referrerId: userId })
      .populate('referredId', 'name email createdAt')
      .sort({ createdAt: -1 })
      .limit(10);

    // Get recent earnings (last 10)
    const recentEarnings = await ReferralEarnings.find({ userId: userId, status: 'credited' })
      .populate('stakingId', 'pvc stakedAt')
      .sort({ createdAt: -1 })
      .limit(10);

    res.status(200).json({
      success: true,
      message: "Referral dashboard fetched successfully",
      data: {
        // Basic info
        referralCode: user.referralCode,
        isActiveReferral: user.isActiveReferral,

        // Dashboard metrics
        totalReferrals: totalReferrals,
        activeReferrals: activeReferralsCount,
        totalIncome: totalIncome,
        thisMonthIncome: thisMonthIncome,

        // Level breakdown
        levelBreakdown: levelBreakdown,

        // Recent activity
        recentReferrals: recentReferrals.map(ref => ({
          id: ref.referredId._id,
          name: ref.referredId.name,
          email: ref.referredId.email,
          level: ref.level,
          joinedAt: ref.referredId.createdAt,
          status: ref.status
        })),

        recentEarnings: recentEarnings.map(earning => ({
          id: earning._id,
          amount: earning.earningAmount,
          level: earning.level,
          percentage: earning.referralPercentage,
          stakingAmount: earning.stakingId ? earning.stakingId.pvc : 0,
          stakingDate: earning.stakingId ? earning.stakingId.stakedAt : null,
          createdAt: earning.createdAt
        }))
      },
    });
  } catch (error) {
    console.error("Get referral dashboard error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching referral dashboard",
      error: error.message,
    });
  }
};

// Get user's referral information (legacy endpoint)
exports.getReferralInfo = async (req, res) => {
  try {
    const userId = req.user.userId;

    const user = await User.findById(userId).select("-password");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Get direct referrals
    const directReferrals = await ReferralEarnings.find({
      userId: userId,
      level: 1,
    }).populate("stakingId", "pvc stakedAt");

    // Get referral earnings
    const referralEarnings = await ReferralEarnings.find({
      userId: userId,
    })
      .sort({ createdAt: -1 })
      .limit(10);

    // Calculate total earnings by level
    const earningsByLevel = {};
    for (let level = 1; level <= 10; level++) {
      const levelEarnings = await ReferralEarnings.aggregate([
        { $match: { userId: user._id, level: level } },
        { $group: { _id: null, total: { $sum: "$earningAmount" } } },
      ]);
      earningsByLevel[level] =
        levelEarnings.length > 0 ? levelEarnings[0].total : 0;
    }

    res.status(200).json({
      success: true,
      message: "Referral information fetched successfully",
      data: {
        user: {
          referralCode: user.referralCode,
          totalReferrals: user.totalReferrals,
          totalReferralEarnings: user.totalReferralEarnings,
        },
        directReferrals: directReferrals.map((ref) => ({
          id: ref.stakingId ? ref.stakingId._id : null,
          stakingAmount: ref.stakingId ? ref.stakingId.pvc : 0,
          stakingDate: ref.stakingId ? ref.stakingId.stakedAt : null,
          level: ref.level,
        })),
        recentEarnings: referralEarnings.map((earning) => ({
          id: earning._id,
          amount: earning.earningAmount,
          level: earning.level,
          percentage: earning.referralPercentage,
          createdAt: earning.createdAt,
        })),
        earningsByLevel,
      },
    });
  } catch (error) {
    console.error("Get referral info error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching referral information",
      error: error.message,
    });
  }
};

// Get referral earnings history
exports.getReferralEarnings = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { page = 1, limit = 20 } = req.query;

    const skip = (page - 1) * limit;

    const earnings = await ReferralEarnings.find({ userId })
      .populate("stakingId", "pvc stakedAt")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await ReferralEarnings.countDocuments({ userId });

    res.status(200).json({
      success: true,
      message: "Referral earnings fetched successfully",
      data: {
        earnings: earnings.map((earning) => ({
          id: earning._id,
          amount: earning.earningAmount,
          level: earning.level,
          percentage: earning.referralPercentage,
          originalWinningAmount: earning.originalWinningAmount,
          stakingAmount: earning.stakingId ? earning.stakingId.pvc : 0,
          stakingDate: earning.stakingId ? earning.stakingId.stakedAt : null,
          status: earning.status,
          createdAt: earning.createdAt,
        })),
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: parseInt(limit),
        },
      },
    });
  } catch (error) {
    console.error("Get referral earnings error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching referral earnings",
      error: error.message,
    });
  }
};


