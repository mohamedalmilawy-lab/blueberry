const mongoose = require('mongoose');
const { Schema } = mongoose;
const bcrypt = require('bcryptjs');

const userSchema = new Schema({
    fullName: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: false,
        unique: true,
        sparse: true, // يسمح بعدة مستخدمين بدون بريد إلكتروني بدون خطأ duplicate key
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: true,
        minlength: 6
    },
    role: {
        type: String,
        enum: ['زبون', 'مشرف', 'أدمن', 'موظف توصيل'],
        default: 'زبون'
    },
    phone: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minlength: 8,
        maxlength: 15
    },
    addresses: {
        type: [
            {
                label: { type: String, required: true, trim: true },
                street: { type: String, required: true, trim: true }
            }
        ],
        default: []
    },
    favorites: [{
        type: Schema.Types.ObjectId,
        ref: 'Product'
    }],

    cart: [{
        product: {
            type: Schema.Types.ObjectId,
            ref: 'Product'
        },
        quantity: {
            type: Number,
            required: true,
            min: [1, 'Quantity must be at least 1.']
        },
        size: {
            type: String,
            required: false
        },
        _id: false
    }],
    tokenVersion: {
        type: Number,
        default: 0
    },
    passwordResetToken: {
        type: String,
        select: false
    },
    passwordResetExpire: {
        type: Date,
        select: false
    },
}, {
    timestamps: true
});

// Hash password before saving the user
// ✅ تم إصلاح المشكلة: إما استخدام next() بشكل صريح دائماً،
// أو حذف next من الباراميترات بالكامل والاعتماد على async/await فقط.
// هنا اخترنا الخيار الأول (next صريح) لأنه أوضح وأقل عرضة للأخطاء المستقبلية.
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        return next();
    }

    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        return next();
    } catch (err) {
        return next(err);
    }
});

const User = mongoose.model('User', userSchema);

module.exports = User;