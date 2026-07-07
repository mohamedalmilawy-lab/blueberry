const mongoose = require('mongoose');
const { Schema } = mongoose;

const categorySchema = new Schema({
    name: {
        type: String,
        required: [true, 'Category name is required.'],
        trim: true,
    },
    image: {
        type: String,
        required: [true, 'Category image is required.'],
    },
    // To create parent-child relationship (e.g., Desserts -> Cakes)
    parent: {
        type: Schema.Types.ObjectId,
        ref: 'Category',
        default: null
    },
    // ---- الحقل الخاص بالبانر الإعلاني ----
    banner: [{
        type: Schema.Types.ObjectId,
        ref: 'Banner'
    }],
    isActive: {
        type: Boolean,
        default: true
    },
    color_1: {
        type: String,
        default: ''
    },
    color_2: {
        type: String,
        default: ''
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual populate: جلب المنتجات المرتبطة بهذا القسم عبر حقل product.category
categorySchema.virtual('products', {
    ref: 'Product',
    localField: '_id',
    foreignField: 'category'
});

categorySchema.index({ name: 1 });
categorySchema.index({ parent: 1 });
categorySchema.index({ banner: 1 });

const Category = mongoose.model('Category', categorySchema);

module.exports = Category;
