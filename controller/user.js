const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const mongoose = require("mongoose");
const StakingModel = require("../models/Staking");
const User = require("../models/User");
const Wallet = require("../models/Wallet");
const PasswordResetToken = require("../models/PasswordResetToken");

// Utils
const {
  sendPasswordResetEmail,
  sendPasswordResetConfirmationEmail,
  sendWelcomeEmail,
} = require("../utils/emailService");
const PrivateSale = require("../models/PrivateSale");
const validateInput = require("../utils/validateInput");
const { ADMIN_REFERRAL_CODE } = require("../utils/constant");

const generateRandomUniqueAccountNumber = async () => {
  // generate 9 digit random unique account number
  const min = 100000000; // Minimum 9-digit number
  const max = 999999999; // Maximum 9-digit number

  // Generate a random 9-digit number
  const randomNumber = Math.floor(Math.random() * (max - min + 1)) + min;

  // Check if the account number already exists in the database
  const existingUser = await User.findOne({ accountNumber: randomNumber.toString() });

  // If the account number already exists, recursively generate a new one
  if (existingUser) {
    return generateRandomUniqueAccountNumber();
  }

  return randomNumber.toString();
};

// Validate JWT token
exports.validateToken = async (req, res) => {
  try {
    // The authenticateToken middleware has already verified the token
    // and added user info to req.user
    const user = await User.findById(req.user.userId).select("-password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Token is valid",
      data: {
        user: user.toObject(),
      },
    });
  } catch (error) {
    console.error("Token validation error:", error);
    res.status(401).json({
      success: false,
      message: "Invalid token",
      error: error.message,
    });
  }
};

