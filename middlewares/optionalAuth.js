const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const { getJwtSecret } = require('../utils/signToken');

/**
 * Attaches req.user when a valid x-auth-token is sent; otherwise continues without authentication.
 */
module.exports = async function optionalAuth(req, res, next) {
    const token = req.header('x-auth-token');
    //إذا لم يجد توكن: لا يغضب ولا يرسل خطأ، بل ينادي next() فوراً ليسمح لك بالمرور كزائر.
    if (!token) {
        return next();
    }

    try {
        const decoded = jwt.verify(token, getJwtSecret());
        const user = await User.findById(decoded.id).select('tokenVersion role cart favorites');
        //اذا لم يجد المستخدم يدخل كزائر
        if (!user) {
            return next();
        }

        //إذا أرسل المستخدم توكناً قديماً يحتوي على رقم نسخة (مثلاً 1)، يكتشف الكود أن الأرقام غير متطابقة، فيعتبر التوكن ملغياً ويعاملك كزائر (next()).
        const versionInToken = decoded.tokenVersion ?? 0;
        const versionInDb = user.tokenVersion ?? 0;
        if (versionInToken !== versionInDb) {
            return next();
        }

        req.user = {
            id: user._id.toString(),
            role: user.role,
            tokenVersion: versionInDb,
            cart: user.cart || [],
            favorites: user.favorites || []
        };
    } catch {
        //إذا كان التوكن منتهياً أو خاطئاً (Garbage)، سيقوم الـ catch بمسك الخطأ، لكنه لن يفعل شيئاً (لن يرسل خطأ للمستخدم).
        // ignore invalid/expired token for optional auth
    }
    next();
};
