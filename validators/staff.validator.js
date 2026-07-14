//الصفحة المسؤلة عن اضافة وعرض وفلترة مستخدمين اي كان نوعهم('زبون', 'مشرف', 'أدمن', 'موظف توصيل')
const Joi = require('joi');

const createStaffUserSchema = Joi.object({
    fullName: Joi.string().min(2).max(50).trim().required(),
    email: Joi.string().email().trim().required(),
    password: Joi.string().min(6).max(30).required(),
    phone: Joi.string()
        .pattern(/^[0-9]+$/)
        .min(8)
        .max(15)
        .required()
        .messages({
            'string.pattern.base': 'رقم الهاتف يجب أن يحتوي على أرقام فقط'
        }),
    role: Joi.string().valid('زبون', 'مشرف', 'أدمن', 'موظف توصيل').required()
});

const updateUserSchema = Joi.object({
    fullName: Joi.string().min(2).max(50).trim(), 
    email: Joi.string().email().trim(),
    phone: Joi.string()
        .pattern(/^[0-9]+$/)
        .min(8)
        .max(15)
        .messages({
            'string.pattern.base': 'رقم الهاتف يجب أن يحتوي على أرقام فقط'
        }), // اختياري
    role: Joi.string().valid('زبون', 'مشرف', 'أدمن', 'موظف توصيل'), // اختياري، يسمح للمسؤول بتغيير دور المستخدم
    password: Joi.string().min(6).max(30),
});


const listAdminUsersQuerySchema = Joi.object({
    role: Joi.string().valid('زبون', 'مشرف', 'أدمن', 'موظف توصيل'),
    search: Joi.string().trim().max(120).allow(''),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(10)
});

const guestOrderVerifySchema = Joi.object({
    verifyPhone: Joi.string()
        .pattern(/^[0-9]+$/)
        .min(8)
        .max(15)
        .required()
        .messages({
            'string.pattern.base': 'رقم الهاتف يجب أن يحتوي على أرقام فقط'
        })
}).unknown(true); 


module.exports = {
    createStaffUserSchema,
    listAdminUsersQuerySchema,
    guestOrderVerifySchema
};
