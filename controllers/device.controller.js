//تسجيل توكن الجهاز لارسال للمستهدم اشعارات
const asyncHandler = require('express-async-handler');
const DeviceToken = require('../models/deviceToken.model');
const ApiResponse = require('../utils/ApiResponse');

/**
 * @route   POST /api/devices/push-token
 * @access  Public (زائر أو مسجّل مع توكن اختياري)
 */
exports.registerPushToken = asyncHandler(async (req, res) => {
    const { token } = req.body;
    const userId = req.user?.id || null;

    // خزن النتيجة في متغير
    const updatedDevice = await DeviceToken.findOneAndUpdate(
    { token },
    { token, user: userId },
    { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // أرسل البيانات المحفوظة داخل الـ Response
    return ApiResponse.ok(res, 'تم تسجيل الجهاز للإشعارات', { device: updatedDevice });
});
