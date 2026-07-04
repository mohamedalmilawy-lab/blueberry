const Joi = require('joi');

const objectId = Joi.string().hex().length(24).messages({
    'string.pattern.base': 'معرف غير صالح'
});

// المقاسات المسموح بها: 1 أو 2 أو 3
const ALLOWED_SIZES = [1, 2, 3];

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
    offerEndDate: Joi.date().allow(null),
    sizes: Joi.array()
        .items(Joi.number().valid(...ALLOWED_SIZES))
        .optional()
        .messages({ 'any.only': 'المقاسات المسموح بها هي 1 أو 2 أو 3 فقط' })
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
    offerEndDate: Joi.date().allow(null),
    sizes: Joi.array()
        .items(Joi.number().valid(...ALLOWED_SIZES))
        .optional()
        .messages({ 'any.only': 'المقاسات المسموح بها هي 1 أو 2 أو 3 فقط' })
})
    .min(1)
    .messages({ 'object.min': 'يجب إرسال حقل واحد على الأقل للتحديث' });

const toggleFeaturedSchema = Joi.object({
    isMostRequested: Joi.boolean().required()
});

// ─── مخطط التحقق من صحة إرسال ملاحظة زبون ───────────────────────────────────
const submitNoteSchema = Joi.object({
    noteText: Joi.string().min(2).max(1000).trim().required().messages({
        'string.empty': 'نص الملاحظة مطلوب',
        'string.min': 'يجب أن تكون الملاحظة على الأقل حرفين',
        'string.max': 'الملاحظة لا يمكن أن تتجاوز 1000 حرف',
        'any.required': 'نص الملاحظة مطلوب'
    })
});

module.exports = {
    createProductSchema,
    updateProductSchema,
    toggleFeaturedSchema,
    submitNoteSchema
};