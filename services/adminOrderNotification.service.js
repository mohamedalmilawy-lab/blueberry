const AdminNotification = require('../models/adminNotification.model');
const { getIo } = require('../config/socket');

/**
 * Persists an admin notification and emits a real-time event to connected admins.
 */
async function notifyAdminNewOrder(order) {
    const title = 'طلب جديد';
    const body = `تم إنشاء طلب جديد برقم ${order._id} بقيمة ${order.totalPrice}.`;

    const notification = await AdminNotification.create({
        type: 'new_order',
        order: order._id,
        title,
        body,
        read: false
    });

    const io = getIo();
    if (io) {
        io.to('admin').emit('admin_notification', {
            type: 'new_order',
            notification: notification.toObject(),
            orderId: order._id.toString()
        });
    }

    return notification;
}

module.exports = { notifyAdminNewOrder };