exports.register = async (req, res) => {
  try {
    const { name, email, phone, password, referralCode } = req.body;

    // Input validation using validateInput utility
    const validationError = validateInput({
      name: { value: name, required: true, type: "string" },
      email: { value: email, required: true, type: "string" },
      phone: { value: phone, required: true, type: "string" },
      password: { value: password, required: true, type: "string" },
    });

    if (validationError) {
      return res.status(400).json(validationError);
    }

    // Validate email format
    const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address",
      });
    }

    // Validate phone format (10 digits)
    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid 10-digit phone number",
      });
    }

    // Validate password strength
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long",
      });
    }

    // Validate full name
    if (name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: "Full name must be at least 2 characters long",
      });
    }

    // Check if user already exists with email
    const existingUserByEmail = await User.findOne({
      email: email.toLowerCase(),
    });
    if (existingUserByEmail) {
      return res.status(400).json({
        success: false,
        message: "An account with this email address already exists",
      });
    }

    // Check if user already exists with phone
    const existingUserByPhone = await User.findOne({ phone });
    if (existingUserByPhone) {
      return res.status(400).json({
        success: false,
        message: "An account with this phone number already exists",
      });
    }

    // Validate referral code if provided
    let referrer = null;
    if (referralCode && referralCode.trim()) {
      const cleanReferralCode = referralCode.toUpperCase().trim();

      // Check if it's the admin referral code "PEARLVINE"
      if (cleanReferralCode === ADMIN_REFERRAL_CODE) {
        // For admin referral, we don't need to find a specific user
        // Just set a flag to indicate it's an admin referral
        referrer = {
          _id: null, // No specific user ID for admin referral
          name: "Pearlvine Admin",
          referralCode: ADMIN_REFERRAL_CODE,
          isAdminReferral: true,
        };
      } else {
        // Check if it's a valid user referral code and the referrer is active
        const foundReferrer = await User.findOne({
          referralCode: cleanReferralCode,
          isActiveReferral: true
        });

        if (!foundReferrer) {
          return res.status(400).json({
            success: false,
            message: "Invalid referral code or referrer is not active. Please check and try again.",
          });
        }

        referrer = foundReferrer;
      }
    }


    // Create new user
    const newUserData = {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      accountNumber: await generateRandomUniqueAccountNumber(),
      password,
      role: "user",
    };

    // Only add referredBy if referrer exists and has a valid ID
    if (referrer && referrer._id) {
      newUserData.referredBy = referrer._id;
    }

    const user = new User(newUserData);

    await user.save();

    // Update referrer's total referrals count if referral code was used (only for user referrals, not admin)
    if (referrer && referrer._id) {
      await User.findByIdAndUpdate(referrer._id, {
        $inc: { totalReferrals: 1 },
      });
    }

    // Create wallet for the user with default balance 0
    const wallet = new Wallet({
      userId: user._id.toString(),
      balance: 0,
    });
    await wallet.save();

    // Generate JWT token
    const token = jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_TOKEN, {
      expiresIn: "24h",
    });

    // Return user data (excluding password)
    const userData = user.toObject();
    delete userData.password;

    // Send welcome email (skip for test users)
    if (!user.email.includes("@loadtest.com")) {
      try {
        await sendWelcomeEmail(user.email, user.name, password);
      } catch (emailError) {
        console.error("Email sending failed:", emailError);
      }
    } else {
      console.log(`📧 Skipping welcome email for test user: ${user.email}`);
    }

    res.status(201).json({
      success: true,
      message: "Account created successfully! Welcome to our platform.",
      data: {
        user: userData,
        token,
        wallet: wallet.toObject(),
      },
    });
  } catch (error) {
    console.error("Registration error:", error);

    // Handle Mongoose validation errors
    if (error.name === "ValidationError") {
      const validationErrors = Object.values(error.errors).map(
        (err) => err.message
      );
      return res.status(400).json({
        success: false,
        message: "Please check your input and try again",
        errors: validationErrors,
      });
    }

    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      const fieldName = field === "email" ? "email address" : "phone number";
      return res.status(400).json({
        success: false,
        message: `This ${fieldName} is already registered. Please use a different ${fieldName} or try logging in.`,
      });
    }

    // Handle other errors
    res.status(500).json({
      success: false,
      message: "Unable to create account at this time. Please try again later.",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
};

exports.login = async (req, res) => {
  try {
    const { accountNumber, password } = req.body;

    // Input validation using validateInput utility
    const validationError = validateInput({
      accountNumber: { value: accountNumber, required: true, type: "string" },
      password: { value: password, required: true, type: "string" },
    });

    if (validationError) {
      return res.status(400).json(validationError);
    }

    // Check if user exists
    const user = await User.findOne({ accountNumber: accountNumber.toString(), password });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid account number or password",
      });
    }

    // Generate JWT token
    const token = jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_TOKEN, {
      expiresIn: "24h",
    });

    // Return user data (excluding password)
    const userData = user.toObject();
    delete userData.password;

    res.status(200).json({
      success: true,
      message: "Login successful! Welcome back.",
      data: {
        user: userData,
        token,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    // Handle specific error cases
    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: "Please check your input and try again",
      });
    }

    // Handle other errors
    res.status(500).json({
      success: false,
      message: "Unable to log in at this time. Please try again later.",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
};

exports.adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Input validation using validateInput utility
    const validationError = validateInput({
      email: { value: email, required: true, type: "string" },
      password: { value: password, required: true, type: "string" },
    });

    if (validationError) {
      return res.status(400).json(validationError);
    }

    const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format",
      });
    }

    const user = await User.findOne({
      email: email.toLowerCase(),
      role: "admin",
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid admin credentials",
      });
    }

    if (user.password !== password) {
      return res.status(401).json({
        success: false,
        message: "Invalid admin credentials",
      });
    }

    const token = jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_TOKEN, {
      expiresIn: "24h",
    });

    const userData = user.toObject();
    delete userData.password;

    res.status(200).json({
      success: true,
      message: "Admin login successful",
      data: {
        admin: userData,
        token,
      },
    });
  } catch (error) {
    console.error("Admin login error:", error);
    res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again later.",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
};

