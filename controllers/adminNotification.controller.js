const asyncHandler = require('express-async-handler');
const AdminNotification = require('../models/adminNotification.model');
const AppError = require('../utils/AppError');
const { getPaginationFromQuery } = require('../utils/pagination');

/**
 * @route   GET /api/admin/order-notifications
 * @access  Private / أدمن
 */
exports.listAdminNotifications = asyncHandler(async (req, res) => {
    const { page, limit, skip } = getPaginationFromQuery(req.query);
    const filter = {};
    if (req.query.read === 'true') filter.read = true;
    if (req.query.read === 'false') filter.read = false;

    const [items, total] = await Promise.all([
        AdminNotification.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate({ path: 'order', select: 'totalPrice status phone createdAt' }),
        AdminNotification.countDocuments(filter)
    ]);

    res.json({
        success: true,
        data: items,
        meta: { page, limit, total, pages: Math.ceil(total / limit) || 1 }
    });
});

/**
 * @route   PATCH /api/admin/order-notifications/:id/read
 * @access  Private / أدمن
 */
exports.markNotificationRead = asyncHandler(async (req, res) => {
    const doc = await AdminNotification.findByIdAndUpdate(
        req.params.id,
        { read: true },
        { new: true }
    ).populate({ path: 'order', select: 'totalPrice status phone createdAt' });

    if (!doc) {
        throw new AppError('الإشعار غير موجود', 404);
    }
    res.json({ success: true, data: doc });
});
