module.exports = function (req, res, next) {
    // req.user تم إنشاؤه بواسطة middleware الـ auth
    if (req.user.role !== 'أدمن') {
        return res.status(403).json({ message: 'Access denied. You do not have the required permissions.' });
    }
    next();
};
