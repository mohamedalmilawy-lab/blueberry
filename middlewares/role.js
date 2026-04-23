const AppError = require('../utils/AppError');

/**
 * Restricts route access to users whose role is one of the allowed Arabic role strings.
 * Must run after auth middleware so req.user is set.
 */
const restrictTo = (...allowedRoles) => (req, res, next) => {
    if (!req.user || !req.user.role) {
        return next(new AppError('يجب تسجيل الدخول', 401));
    }
    if (!allowedRoles.includes(req.user.role)) {
        return next(new AppError('ليس لديك صلاحية لتنفيذ هذا الإجراء', 403));
    }
    next();
};

module.exports = { restrictTo };
