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
