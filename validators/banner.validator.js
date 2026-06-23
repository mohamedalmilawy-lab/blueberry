const Joi = require('joi');

// دالة مساعدة للتحقق من الـ ObjectId
const objectId = Joi.string().hex().length(24).message('معرف غير صالح (يجب أن يكون 24 حرفاً).');

const createBannerSchema = Joi.object({
    imageUrl: Joi.string().optional().messages({
        'string.base': 'يجب أن يكون رابط الصورة نصاً.'
    }),
    title: Joi.string().min(1).max(200).trim().required(),
    link: Joi.array().items(objectId).default([]).optional(),
    linkType: Joi.string().valid('Product', 'Category').required(),
    isActive: Joi.boolean().default(true).optional()
});

const updateBannerSchema = Joi.object({
    imageUrl: Joi.string(),
    title: Joi.string().min(1).max(200).trim(),
    link: Joi.array().items(objectId),
    linkType: Joi.string().valid('Product', 'Category'),
    isActive: Joi.boolean()
})
    .min(1)
    .messages({ 
        'object.min': 'يجب توفير حقل واحد على الأقل لتحديثه.'
    });

module.exports = { createBannerSchema, updateBannerSchema };