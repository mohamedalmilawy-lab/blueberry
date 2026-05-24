const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const { getJwtSecret } = require('../utils/signToken');

let io;

/**
 * Socket.io for real-time admin alerts. Admins authenticate with JWT and join room `admin`.
 */
function initSocket(httpServer) {
    io = new Server(httpServer, {
        cors: {
            origin: process.env.CORS_ORIGIN || '*',
            methods: ['GET', 'POST']
        }
    });

    io.use(async (socket, next) => {
        try {
            const raw =
                socket.handshake.auth?.token ||
                socket.handshake.headers['x-auth-token'] ||
                '';
            const token = typeof raw === 'string' ? raw.trim() : '';
            if (!token) {
                return next(new Error('Authentication required'));
            }
            const decoded = jwt.verify(token, getJwtSecret());
            const user = await User.findById(decoded.id).select('tokenVersion role');
            if (!user) {
                return next(new Error('User not found'));
            }
            const versionInToken = decoded.tokenVersion ?? 0;
            const versionInDb = user.tokenVersion ?? 0;
            if (versionInToken !== versionInDb) {
                return next(new Error('Session ended'));
            }
            if (user.role !== 'أدمن') {
                return next(new Error('Admin only'));
            }
            socket.data.userId = user._id.toString();
            next();
        } catch (e) {
            next(new Error('Invalid token'));
        }
    });

    io.on('connection', (socket) => {
        socket.join('admin');
    });

    return io;
}

function getIo() {
    return io;
}

module.exports = { initSocket, getIo };
