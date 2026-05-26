const Joi = require('joi');

// Reusable ObjectId pattern (24-char hex string)
const objectId = Joi.string().hex().length(24).messages({
    'string.hex': 'معرف غير صالح',
    'string.length': 'معرف غير صالح',
});

/**
 * Schema for POST /api/admin/discounts  (Admin creates a discount code)
 */
const createDiscountSchema = Joi.object({
    code: Joi.string().trim().min(3).max(30).required()
        .messages({
            'string.min': 'كود الخصم يجب أن يكون 3 أحرف على الأقل',
            'string.max': 'كود الخصم يجب ألا يتجاوز 30 حرفاً',
            'any.required': 'كود الخصم مطلوب',
        }),
    discountPercentage: Joi.number().integer().min(1).max(100).required()
        .messages({
            'number.min': 'نسبة الخصم يجب أن تكون 1% على الأقل',
            'number.max': 'نسبة الخصم يجب ألا تتجاوز 100%',
            'any.required': 'نسبة الخصم مطلوبة',
        }),
    assignedUserId: objectId.required()
        .messages({
            'any.required': 'معرف المستخدم المعيّن مطلوب',
        }),
    maxUsageLimit: Joi.number().integer().min(1).required()
        .messages({
            'number.min': 'حد الاستخدام يجب أن يكون 1 على الأقل',
            'any.required': 'حد الاستخدام الأقصى مطلوب',
        }),
});

/**
 * Schema for POST /api/discounts/apply  (User applies a discount code)
 */
const applyDiscountSchema = Joi.object({
    code: Joi.string().trim().min(1).required()
        .messages({
            'any.required': 'كود الخصم مطلوب',
            'string.empty': 'كود الخصم مطلوب',
        }),
});

module.exports = {
    createDiscountSchema,
    applyDiscountSchema,
};
