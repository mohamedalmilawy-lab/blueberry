const Joi = require('joi');

const objectId = Joi.string().hex().length(24).messages({
    'string.pattern.base': 'معرف غير صالح'
});

const createCategorySchema = Joi.object({
    name: Joi.string().min(2).max(80).trim().required(),
    image: Joi.string().trim().min(1).required(),
    parent: objectId.allow(null),
    isActive: Joi.boolean().default(true),
    color_1: Joi.string().optional().default(''),
    color_2: Joi.string().optional().default('')
});

const updateCategorySchema = Joi.object({
    name: Joi.string().min(2).max(80).trim(),
    image: Joi.string().trim().min(1),
    parent: objectId.allow(null),
    isActive: Joi.boolean(),
    color_1: Joi.string().optional(),
    color_2: Joi.string().optional()
})
    .min(1)
    .messages({ 'object.min': 'يجب إرسال حقل واحد على الأقل للتحديث' });

module.exports = {
    createCategorySchema,
    updateCategorySchema
};
