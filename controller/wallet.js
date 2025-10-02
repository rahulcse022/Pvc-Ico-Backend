const User = require('../models/User');
const Wallet = require('../models/Wallet');

exports.get = async (req, res) => {
    try {
        const userId = req.user.userId;

        // Check if user exists
        const user = await User.findById(userId);
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'User not found'
            });
        }

        const wallet = await Wallet.findOne({ userId });

        console.log("wallet: ", wallet);

        res.status(200).json({
            success: true,
            message: 'Wallet fetched successfully',
            data: wallet.toObject()
        });
    } catch (error) {
        console.error('Wallet error:', error);
        res.status(500).json({
            success: false,
            message: 'Error in wallet',
            error: error.message
        });
    }
};






