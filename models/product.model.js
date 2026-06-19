const mongoose = require('mongoose');
const { Schema } = mongoose;

const productSchema = new Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    images: [{
        type: String,
        required: true
    }],
    details: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true,
        min: [0, 'Price cannot be negative.']
    },
    category: {
        type: Schema.Types.ObjectId,
        ref: 'Category',
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    isMostRequested: {
        type: Boolean,
        default: false
    },
    // For offers
    offerPrice: {
        type: Number,
        min: [0, 'سعر العرض لا يمكن أن يكون سالبًا.']
    },
    offerEndDate: {
        type: Date
    }
}, {
    timestamps: true
});

productSchema.index({ name: 'text', details: 'text' });
productSchema.index({ category: 1, isActive: 1, price: 1 });
productSchema.index({ isMostRequested: 1, isActive: 1 });

const Product = mongoose.model('Product', productSchema);

module.exports = Product;