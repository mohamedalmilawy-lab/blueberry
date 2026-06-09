module.exports = function (req, res, next) {
    if (req.user.role !== 'أدمن') {
        return res.status(403).json({ message: 'تم رفض الوصول. ليس لديك الصلاحيات المطلوبة.' });
    }
    next();
};
