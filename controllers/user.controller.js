const asyncHandler = require('express-async-handler');
const User = require('../models/user.model');
const AppError = require('../utils/AppError');
const ApiResponse = require('../utils/ApiResponse');
const Product = require('../models/product.model');
const bcrypt = require('bcryptjs');
const { getEffectiveUnitPrice } = require('../utils/productPrice');

const userPopulate = [
    { path: 'favorites', select: 'name price images category isActive isMostRequested sizes' },
    { path: 'cart.product', select: 'name images category isActive offerPrice sizes' }
];

/**
 * @desc    Get logged-in user profile
 * @route   GET /api/users/me
 * @access  Private
 */
exports.getMe = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id).select('-password').populate(userPopulate);
    if (!user) {
        throw new AppError('المستخدم غير موجود', 404);
    }
    return ApiResponse.ok(res, 'تم جلب الملف الشخصي بنجاح', user);
});

/**
 * @desc    Update logged-in user profile (Basic info only)
 * @route   PATCH /api/users/me
 * @access  Private
 */
exports.updateMe = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id);
    if (!user) {
        throw new AppError('المستخدم غير موجود', 404);
    }
    // الحماية: نستخرج فقط الحقول الآمنة والمسموح بتعديلها
    const { fullName, email, phone, addresses } = req.body;

    // التحقق من فرادة البريد الإلكتروني الجديد
    if (email && email.toLowerCase().trim() !== user.email) {
        const emailExists = await User.findOne({ 
            email: email.toLowerCase().trim(),
            _id: { $ne: user._id } // ابحث عن هذا الإيميل بشرط ألا يكون هو نفس المستخدم الحالي
        });

        if (emailExists) {
            throw new AppError('هذا البريد الإلكتروني مستخدم بالفعل من قبل حساب آخر', 400);
        }
        user.email = email.toLowerCase().trim();
    }
    //  منع المستخدم من محاولة تعديل أشياء حساسة من هنا
    if (req.body.password || req.body.confirmPassword) {
        throw new AppError('لا يمكنك تغيير كلمة المرور من هذا الرابط. الرجاء استخدام الرابط المخصص لذلك', 400);
    }
    if (req.body.cart || req.body.favorites || req.body.role) {
        throw new AppError('غير مسموح بتعديل هذه البيانات من الملف الشخصي', 403);
    }

    // تحديث البيانات المسموحة فقط
    if (fullName !== undefined) user.fullName = fullName;
    if (phone !== undefined) user.phone = phone;
    if (addresses !== undefined) {
        user.addresses = addresses;
    }

    await user.save();
    //  إرجاع المستخدم بعد التحديث
    const updated = await User.findById(user._id).select('-password').populate(userPopulate); 

    return ApiResponse.ok(res, 'تم تحديث الملف الشخصي بنجاح', updated);
});

exports.changePassword = asyncHandler(async (req, res, next) => {
    const { oldPassword, newPassword } = req.body;

    const user = await User.findById(req.user.id).select('+password');
    if (!user) {
        return next(new AppError('المستخدم غير موجود.', 401));
    }
    
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
        return next(new AppError('كلمة المرور القديمة التي أدخلتها غير صحيحة.', 401));
    }

    user.password = newPassword;
    user.tokenVersion += 1;

    await user.save();

    return ApiResponse.ok(res, 'تم تغيير كلمة المرور بنجاح!');
});