// Update user profile
exports.updateProfile = async (req, res) => {
  try {
    const { name, phone } = req.body;
    const userId = req.user.userId; // From JWT token

    // Input validation using validateInput utility
    const validationError = validateInput({
      name: { value: name, required: true, type: "string" },
      phone: { value: phone, required: true, type: "string" },
    });

    if (validationError) {
      return res.status(400).json(validationError);
    }

    if (name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: "Full name must be at least 2 characters long",
      });
    }

    // Validate phone format
    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid 10-digit phone number",
      });
    }

    // Check if phone number is already taken by another user
    const existingUser = await User.findOne({
      phone: phone.trim(),
      _id: { $ne: userId },
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "This phone number is already registered with another account",
      });
    }

    // Update user profile
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        name: name.trim(),
        phone: phone.trim(),
      },
      {
        new: true,
        runValidators: true,
      }
    ).select("-password");

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Return user data (excluding password)
    const userData = updatedUser.toObject();
    delete userData.password;

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: {
        user: userData,
      },
    });
  } catch (error) {
    console.error("Profile update error:", error);

    // Handle validation errors
    if (error.name === "ValidationError") {
      const validationErrors = Object.values(error.errors).map(
        (err) => err.message
      );
      return res.status(400).json({
        success: false,
        message: "Please check your input and try again",
        errors: validationErrors,
      });
    }

    // Handle duplicate key errors
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "This phone number is already registered with another account",
      });
    }

    res.status(500).json({
      success: false,
      message: "Unable to update profile at this time. Please try again later.",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
};

// exports.list = async (req, res) => {
//   try {
//     const tokenInfo = req.user;
//     console.log("Token info:", tokenInfo);

//     // Fetch all users with role 'user'
//     const users = await User.find({ role: "user" });

//     // Fetch wallets for all users and merge info
//     const userWithWallets = await Promise.all(
//       users.map(async (user) => {
//         const wallet = await Wallet.findOne({ userId: user._id.toString() });

//         return {
//           ...user.toObject(),
//           wallet: wallet
//             ? {
//                 balance: wallet.balance,
//               }
//             : {
//                 balance: 0,
//               },
//         };
//       })
//     );

//     res.status(200).json({
//       success: true,
//       message: "Users list fetched successfully",
//       data: userWithWallets,
//     });
//   } catch (error) {
//     console.error("Users list error:", error);
//     res.status(500).json({
//       success: false,
//       message: "Error in users list",
//       error: error.message,
//     });
//   }
// };

exports.adminList = async (req, res) => {
  try {
    let { page = 1, limit = 10, search = "" } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);

    if (isNaN(page) || page < 1) page = 1;
    if (isNaN(limit) || limit < 1) limit = 10;

    const skip = (page - 1) * limit;

    // ✅ Build search filter
    const searchFilter = search
      ? {
        $or: [
          { accountNumber: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ],
      }
      : {};

    // ✅ Fetch paginated data and populate user details
    const [users, total] = await Promise.all([
      User.find(searchFilter).skip(skip).limit(limit).sort({ createdAt: -1 }).select("-password"),
      User.countDocuments(searchFilter),
    ]);

    const totalItems = total.length > 0 ? total[0].total : 0;
    const totalPages = Math.ceil(totalItems / limit);

    // ✅ Send response
    res.status(200).json({
      success: true,
      data: users,
      pagination: {
        totalItems,
        totalPages,
        currentPage: page,
        pageSize: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.error("Admin List Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch admin list.",
      error: error.message,
    });
  }
};

exports.blockUnblockUser = async (req, res) => {
  try {
    const { userId, isSuspended } = req.body;
    console.log("req user : ", req.user);

    // ✅ 1. Check admin authorization
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Admin access required",
      });
    }

    // ✅ 2. Universal validation
    const validationError = validateInput({
      userId: { value: userId, required: true, isMongoId: true },
      isSuspended: { value: isSuspended, required: true, type: "boolean" },
    });

    if (validationError) {
      return res.status(400).json(validationError);
    }

    // ✅ 4. Update user status
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { isSuspended },
      { new: true, runValidators: true }
    ).select("-password");

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Return user data (excluding password)
    const userData = updatedUser.toObject();
    delete userData.password;

    res.status(200).json({
      success: true,
      message: `User ${isSuspended ? "blocked" : "unblocked"} successfully`,
      data: { user: userData },
    });
  } catch (error) {
    console.error("Profile update error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to update user block status.",
      error: "Internal server error",
    });
  }
};

// Forgot password - send reset email
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // Input validation using validateInput utility
    const validationError = validateInput({
      email: { value: email, required: true, type: "string" },
    });

    if (validationError) {
      return res.status(400).json(validationError);
    }

    // Validate email format
    const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address",
      });
    }

    // Check if user exists
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      // For security reasons, don't reveal if email exists or not
      return res.status(200).json({
        success: true,
        message:
          "If an account with this email exists, a password reset link has been sent.",
      });
    }

    // Generate unique reset token
    const resetToken = crypto.randomBytes(32).toString("hex");

    // Create password reset token
    const passwordResetToken = new PasswordResetToken({
      userId: user._id,
      token: resetToken,
      email: user.email,
    });

    await passwordResetToken.save();

    // Send password reset email
    try {
      await sendPasswordResetEmail(user.email, resetToken, user.name);

      res.status(200).json({
        success: true,
        message: "Password reset link has been sent to your email address.",
      });
    } catch (emailError) {
      // If email fails, delete the token
      await PasswordResetToken.findByIdAndDelete(passwordResetToken._id);

      console.error("Email sending failed:", emailError);
      return res.status(500).json({
        success: false,
        message: "Failed to send password reset email. Please try again later.",
      });
    }
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({
      success: false,
      message:
        "An error occurred while processing your request. Please try again later.",
    });
  }
};

