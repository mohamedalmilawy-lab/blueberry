const Joi = require('joi');

// دالة مساعدة للتحقق من الـ ObjectId
const objectId = Joi.string().hex().length(24).message('معرف غير صالح (يجب أن يكون 24 حرفاً).');

/**
 * بناء حقل link بصورة مضمّنة داخل كل حالة.
 * .min(1) تُضاف على Joi.array() مباشرةً لأن alternatives لا تدعمها.
 *
 * @param {boolean} required  - هل يجب وجود عنصر واحد على الأقل؟
 */
function buildLinkField(required) {
    const arraySchema = required
        ? Joi.array().items(objectId).min(1)
        : Joi.array().items(objectId);

    return Joi.alternatives()
        .try(
            arraySchema,
            // FormData قد يُرسل عنصراً واحداً كـ string بدلاً من مصفوفة
            objectId.custom((value) => [value])
        )
        .optional();
}

const createBannerSchema = Joi.object({
    imageUrl: Joi.string().optional().messages({
        'string.base': 'يجب أن يكون رابط الصورة نصاً.'
    }),
    title: Joi.string().min(1).max(200).trim().required(),

    linkType: Joi.string()
        .valid('Product', 'Category', 'Non')
        .default('Non')
        .required(),

    // link مطلوبة وغير فارغة عند Product/Category، ومتجاهَلة عند Non
    link: Joi.when('linkType', {
        switch: [
            {
                is: 'Product',
                then: buildLinkField(true).messages({
                    'alternatives.match': 'يجب تحديد منتج واحد على الأقل عند اختيار نوع الرابط "منتج".'
                })
            },
            {
                is: 'Category',
                then: buildLinkField(true).messages({
                    'alternatives.match': 'يجب تحديد قسم واحد على الأقل عند اختيار نوع الرابط "قسم".'
                })
            }
        ],
        otherwise: Joi.any().strip() // تجاهل أي قيمة مُرسَلة عند linkType = Non
    }),

    isActive: Joi.boolean().default(true).optional()
});

const updateBannerSchema = Joi.object({
    imageUrl: Joi.string().optional(),
    title: Joi.string().min(1).max(200).trim().optional(),

    linkType: Joi.string().valid('Product', 'Category', 'Non').optional(),

    link: Joi.when('linkType', {
        switch: [
            {
                is: 'Product',
                then: buildLinkField(true).messages({
                    'alternatives.match': 'يجب تحديد منتج واحد على الأقل عند اختيار نوع الرابط "منتج".'
                })
            },
            {
                is: 'Category',
                then: buildLinkField(true).messages({
                    'alternatives.match': 'يجب تحديد قسم واحد على الأقل عند اختيار نوع الرابط "قسم".'
                })
            }
        ],
        otherwise: Joi.any().strip() // تجاهل link عند Non أو حين لا يُرسَل linkType
    }),

    isActive: Joi.boolean().optional()
})
    .min(1)
    .messages({
        'object.min': 'يجب توفير حقل واحد على الأقل لتحديثه.'
    });

module.exports = { createBannerSchema, updateBannerSchema };