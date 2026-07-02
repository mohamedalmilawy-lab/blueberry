const mongoose = require('mongoose');
const { Schema } = mongoose;

const bannerSchema = new Schema(
    {
        imageUrl: {
            type: String,
            trim: true
        },
        title: {
            type: String,
            required: true,
            trim: true
        },
        linkType: {
            type: String,
            enum: ['Product', 'Category','Non'], // تحديد النوع
            default: 'Non'
        },        
        link: [{
            type: Schema.Types.ObjectId,
            refPath: 'linkType'
        }],
        isActive: {
            type: Boolean,
            default: true
        },
    },
    { timestamps: true }
);

bannerSchema.index({ isActive: 1, createdAt: -1 });

const Banner = mongoose.model('Banner', bannerSchema);

module.exports = Banner;