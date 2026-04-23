const Joi = require('joi');
const passwordComplexity = require("joi-password-complexity");

const objectId = Joi.string().hex().length(24).messages({ 'string.pattern.base': 'معرف غير صالح' });

const complexityOptions = {
    min: 6,
    max: 30,
    lowerCase: 1,
    upperCase: 1,
    numeric: 0,
    symbol: 0,
    requirementCount: 2,
};

// مخطط التسجيل
const registerUserSchema = Joi.object({
    fullName: Joi.string().min(2).max(50).trim().required(),
    email: Joi.string().email().trim().required(),
    password: passwordComplexity(complexityOptions).required(),
    confirmPassword: Joi.string().valid(Joi.ref('password')).required().messages({
        'any.only': 'كلمة المرور وتأكيد كلمة المرور يجب أن تكون متطابقة',
    }),
    phone: Joi.string().pattern(/^[0-9]+$/).min(8).max(15).required().messages({ // تم التصحيح
        'string.pattern.base': 'رقم الهاتف يجب أن يحتوي على أرقام فقط'
    }),
    favorites: Joi.array().items(objectId).optional(),
    cart: Joi.array().items(
        Joi.object({
            product: objectId.required(),
            quantity: Joi.number().min(1).required()
        })
    ).optional()
});

//  مخطط تسجيل الدخول
const loginUserSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
});

//  مخطط تحديث المدير (يستطيع تعديل الـ Role)
const updateUserByAdminSchema = Joi.object({
    fullName: Joi.string().min(2).max(50).trim(),
    email: Joi.string().email().trim(),
    password: passwordComplexity(complexityOptions),
    confirmPassword: Joi.string().valid(Joi.ref('password'))
        .when('password', { is: Joi.exist(), then: Joi.required() }), 
    role: Joi.string().valid('زبون', 'مشرف','أدمن', 'موظف توصيل'),
    phone: Joi.string().pattern(/^[0-9]+$/).min(8).max(15), 
    favorites: Joi.array().items(objectId),
    cart: Joi.array().items(
        Joi.object({
            product: objectId.required(),
            quantity: Joi.number().min(1).required()
        })
    )
}).min(1);

// مخطط تحديث المستخدم لنفسه (لا يستطيع تعديل الـ Role)
const updateUserByUserSchema = Joi.object({
    fullName: Joi.string().min(2).max(50).trim(),
    email: Joi.string().email().trim(),
    phone: Joi.string().pattern(/^[0-9]+$/).min(8).max(15), // تم التصحيح
}).min(1);

//  مخطط تغيير كلمة المرور فقط
const updateUserPasswordSchema = Joi.object({
    password: passwordComplexity(complexityOptions).required(),
    confirmPassword: Joi.string().valid(Joi.ref('password')).required().messages({
        'any.only': 'كلمة المرور وتأكيد كلمة المرور يجب أن تكون متطابقة',
    }),
});

//  نسيان كلمة المرور
const forgotPasswordSchema = Joi.object({
    email: Joi.string().email().trim().required()
});

// إعادة تعيين كلمة المرور بالرمز
const resetPasswordSchema = Joi.object({
    password: passwordComplexity(complexityOptions).required(),
    confirmPassword: Joi.string().valid(Joi.ref('password')).required().messages({
        'any.only': 'كلمة المرور وتأكيد كلمة المرور يجب أن تكون متطابقة',
    }),
});

const changePasswordSchema = Joi.object({
    oldPassword: Joi.string().required().messages({
        'string.empty': 'كلمة المرور القديمة مطلوبة',
        'any.required': 'كلمة المرور القديمة مطلوبة',
    }),
    newPassword: passwordComplexity(complexityOptions).required().messages({
        'string.empty': 'كلمة المرور مطلوبة',
        'any.required': 'كلمة المرور مطلوبة',
    }),
    confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required().messages({
        'any.only': 'كلمة المرور وتأكيد كلمة المرور يجب أن تكون متطابقة',
        'string.empty': 'تأكيد كلمة المرور مطلوب',
        'any.required': 'تأكيد كلمة المرور مطلوب',
    }),
});

// تصدير جميع المخططات لكي تعمل في الـ Routes
module.exports = {
    registerUserSchema,
    loginUserSchema,
    updateUserByAdminSchema,
    updateUserByUserSchema,
    updateUserPasswordSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
    changePasswordSchema
};
