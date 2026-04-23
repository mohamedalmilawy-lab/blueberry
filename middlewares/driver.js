module.exports = function (req, res, next) {
    if (req.user.role !== 'موظف توصيل') {
        return res.status(403).json({ message: 'Access denied. You are not a driver.' });
    }
    next();
};
