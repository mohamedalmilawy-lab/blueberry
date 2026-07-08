const mongoose = require('mongoose');
const { Schema } = mongoose;

const orderItemSchema = new Schema({
    product: {
        type: Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: 1
    },
    priceAtOrder: {
        type: Number,
        required: true
    },
    size: {
        type: Number,
        required: false
    }
}, { _id: false });

const orderSchema = new Schema({
    user: { // For registered users
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    guestDetails: {
        // For guest checkouts (no User document)
        fullName: { type: String, trim: true }
    },
    addresses: [{
        label: { type: String, required: true, trim: true },
        street: { type: String, required: true, trim: true }
    }],
    items: [orderItemSchema],
    totalPrice: {
        type: Number,
        required: true
    },
    // ─── حقول الخصم ───
    discountCode: {
        type: Schema.Types.ObjectId,
        ref: 'Discount',
        default: null
    },
    discountPercentage: {
        type: Number,
        default: 0
    },
    finalPrice: {
        type: Number
    },
    status: {
        type: String,
        enum: ['تم الطلب','قيد التحضير','تم التحضير','قيد التوصيل', 'تم التوصيل', 'ملغي'],
        default: 'تم الطلب'
    },
    payment: {
        method: {
            type: String,
            enum: 'الدفع عند التسليم', // COD فقط
            required: true
        },
        status: {
            type: String,
            enum: ['لم تدفع بعد', 'تم الدفع', 'فشل الدفع'],
            default: 'لم تدفع بعد'
        }
    },
    driver: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    note: {
        type: String
    },
    phone: {
        type: String,
        required: true,
        minlength: 8,
        maxlength: 15
    }
}, {
    timestamps: true
});

orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ driver: 1, status: 1 });

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;