const Joi = require('joi');

const objectId = Joi.string().hex().length(24).messages({
    'string.pattern.base': 'معرف غير صالح'
});

const addCartItemSchema = Joi.object({
    product: objectId.required(),
    quantity: Joi.number().integer().min(1).default(1),
    size: Joi.string().optional()
});

module.exports = {
    addCartItemSchema
};
