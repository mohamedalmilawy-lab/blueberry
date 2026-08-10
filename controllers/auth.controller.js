const crypto = require('crypto');
const asyncHandler = require('express-async-handler');
const bcrypt = require('bcryptjs');
const User = require('../models/user.model');
const AppError = require('../utils/AppError');
const ApiResponse = require('../utils/ApiResponse');
const { signToken } = require('../utils/signToken');
const sendEmail = require('../utils/sendEmail');

const hashResetToken = (token) =>
    crypto.createHash('sha256').update(token).digest('hex');

/**
 * @desc    Register a new customer account
 * @route   POST /api/auth/register
 * @access  Public
 */
exports.register = asyncHandler(async (req, res) => {
    const { fullName, email, password, confirmPassword, phone } = req.body;

    // 1. التحقق من تطابق كلمتي المرور
    if (password !== confirmPassword) {
        throw new AppError('كلمات المرور غير متطابقة', 400);
    }

    // 2. إذا تم تقديم بريد إلكتروني، تحقق من عدم وجوده مسبقاً
    if (email) {
        const trimmedEmail = email.toLowerCase().trim();
        const exists = await User.findOne({ email: trimmedEmail });
        if (exists) {
            throw new AppError('البريد الإلكتروني مستخدم بالفعل', 400);
        }
    }

    // 3. التحقق من عدم تكرار رقم الهاتف
    const trimmedPhone = phone.trim();
    const phoneExists = await User.findOne({ phone: trimmedPhone });
    if (phoneExists) {
        throw new AppError('رقم الهاتف مستخدم بالفعل', 400);
    }

    const userData = {
        fullName,
        password,
        phone: trimmedPhone,
        role: 'زبون',
        cart: [],
        favorites: []
    };
    // إضافة البريد فقط إذا تم تقديمه
    if (email) {
        userData.email = email.toLowerCase().trim();
    }

    const user = await User.create(userData);

    const token = signToken(user);
    const safeUser = await User.findById(user._id).select('-password');

    return ApiResponse.created(res, 'تم إنشاء الحساب بنجاح', {
        token,
        user: safeUser
    });
});


/**
 * @desc    Login — returns JWT
 * @route   POST /api/auth/login
 * @access  Public
 */
exports.login = asyncHandler(async (req, res) => {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
        throw new AppError('يرجى إدخال بيانات الدخول', 400);
    }

    // البحث بالبريد الإلكتروني أو رقم الهاتف باستخدام $or
    const trimmedIdentifier = identifier.trim();

    const user = await User.findOne({
        $or: [
            { email: trimmedIdentifier.toLowerCase() },
            { phone: trimmedIdentifier }
        ]
    }).select('+password');

    if (!user) {
        throw new AppError('بيانات الدخول غير صحيحة', 401);
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
        throw new AppError('بيانات الدخول غير صحيحة', 401);
    }

    const token = signToken(user);
    const safeUser = await User.findById(user._id).select('-password');

    return ApiResponse.ok(res, 'تم تسجيل الدخول بنجاح', {
        token,
        user: safeUser
    });
});

/**
 * @desc    Request password reset (stores hashed token, does not reveal if email exists)
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
exports.forgotPassword = asyncHandler(async (req, res) => {
    const { email } = req.body;
    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
        return ApiResponse.ok(res, 'إذا كان البريد مسجلاً لدينا، ستصلك تعليمات إعادة تعيين كلمة المرور قريباً.');
    }

    // 1. إنشاء الرمز وحفظه مشفراً في الداتا بيز
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetToken = hashResetToken(resetToken);
    user.passwordResetExpire = new Date(Date.now() + 60 * 60 * 1000);
    await user.save({ validateBeforeSave: false });

    // 2. تجهيز الرابط الذي سيتم إرساله للمستخدم
    const resetURL = `http://localhost:3000/api/auth/reset-password/${resetToken}`;

    const message = `لقد طلبت إعادة تعيين كلمة المرور الخاصة بك.\n\nالرجاء الضغط على الرابط التالي لإعداد كلمة مرور جديدة:\n${resetURL}\n\nإذا لم تقم بهذا الطلب، يرجى تجاهل هذا الإيميل.`;

    try {
        // 3. إرسال الإيميل
        await sendEmail({
            email: user.email,
            subject: 'إعادة تعيين كلمة المرور - متجر العصائر والحلويات',
            message: message
        });

        return ApiResponse.ok(res, 'إذا كان البريد مسجلاً لدينا، ستصلك تعليمات إعادة تعيين كلمة المرور قريباً.');

    } catch (err) {
        // إذا فشل إرسال الإيميل، يجب أن نمسح الرمز من الداتا بيز كإجراء أمني
        user.passwordResetToken = undefined;
        user.passwordResetExpire = undefined;
        await user.save({ validateBeforeSave: false });

        throw new AppError('حدث خطأ أثناء إرسال البريد الإلكتروني. الرجاء المحاولة لاحقاً', 500);
    }
});

/**
 * @desc    Reset password using token from email (or dev console)
 * @route   POST /api/auth/reset-password
 * @access  Public
 */
exports.resetPassword = asyncHandler(async (req, res) => {
    const { token } = req.params;
    const { password, confirmPassword } = req.body;

    // 1. التحقق من إرسال كلمة المرور فعلاً
    if (!password || !confirmPassword) {
        throw new AppError('يرجى إدخال كلمة المرور وتأكيدها', 400);
    }

    // 2. تحقق من الحد الأدنى لطول كلمة المرور (طبقة حماية إضافية بجانب الـ schema)
    if (password.length < 6) {
        throw new AppError('كلمة المرور يجب أن تكون 8 أحرف على الأقل', 400);
    }

    // 3. التحقق من تطابق كلمتي المرور
    if (password !== confirmPassword) {
        throw new AppError('كلمات المرور غير متطابقة', 400);
    }

    const hashed = hashResetToken(token);

    // لا حاجة لجلب +password لأننا لا نستخدم القيمة القديمة إطلاقاً
    const user = await User.findOne({
        passwordResetToken: hashed,
        passwordResetExpire: { $gt: Date.now() }
    }).select('+passwordResetToken +passwordResetExpire');

    if (!user) {
        throw new AppError('الرمز غير صالح أو منتهي', 400);
    }

    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpire = undefined;

    // إبطال كل الجلسات/التوكنات القديمة فوراً
    user.tokenVersion = (user.tokenVersion ?? 0) + 1;
    await user.save();

    return ApiResponse.ok(res, 'تم تحديث كلمة المرور بنجاح. يمكنك تسجيل الدخول الآن.');
});

/**
 * @desc    Logout — invalidates JWTs by bumping tokenVersion
 * @route   POST /api/auth/logout
 * @access  Private
 */
exports.logout = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(req.user.id, { $inc: { tokenVersion: 1 } });
    return ApiResponse.ok(res, 'تم تسجيل الخروج بنجاح');
});
