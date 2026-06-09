const jwt = require('jsonwebtoken');

const getJwtSecret = () => {
    const secret = process.env.JWT_SECRET;
    if (!secret || secret === 'YOUR_JWT_SECRET') {
        if (process.env.NODE_ENV === 'production') {
            throw new Error('يجب تعيين قيمة JWT_SECRET في بيئة الإنتاج');
        }
    }
    return secret || 'YOUR_JWT_SECRET';
};

/**
 * @param {import('mongoose').Document} user
 * @returns {string}
 */
const signToken = (user) => {
    return jwt.sign(
        {
            id: user._id.toString(),
            role: user.role,
            tokenVersion: user.tokenVersion ?? 0
        },
        getJwtSecret()
    );
};

module.exports = { signToken, getJwtSecret };
