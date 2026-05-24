const asyncHandler = require('express-async-handler');
const DeviceToken = require('../models/deviceToken.model');

/**
 * @route   POST /api/devices/push-token
 * @access  Public (زائر أو مسجّل مع توكن اختياري)
 */
exports.registerPushToken = asyncHandler(async (req, res) => {
    const { token } = req.body;
    const userId = req.user?.id || null;

    await DeviceToken.findOneAndUpdate(
        { token },
        { token, user: userId },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(200).json({ success: true, message: 'تم تسجيل الجهاز للإشعارات' });
});
