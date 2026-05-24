const mongoose = require('mongoose');
const { Schema } = mongoose;

const bannerSchema = new Schema(
    {
        imageUrl: {
            type: String,
            required: true,
            trim: true
        },
        title: {
            type: String,
            required: true,
            trim: true
        },
        linkType: {
            type: String,
            enum: ['Product', 'Category'], // تحديد النوع
            default: 'Product'
        },        
        link: [{
            type: String,
            trim: true,
            default: ''
        }],
        status: {
            type: String,
            enum: ['Active', 'Inactive'],
            default: 'Active'
        }
    },
    { timestamps: true }
);

bannerSchema.index({ status: 1, createdAt: -1 });

const Banner = mongoose.model('Banner', bannerSchema);

module.exports = Banner;
