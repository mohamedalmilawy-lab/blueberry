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
    },
    bannerImage: {
        type: String,
        default: ''
    },
    bannerLink: {
        type: String,
        default: ''
    },
    isBannerActive: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

categorySchema.index({ name: 1 });
categorySchema.index({ parent: 1 });

const Category = mongoose.model('Category', categorySchema);

module.exports = Category;
