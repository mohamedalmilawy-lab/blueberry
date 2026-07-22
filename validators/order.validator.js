const Joi = require('joi');

const ORDER_STATUSES = [
    'تم الطلب',
    'قيد التحضير',
    'تم التحضير',
    'قيد التوصيل',
    'تم التوصيل',
    'ملغي'
];

const objectId = Joi.string().hex().length(24).messages({
    'string.pattern.base': 'معرف غير صالح'
});

const phoneSchema = Joi.string()
    .min(8)
    .max(15)
    .messages({
        'string.pattern.base': 'رقم الهاتف يجب أن يحتوي على أرقام فقط'
    });

const orderItemSchema = Joi.object({
    product: objectId,
    quantity: Joi.number().min(1),
    priceAtOrder: Joi.number().min(0),
    size: Joi.string().trim().optional()
});

const savedAddressSchema = Joi.object({
    label: Joi.string().min(1).max(80).trim().required(),
    street: Joi.string().min(1).max(1000).trim().required()
});

// ======================================================
// 1. مخطط إنشاء الطلب (Create Order Schema)
// ======================================================
const createOrderSchema = Joi.object({
    user: objectId,
    guestDetails: Joi.object({ fullName: Joi.string().required() }),

    // اختياري: مطلوب للتوصيل، غير مطلوب للاستلام من الفرع
    addresses: Joi.array().items(savedAddressSchema).max(50).optional(),

    // اختياري: يُحقن من قاعدة البيانات للمستخدمين المسجّلين، مطلوب للزوار
    items: Joi.array()
        .items(orderItemSchema)
        .min(1)
        .optional()
        .messages({ 'array.min': 'يجب أن يحتوي الطلب على منتج واحد على الأقل' }),

    deliveryMethod: Joi.string()
        .valid('استلام من الفرع', 'توصيل الى المنزل')
        .required()
        .messages({
            'any.required': 'يجب تحديد طريقة الاستلام',
            'any.only': 'طريقة الاستلام يجب أن تكون "استلام من الفرع" أو "توصيل الى المنزل"'
        }),

    status: Joi.string().valid(...ORDER_STATUSES).default('تم الطلب'),
    payment: Joi.object({
        method: Joi.string().valid('الدفع عند التسليم').required(),
        status: Joi.string().valid('لم تدفع بعد', 'تم الدفع', 'فشل الدفع').default('لم تدفع بعد')
    }).required(),
    discountCode: Joi.string().trim().optional(),
    driver: objectId.optional(),
    note: Joi.string().allow('', null).optional(),
    phone: phoneSchema.required()
}).xor('user', 'guestDetails').messages({
    'object.xor': 'يجب توفير إما "معرف المستخدم" أو "تفاصيل الزائر" وليس كليهما'
});

// ===================================================================
// 2a. تحديث من المستخدم/الضيف عندما تكون حالة الطلب: تم الطلب
// ===================================================================
const updateOrderByUserPlacedSchema = Joi.object({
    items: Joi.array().items(orderItemSchema).min(1).messages({ 'array.min': 'يجب أن يحتوي الطلب على منتج واحد على الأقل' }),
    addresses: Joi.array().items(savedAddressSchema).max(50),
    phone: phoneSchema,
    note: Joi.string().allow('', null)
}).min(1).messages({ 'object.min': 'يجب توفير معلومة واحدة على الأقل لتحديثها.' });

// ===================================================================
// 2b. تحديث من المستخدم/الضيف عندما تكون الحالة: قيد التحضير أو تم التحضير
// ===================================================================
const updateOrderByUserPreparingSchema = Joi.object({
    addresses: Joi.array().items(savedAddressSchema).max(50),
    phone: phoneSchema,
    note: Joi.string().allow('', null)
}).min(1).messages({ 'object.min': 'يجب توفير معلومة واحدة على الأقل لتحديثها.' });

// ===================================================================
// 3. مخطط تحديث الطلب (من طرف مدير النظام - صلاحيات كاملة)
// ===================================================================
const updateOrderByAdminSchema = Joi.object({
    user: objectId,
    guestDetails: Joi.object({ fullName: Joi.string().min(3) }),
    addresses: Joi.array().items(savedAddressSchema).max(50),
    phone: phoneSchema,
    status: Joi.string().valid(...ORDER_STATUSES),
    payment: Joi.object({
        method: Joi.string().valid('الدفع عند التسليم'),
        status: Joi.string().valid('لم تدفع بعد', 'تم الدفع', 'فشل الدفع')
    }),
    driver: objectId.allow(null),
    note: Joi.string().allow('', null),
    items: Joi.array().items(orderItemSchema).min(1),
    totalPrice: Joi.number().min(0),
    finalPrice: Joi.number().min(0)
}).min(1).messages({ 'object.min': 'يجب توفير حقل واحد على الأقل لتحديثه.' });

// ===================================================================
// 4. تحديث من موظف التوصيل (JSON: { status, payment?: { status } })
// ===================================================================
const updateOrderByDriverSchema = Joi.object({
    status: Joi.string().valid(...ORDER_STATUSES).required(),
    payment: Joi.object({
        status: Joi.string().valid('تم الدفع', 'فشل الدفع')
    }).optional()
}).messages({
    'any.required': 'يجب تحديد حالة الطلب'
});

// ===================================================================
// 5. تحديث من المشرف (حالات التحضير فقط)
// ===================================================================
const updateOrderBySupervisorSchema = Joi.object({
    status: Joi.string().valid('قيد التحضير', 'تم التحضير').required()
}).messages({
    'any.required': 'يجب تحديد حالة الطلب (قيد التحضير أو تم التحضير)'
});

module.exports = {
    createOrderSchema,
    updateOrderByUserPlacedSchema,
    updateOrderByUserPreparingSchema,
    updateOrderByAdminSchema,
    updateOrderByDriverSchema,
    updateOrderBySupervisorSchema
};
