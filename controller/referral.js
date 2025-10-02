const User = require("../models/User");
const Referral = require("../models/Referral");
const ReferralEarnings = require("../models/ReferralEarnings");
const Wallet = require("../models/Wallet");
const { JWT_TOKEN } = require("../env");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

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

// Generate unique referral code
const generateReferralCode = () => {
  return crypto.randomBytes(4).toString("hex").toUpperCase();
};

// Validate referral code
exports.validateReferralCode = async (req, res) => {
  try {
    const { referralCode } = req.body;

    if (!referralCode) {
      return res.status(400).json({
        success: false,
        message: "Referral code is required",
      });
    }

    // Check if referral code exists
    const referrer = await User.findOne({
      referralCode: referralCode.toUpperCase(),
    });

    if (!referrer) {
      return res.status(400).json({
        success: false,
        message: "Invalid referral code",
      });
    }

    res.status(200).json({
      success: true,
      message: "Valid referral code",
      data: {
        referrerName: referrer.name,
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

// Get user's referral information
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
    }).populate("winningUserId", "name email createdAt");

    // Get referral earnings
    const referralEarnings = await ReferralEarnings.find({
      userId: userId,
    })
      .sort({ createdAt: -1 })
      .limit(10);

    // Calculate total earnings by level
    const earningsByLevel = {};
    for (let level = 1; level <= 20; level++) {
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
          id: ref.winningUserId._id,
          name: ref.winningUserId.name,
          email: ref.winningUserId.email,
          joinedAt: ref.winningUserId.createdAt,
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
      .populate("winningUserId", "name email phone")
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
          winningUser: earning.winningUserId.name,
          winningUserEmail: earning.winningUserId.email,
          winningUserPhone: earning.winningUserId.phone,
          roundNumber: earning.roundNumber,
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

// Generate referral code for existing users (admin function)
exports.generateReferralCode = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Check if user is admin
    const user = await User.findById(userId);
    if (!user || user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin privileges required.",
      });
    }

    const { targetUserId } = req.body;

    if (!targetUserId) {
      return res.status(400).json({
        success: false,
        message: "Target user ID is required",
      });
    }

    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: "Target user not found",
      });
    }

    if (targetUser.referralCode) {
      return res.status(400).json({
        success: false,
        message: "User already has a referral code",
      });
    }

    // Generate unique referral code
    let referralCode;
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 10) {
      referralCode = generateReferralCode();
      const existingUser = await User.findOne({ referralCode });
      if (!existingUser) {
        isUnique = true;
      }
      attempts++;
    }

    if (!isUnique) {
      return res.status(500).json({
        success: false,
        message: "Failed to generate unique referral code",
      });
    }

    // Update user with referral code
    targetUser.referralCode = referralCode;
    await targetUser.save();

    res.status(200).json({
      success: true,
      message: "Referral code generated successfully",
      data: {
        userId: targetUser._id,
        referralCode: referralCode,
      },
    });
  } catch (error) {
    console.error("Generate referral code error:", error);
    res.status(500).json({
      success: false,
      message: "Error generating referral code",
      error: error.message,
    });
  }
};
