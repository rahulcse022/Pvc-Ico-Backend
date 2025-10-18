const userController = require("../controller/user");
const stakingController = require("../controller/stakingController");
const privateSaleController = require("../controller/privateSaleController");
const tokenPriceController = require("../controller/tokenPriceController");
const referralController = require("../controller/referral");

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
    const decoded = jwt.verify(tokenWithoutBearer, process.env.JWT_TOKEN);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(400).json({ message: "Invalid or expired token" });
  }
};

router.post("/login", userController.login);
router.post("/admin/login", userController.adminLogin);
router.post("/register", userController.register);
// router.get("/users/list", authenticateToken, userController.list);
router.patch(
  "/users/block-unblock",
  authenticateToken,
  userController.blockUnblockUser
);
router.get("/users/admin/list", authenticateToken, userController.adminList);
router.get("/auth/validate", authenticateToken, userController.validateToken);
router.put("/profile/update", authenticateToken, userController.updateProfile);
router.get("/dashboard", authenticateToken, userController.userDashboard);

// Password reset routes
router.post("/forgot-password", userController.forgotPassword);
router.post("/reset-password", userController.resetPassword);
router.get("/validate-reset-token/:token", userController.validateResetToken);

// ------------------------------- Staking routes  -------------------------------

router.post("/staking/create", authenticateToken, stakingController.create);
router.get("/staking/list", authenticateToken, stakingController.getByUserId);
router.get("/staking/:stakingId", authenticateToken, stakingController.getById);
router.get(
  "/staking/admin/list",
  authenticateToken,
  stakingController.adminList
);

//  ------------------------------- Private sale routes  -------------------------------
router.post(
  "/private-sale/create",
  authenticateToken,
  privateSaleController.create
);
router.get(
  "/private-sale/list",
  authenticateToken,
  privateSaleController.getByUserId
);
router.get(
  "/private-sale/:privateSaleId",
  authenticateToken,
  privateSaleController.getById
);
router.get(
  "/private-sale/admin/list",
  authenticateToken,
  privateSaleController.adminList
);

//  ------------------------------- Token Price routes for graph data  -------------------------------
router.post(
  "/token-price/create",
  authenticateToken,
  tokenPriceController.create
);
router.get("/token-price/list", authenticateToken, tokenPriceController.getAll);
router.get(
  "/token-price/:tokenPriceId",
  authenticateToken,
  tokenPriceController.getById
);
router.put(
  "/token-price/:tokenPriceId",
  authenticateToken,
  tokenPriceController.update
);
router.delete(
  "/token-price/:tokenPriceId",
  authenticateToken,
  tokenPriceController.delete
);

// Referral routes
router.post(
  "/referral/validate",
  referralController.validateReferralCode
);
router.get(
  "/referral/dashboard",
  authenticateToken,
  referralController.getReferralDashboard
);
router.get(
  "/referral/info",
  authenticateToken,
  referralController.getReferralInfo
);
router.get(
  "/referral/earnings",
  authenticateToken,
  referralController.getReferralEarnings
);




router.get("/dashboard", authenticateToken, userController.userDashboard);
module.exports = router;
