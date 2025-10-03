const StakingModel = require("../models/Staking");

exports.create = async (req, res) => {
  try {
    const { pvc } = req.body;
    const { userId } = req.user;

    console.log("userId of the user : ", userId);

    const newStake = new StakingModel({
      userId,
      pvc,
      stakeTime: new Date(),
      maturityTime: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      isClaimed: false,
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
