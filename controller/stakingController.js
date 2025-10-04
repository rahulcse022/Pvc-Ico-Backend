const StakingModel = require("../models/Staking");

exports.create = async (req, res) => {
  try {
    const { pvc, txHash } = req.body;
    const { userId } = req.user;

    console.log("userId of the user : ", userId);

    const maturedAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes later
    // this.maturedAt = new Date(stakedAt.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days later

    const newStake = new StakingModel({
      userId,
      pvc,
      stakedAt: new Date(),
      maturedAt: maturedAt,
      isClaimed: false,
      txHash,
    });

    await newStake.save();

    res.status(201).json({
      success: true,
      message: "Staking created successfully",
      data: newStake,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// get list of user staking
exports.getByUserId = async (req, res) => {
  try {
    const userId = req.user.userId; // From JWT token
    const stakingList = await StakingModel.find({ userId });

    res.status(200).json({
      success: true,
      message: "User staking list retrieved successfully",
      data: stakingList,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get user staking by id
exports.getById = async (req, res) => {
  try {
    const stakingId = req.params.stakingId;
    const staking = await StakingModel.findById(stakingId);

    if (!staking) {
      return res
        .status(404)
        .json({ success: false, message: "Staking not found" });
    }

    res.status(200).json({
      success: true,
      message: "Staking retrieved successfully",
      data: staking,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.claim = async (req, res) => {
  try {
    const { stakingId } = req.body;
    const { userId } = req.user;

    console.log("userId of the user : ", userId);

    const stake = await StakingModel.findById(stakingId);

    if (!stake) {
      return res
        .status(404)
        .json({ success: false, message: "Staking not found" });
    }

    if (stake.isClaimed) {
      return res
        .status(400)
        .json({ success: false, message: "Staking already claimed" });
    }

    if (stake.userId.toString() !== userId) {
      return res
        .status(403)
        .json({ success: false, message: "Not authorized to claim" });
    }

    if (stake.maturityTime > new Date()) {
      return res
        .status(400)
        .json({ success: false, message: "Staking not matured yet" });
    }

    // Update the original staking record to mark as claimed
    stake.isClaimed = true;
    await stake.save();

    return res.status(200).json({
      success: true,
      message: "Staking claimed successfully",
      data: stake,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

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
            { "user.accountNumber": { $regex: search, $options: "i" } },
            { "user.email": { $regex: search, $options: "i" } },
          ],
        }
      : {};

    // ✅ Populate user details & apply pagination + search
    const [stakingList, total] = await Promise.all([
      StakingModel.aggregate([
        {
          $lookup: {
            from: "users", // collection name in MongoDB
            localField: "userId",
            foreignField: "_id",
            as: "user",
          },
        },
        { $unwind: "$user" },
        { $match: searchFilter },
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },
        {
          $project: {
            _id: 1,
            pvc: 1,
            stakedAt: 1,
            maturedAt: 1,
            rewardPercent: 1,
            isClaimed: 1,
            txHash: 1,
            createdAt: 1,
            "user.accountNumber": 1,
            "user.email": 1,
          },
        },
      ]),
      StakingModel.aggregate([
        {
          $lookup: {
            from: "users",
            localField: "userId",
            foreignField: "_id",
            as: "user",
          },
        },
        { $unwind: "$user" },
        { $match: searchFilter },
        { $count: "total" },
      ]),
    ]);

    const totalItems = total.length > 0 ? total[0].total : 0;
    const totalPages = Math.ceil(totalItems / limit);

    // ✅ Send response
    res.status(200).json({
      success: true,
      data: stakingList,
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
