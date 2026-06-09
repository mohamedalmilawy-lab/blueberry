module.exports = function (req, res, next) {
    if (req.user.role !== 'موظف توصيل') {
        return res.status(403).json({ message: 'تم رفض الوصول. أنت لست مسجلاً كسائق.' });
    }
    next();
};
