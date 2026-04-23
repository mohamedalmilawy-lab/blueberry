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
        required: true,
        unique: true,
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
        enum: ['زبون','مشرف', 'أدمن', 'موظف توصيل'],
        default: 'زبون'
    },
    phone: {
        type: String,
        required: true,
        minlength: 8,
        maxlength: 15
    },
    address: {
        site: { type: String, trim: true },
        details: { type: String, trim: true }
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
        _id: false // To prevent creating an id for sub-documents
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
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) 
        return ;

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

const User = mongoose.model('User', userSchema);

module.exports = User;
