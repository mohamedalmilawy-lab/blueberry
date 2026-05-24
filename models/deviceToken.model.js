const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * Stores FCM device tokens for push delivery.
 * Registered users: user is set. Guests: user is null (anonymous device).
 */
const deviceTokenSchema = new Schema(
    {
        token: {
            type: String,
            required: true,
            unique: true,
            trim: true
        },
        user: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            default: null
        }
    },
    { timestamps: true }
);

deviceTokenSchema.index({ user: 1 });

const DeviceToken = mongoose.model('DeviceToken', deviceTokenSchema);

module.exports = DeviceToken;
