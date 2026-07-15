const asyncHandler = require('express-async-handler');
const User = require('../models/user.model');
const Order = require('../models/order.model');
const Notification = require('../models/notification.model');
const AppError = require('../utils/AppError');
const ApiResponse = require('../utils/ApiResponse');
const { getPaginationFromQuery } = require('../utils/pagination');
const DeviceToken = require('../models/deviceToken.model');
const { isFcmConfigured, sendMulticastToTokens } = require('../utils/fcm');

/**
 * @route   GET /api/admin/stats
 * @access  Private / أدمن
 */
exports.getDashboardStats = asyncHandler(async (req, res) => {
    const deliveredMatch = { status: 'تم التوصيل' };

    const [salesAgg, ordersCount, usersCount, growth] = await Promise.all([
        Order.aggregate([
            { $match: deliveredMatch },
            { $group: { _id: null, totalSales: { $sum: '$totalPrice' } } }
        ]),
        Order.countDocuments(),
        User.countDocuments(),
        User.aggregate([
            {
                $match: {
                    createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
                }
            },
            { $count: 'newUsersLast30Days' }
        ])
    ]);

    const totalSales = salesAgg[0]?.totalSales ?? 0;
    const newUsersLast30Days = growth[0]?.newUsersLast30Days ?? 0;

    return ApiResponse.ok(res, 'تم جلب إحصائيات لوحة التحكم بنجاح', {
        totalSales,
        totalOrders: ordersCount,
        totalUsers: usersCount,
        newUsersLast30Days
    });
});

/**
 * @route   GET /api/admin/users
 * @access  Private / أدمن
 */
exports.listUsers = asyncHandler(async (req, res) => {
    const { page, limit, skip } = getPaginationFromQuery(req.query);
    const filter = {};
    if (req.query.role) {
        filter.role = req.query.role;
    }
    const search = (req.query.search || '').trim();
    if (search) {
        filter.$or = [
            { fullName: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { phone: { $regex: search, $options: 'i' } }
        ];
    }

    const [items, total] = await Promise.all([
        User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).select('-password'),
        User.countDocuments(filter)
    ]);

    return ApiResponse.ok(res, 'تم جلب المستخدمين بنجاح', {
        items,
        meta: { page, limit, total, pages: Math.ceil(total / limit) || 1 }
    });
});

/**
 * @route   GET /api/admin/users/:id
 * @access  Private / أدمن
 */
exports.getUserById = asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
        throw new AppError('المستخدم غير موجود', 404);
    }
    return ApiResponse.ok(res, 'تم جلب المستخدم بنجاح', user);
});

/**
 * @route   POST /api/admin/users
 * @access  Private / أدمن
 */
exports.createUser = asyncHandler(async (req, res) => {
    const { fullName, email, password, phone, role } = req.body;

    const exists = await User.findOne({ email: email.toLowerCase().trim() });
    if (exists) {
        throw new AppError('البريد الإلكتروني مستخدم بالفعل', 400);
    }

    const user = await User.create({
        fullName,
        email: email.toLowerCase().trim(),
        password,
        phone,
        role,
        cart: [],
        favorites: []
    });

    const safe = await User.findById(user._id).select('-password');
    return ApiResponse.created(res, 'تم إنشاء المستخدم بنجاح', safe);
});

/**
 * @route   PATCH /api/admin/users/:id
 * @access  Private / أدمن
 */
exports.updateUser = asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id).select('+password');
    if (!user) {
        throw new AppError('المستخدم غير موجود', 404);
    }

    const {
        fullName,
        email,
        password,
        confirmPassword,
        role,
        phone,
        favorites,
        cart
    } = req.body;

    if (password !== undefined) {
        if (password !== confirmPassword) {
            throw new AppError('كلمات المرور غير متطابقة', 400);
        }
        user.password = password;
        user.tokenVersion = (user.tokenVersion ?? 0) + 1;
    }
    if (fullName !== undefined) user.fullName = fullName;
    if (phone !== undefined) user.phone = phone;
    if (role !== undefined) user.role = role;
    if (favorites !== undefined) user.favorites = favorites;
    if (cart !== undefined) user.cart = cart;

    if (email !== undefined) {
        const nextEmail = email.toLowerCase().trim();
        if (nextEmail !== user.email) {
            const taken = await User.findOne({ email: nextEmail, _id: { $ne: user._id } });
            if (taken) {
                throw new AppError('البريد الإلكتروني مستخدم بالفعل', 400);
            }
            user.email = nextEmail;
        }
    }

    await user.save();
    const safe = await User.findById(user._id).select('-password');
    return ApiResponse.ok(res, 'تم تحديث المستخدم بنجاح', safe);
});

/**
 * @route   DELETE /api/admin/users/:id
 * @access  Private / أدمن
 */
exports.deleteUser = asyncHandler(async (req, res) => {
    if (req.params.id === req.user.id) {
        throw new AppError('لا يمكنك حذف حسابك الحالي', 400);
    }
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
        throw new AppError('المستخدم غير موجود', 404);
    }
    return ApiResponse.ok(res, 'تم حذف المستخدم');
});

/**
 * @route   POST /api/admin/push/broadcast
 * @access  Private / أدمن
 */
exports.broadcastPush = asyncHandler(async (req, res) => {
    if (!isFcmConfigured()) {
        throw new AppError('خدمة الإشعارات (FCM) غير مهيأة على الخادم', 503);
    }

    const { title, message ,user, isGlobal} = req.body;
    
    // 1. Save notification to database FIRST!
    const notification = await Notification.create({
        title,
        message,
        user: user?? null,
        isGlobal: isGlobal?? true
    });

    // 2. Then send FCM push notifications!
    const tokens = await DeviceToken.distinct('token');
    let successCount = 0, failureCount = 0;
    
    if (tokens.length > 0) {
        const fcmResult = await sendMulticastToTokens(tokens, {
            title,
            body: message
        });
        successCount = fcmResult.successCount;
        failureCount = fcmResult.failureCount;
    }

    return ApiResponse.ok(res, 'تم إرسال الرسالة الجماعية بنجاح', {
        notification,
        successCount,
        failureCount,
        totalTokens: tokens.length
    });
});
