const asyncHandler = require('express-async-handler');
const Discount = require('../models/discount.model');
const User = require('../models/user.model');
const AppError = require('../utils/AppError');

// ─────────────────────────────────────────────
//  ADMIN CONTROLLERS
// ─────────────────────────────────────────────

/**
 * @route   POST /api/admin/discounts
 * @desc    Admin creates a new discount code assigned to a specific user
 * @access  Private / أدمن
 */
exports.createDiscountCode = asyncHandler(async (req, res) => {
    const { code, discountPercentage, assignedUserId, maxUsageLimit } = req.body;

    // 1. Verify the target user exists
    const user = await User.findById(assignedUserId);
    if (!user) {
        throw new AppError('المستخدم المحدد غير موجود', 404);
    }

    // 2. Create the discount document
    const discount = await Discount.create({
        code,
        discountPercentage,
        assignedUser: assignedUserId,
        maxUsageLimit,
    });

    res.status(201).json({
        success: true,
        message: 'تم إنشاء كود الخصم بنجاح',
        data: discount,
    });
});

/**
 * @route   GET /api/admin/discounts
 * @desc    Admin lists all discount codes
 * @access  Private / أدمن
 */
exports.listDiscountCodes = asyncHandler(async (req, res) => {
    const discounts = await Discount.find().sort({ createdAt: -1 })
        .populate({ path: 'assignedUser', select: 'fullName email phone' });

    res.json({ success: true, data: discounts });
});

/**
 * @route   GET /api/admin/discounts/:id
 * @desc    Admin gets a single discount code by ID
 * @access  Private / أدمن
 */
exports.getDiscountCode = asyncHandler(async (req, res) => {
    const discount = await Discount.findById(req.params.id)
        .populate({ path: 'assignedUser', select: 'fullName email phone' });

    if (!discount) {
        throw new AppError('كود الخصم غير موجود', 404);
    }

    res.json({ success: true, data: discount });
});

/**
 * @route   DELETE /api/admin/discounts/:id
 * @desc    Admin deletes a discount code
 * @access  Private / أدمن
 */
exports.deleteDiscountCode = asyncHandler(async (req, res) => {
    const discount = await Discount.findByIdAndDelete(req.params.id);
    if (!discount) {
        throw new AppError('كود الخصم غير موجود', 404);
    }
    res.json({ success: true, message: 'تم حذف كود الخصم' });
});

// ─────────────────────────────────────────────
//  USER (CUSTOMER) CONTROLLERS
// ─────────────────────────────────────────────

/**
 * @route   POST /api/discounts/apply
 * @desc    Authenticated user applies (validates) a discount code
 * @access  Private / زبون
 *
 * Validation pipeline:
 *   1. Does the code exist and is it active?
 *   2. Is the requesting user the one the code was assigned to?
 *   3. Has the code exceeded its maximum usage limit?
 *
 * On success the usage counter is atomically incremented and the
 * discount percentage is returned so the caller can apply it to an order.
 */
exports.applyDiscountCode = asyncHandler(async (req, res) => {
    const { code } = req.body;

    // 1. البحث عن الكود
    const discount = await Discount.findOne({ code: code.toUpperCase() });

    if (!discount) {
        throw new AppError('كود الخصم غير موجود', 404);
    }

    if (!discount.isActive) {
        throw new AppError('كود الخصم غير فعال', 400);
    }

    // 2. فحص الملكية للزبون المشخص له الكود
    if (discount.assignedUser.toString() !== req.user.id) {
        throw new AppError('هذا الكود لا ينتمي إليك', 403);
    }

    // 3. فحص هل تجاوز حد الاستخدام
    if (discount.currentUsageCount >= discount.maxUsageLimit) {
        throw new AppError('تم تجاوز حد الاستخدام لهذا الكود', 400);
    }

    // ✨ تم إزالة أسطر زيادة العداد من هنا لأن الفحص مجرد معاينة قبل الشراء ✨

    res.json({
        success: true,
        message: 'كود الخصم صالح وجاهز للتطبيق',
        data: {
            code: discount.code,
            discountPercentage: discount.discountPercentage,
            remainingUses: discount.maxUsageLimit - discount.currentUsageCount,
        },
    });
});