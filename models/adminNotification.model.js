const mongoose = require('mongoose');
const { Schema } = mongoose;

const adminNotificationSchema = new Schema(
    {
        type: {
            type: String,
            enum: ['new_order'],
            default: 'new_order',
            required: true
        },
        order: {
            type: Schema.Types.ObjectId,
            ref: 'Order'
        },
        title: {
            type: String,
            required: true,
            trim: true
        },
        body: {
            type: String,
            trim: true,
            default: ''
        },
        read: {
            type: Boolean,
            default: false
        }
    },
    { timestamps: true }
);

adminNotificationSchema.index({ read: 1, createdAt: -1 });
adminNotificationSchema.index({ order: 1 });

const AdminNotification = mongoose.model('AdminNotification', adminNotificationSchema);

module.exports = AdminNotification;
