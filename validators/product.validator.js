const Joi = require('joi');

const objectId = Joi.string().hex().length(24).messages({
    'string.pattern.base': 'معرف غير صالح'
});

const createProductSchema = Joi.object({
    name: Joi.string().min(2).max(120).trim().required(),
    images: Joi.array().items(Joi.string().trim().min(1)).min(1).optional(),
    details: Joi.string().min(10).max(5000).required(),
    price: Joi.number().min(0).required(),
    category: objectId.required(),
    banner: Joi.array().items(objectId).optional(),
    isActive: Joi.boolean(),
    isMostRequested: Joi.boolean(),
    offerPrice: Joi.number().min(0).allow(null),
    offerEndDate: Joi.date().allow(null)
});

const updateProductSchema = Joi.object({
    name: Joi.string().min(2).max(120).trim(),
    images: Joi.array().items(Joi.string().trim().min(1)).min(1).optional(),
    details: Joi.string().min(10).max(5000),
    price: Joi.number().min(0),
    category: objectId,
    banner: Joi.array().items(objectId),
    isActive: Joi.boolean(),
    isMostRequested: Joi.boolean(),
    offerPrice: Joi.number().min(0).allow(null),
    offerEndDate: Joi.date().allow(null)
})
    .min(1)
    .messages({ 'object.min': 'يجب إرسال حقل واحد على الأقل للتحديث' });

const toggleFeaturedSchema = Joi.object({
    isMostRequested: Joi.boolean().required()
});

module.exports = {
    createProductSchema,
    updateProductSchema,
    toggleFeaturedSchema
};