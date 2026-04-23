const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const { getJwtSecret } = require('../utils/signToken');

/**
 * Verifies JWT and ensures the user still exists and the token was not invalidated (logout).
 */
module.exports = async function auth(req, res, next) {
    const token = req.header('x-auth-token');
    if (!token) {
        return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    try {
        const decoded = jwt.verify(token, getJwtSecret());
        const user = await User.findById(decoded.id).select('tokenVersion role');

        if (!user) {
            return res.status(401).json({ message: 'User no longer exists.' });
        }

        const versionInToken = decoded.tokenVersion ?? 0;
        const versionInDb = user.tokenVersion ?? 0;
        if (versionInToken !== versionInDb) {
            return res.status(401).json({ message: 'Session ended. Please sign in again.' });
        }

        req.user = {
            id: user._id.toString(),
            role: user.role,
            tokenVersion: versionInDb
        };
        next();
    } catch (ex) {
        if (ex.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Token expired.' });
        }
        if (ex.name === 'JsonWebTokenError') {
            return res.status(401).json({ message: 'Invalid token.' });
        }
        return res.status(401).json({ message: 'Authentication failed.' });
    }
};
