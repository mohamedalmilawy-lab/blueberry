const Joi = require('joi');

const createBannerSchema = Joi.object({
    imageUrl: Joi.string().min(1).max(2048).trim().required(),
    title: Joi.string().min(1).max(200).trim().required(),
    
    link: Joi.array().items(Joi.string().trim()).default([]).optional(),
    
    linkType: Joi.string().valid('Product', 'Category').default('None').optional(),
    
    status: Joi.string().valid('Active', 'Inactive').default('Active').optional()
});

const updateBannerSchema = Joi.object({
    imageUrl: Joi.string().min(1).max(2048).trim(),
    title: Joi.string().min(1).max(200).trim(),
    
    link: Joi.array().items(Joi.string().trim()),
    
    linkType: Joi.string().valid('Product', 'Category'),
    
    status: Joi.string().valid('Active', 'Inactive')
})
    .min(1)
    .messages({ 
        'object.min': 'يجب توفير حقل واحد على الأقل لتحديثه.',
        'any.only': 'القيمة المدخلة في حقل الحالة أو النوع غير صالحة.'
    });

module.exports = { createBannerSchema, updateBannerSchema };
