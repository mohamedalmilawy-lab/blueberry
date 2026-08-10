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
        sparse: true,
        lowercase: true,
        trim: true,
        set: value => (value === '' || value === null ? undefined : value)
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
    /** عدة عناوين محفوظة: التسمية (مثل المنزل، العمل) + نص العنوان الكامل */
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
            type: String, // النوع String كما طلبت
            required: false
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

mongoose.connection.once('open', async () => {
    try {
        await mongoose.connection.collection('users').dropIndex('email_1');
        console.log('Old email_1 index dropped successfully!');
    } catch (err) {
        console.log('Index not found or already dropped:', err.message);
    }
});


// Hash password before saving the user
userSchema.pre('save', async function (next) {
    if (!this.isModified('password'))
        return;

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

const User = mongoose.model('User', userSchema);

module.exports = User;
