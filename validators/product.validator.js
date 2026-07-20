const Joi = require('joi');

const objectId = Joi.string().hex().length(24).messages({
    'string.pattern.base': 'معرف غير صالح'
});

// ─── مخطط مقاس المنتج ──────────────────────────────────────────────────────────
const productSizeEntrySchema = Joi.object({
    size: Joi.string().default('صغير').messages({
        'string.base': 'المقاس يجب أن يكون نصاً'
    }),
    price: Joi.number().min(0).required().messages({
        'any.required': 'سعر المقاس مطلوب',
        'number.min': 'سعر المقاس لا يمكن أن يكون سالبًا'
    })
});

// ─── مخطط مصفوفة المقاسات مع منع التكرار ──────────────────────────────────────
const sizesArraySchema = Joi.array()
    .items(productSizeEntrySchema)
    .optional()
    .custom((value, helpers) => {
        const seen = new Set();
        for (const entry of value) {
            // استخدام 'صغير' للتحقق في حال لم يتم إرسال المقاس (الاعتماد على الديفولت)
            const currentSize = entry.size || 'صغير'; 
            if (seen.has(currentSize)) {
                return helpers.message('لا يمكن تكرار نفس المقاس أكثر من مرة');
            }
            seen.add(currentSize);
        }
        return value;
    });

// ─── مخطط إنشاء منتج ──────────────────────────────────────────────────────────
const createProductSchema = Joi.object({
    name: Joi.string().min(2).max(120).trim().required(),
    images: Joi.array().items(Joi.string().trim().min(1)).min(1).optional().messages({
        'any.required': 'صور المنتج مطلوبة',
        'array.min': 'يجب إضافة صورة واحدة على الأقل'
    }),
    details: Joi.string().min(5).max(5000).required(),
    price: Joi.number().min(0).required(),
    category: objectId.required(),
    banner: Joi.array().items(objectId).optional(),
    isActive: Joi.boolean(),
    isMostRequested: Joi.boolean(),
    // نسبة الخصم المئوية: يجب ألا تتجاوز 100% كما في الموديل
    offerPrice: Joi.number().min(0).max(100).allow(null).messages({
        'number.max': 'نسبة الخصم لا يمكن أن تتجاوز 100%',
        'number.min': 'نسبة الخصم لا يمكن أن تكون سالبة'
    }),
    offerEndDate: Joi.date().allow(null),
    sizes: sizesArraySchema
});

// ─── مخطط تحديث منتج ──────────────────────────────────────────────────────────
const updateProductSchema = Joi.object({
    name: Joi.string().min(2).max(120).trim(),
    images: Joi.array().items(Joi.string().trim().min(1)).min(1).optional(),
    details: Joi.string().min(5).max(5000),
    price: Joi.number().min(0),
    category: objectId,
    banner: Joi.array().items(objectId),
    isActive: Joi.boolean(),
    isMostRequested: Joi.boolean(),
    // نسبة الخصم المئوية: يجب ألا تتجاوز 100% كما في الموديل
    offerPrice: Joi.number().min(0).max(100).allow(null).messages({
        'number.max': 'نسبة الخصم لا يمكن أن تتجاوز 100%',
        'number.min': 'نسبة الخصم لا يمكن أن تكون سالبة'
    }),
    offerEndDate: Joi.date().allow(null),
    sizes: sizesArraySchema
})
    .min(1)
    .messages({ 'object.min': 'يجب إرسال حقل واحد على الأقل للتحديث' });

// ─── مخطط تغيير حالة المنتج الأكثر طلباً ───────────────────────────────────────
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