// Reset password - validate token and set new password
exports.resetPassword = async (req, res) => {
  try {
    const { token, password, confirmPassword } = req.body;

    // Input validation using validateInput utility
    const validationError = validateInput({
      token: { value: token, required: true, type: "string" },
      password: { value: password, required: true, type: "string" },
      confirmPassword: { value: confirmPassword, required: true, type: "string" },
    });

    if (validationError) {
      return res.status(400).json(validationError);
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long",
      });
    }

    // Find the reset token
    const resetToken = await PasswordResetToken.findOne({
      token: token,
      used: false,
    });

    if (!resetToken) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset token",
      });
    }

    // Check if token is expired
    if (resetToken.isExpired()) {
      return res.status(400).json({
        success: false,
        message:
          "Reset token has expired. Please request a new password reset.",
      });
    }

    // Find the user
    const user = await User.findById(resetToken.userId);
    if (!user) {
      return res.status(400).json({
        success: false,
        message: "User not found",
      });
    }

    // Update user password
    user.password = password;
    await user.save();

    // Mark token as used
    await resetToken.markAsUsed();

    // Send confirmation email
    try {
      await sendPasswordResetConfirmationEmail(user.email, user.name);
    } catch (emailError) {
      console.error("Failed to send confirmation email:", emailError);
      // Don't fail the request if confirmation email fails
    }

    res.status(200).json({
      success: true,
      message:
        "Password has been reset successfully. You can now log in with your new password.",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({
      success: false,
      message:
        "An error occurred while resetting your password. Please try again later.",
    });
  }
};

// Validate reset token
exports.validateResetToken = async (req, res) => {
  try {
    const { token } = req.params;

    // Input validation using validateInput utility
    const validationError = validateInput({
      token: { value: token, required: true, type: "string" },
    });

    if (validationError) {
      return res.status(400).json(validationError);
    }

    // Find the reset token
    const resetToken = await PasswordResetToken.findOne({
      token: token,
      used: false,
    });

    if (!resetToken) {
      return res.status(400).json({
        success: false,
        message: "Invalid reset token",
      });
    }

    // Check if token is expired
    if (resetToken.isExpired()) {
      return res.status(400).json({
        success: false,
        message: "Reset token has expired",
      });
    }

    res.status(200).json({
      success: true,
      message: "Reset token is valid",
    });
  } catch (error) {
    console.error("Validate reset token error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while validating the reset token",
    });
  }
};

exports.userDashboard = async (req, res) => {
  try {
    const userId = req.user.userId; // From JWT token

    // Get user information
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Get wallet information
    const wallet = await Wallet.findOne({ userId });
    const balance = wallet ? wallet.balance : 0;

    // Get staking information

    const stakingList = await StakingModel.find({ userId });
    // Note: We should not return 404 if stakingList is empty, as the user might not have any stakes yet
    const totalStaked = stakingList.reduce(
      (total, stake) => total + stake.pvc,
      0
    );

    const icoList = await PrivateSale.find({ userId });
    const totalInvestInICO = icoList.reduce(
      (total, invest) => total + invest.pvc,
      0
    );

    // Calculate total earnings (all income sources combined)
    const totalEarnings = user?.totalReferrals + user?.totalReferralEarnings;

    console.log("user is : ", user);

    res.status(200).json({
      success: true,
      data: {
        balance,
        totalEarnings,
        totalReferrals: user?.totalReferrals,
        totalReferralEarnings: user?.totalReferralEarnings,
        totalStaked,
        totalInvestInICO: totalInvestInICO,
        thisMonthRefIncome: 0,
      },
    });
  } catch (error) {
    console.error("User dashboard error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching user dashboard information",
      error: error.message,
    });
  }
};
