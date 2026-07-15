const Joi = require('joi');

const broadcastPushSchema = Joi.object({
    title: Joi.string().min(1).max(200).trim().required(),
    message: Joi.string().min(1).max(2000).trim().required(),
    user: Joi.string().hex().length(24).messages({
        'string.pattern.base': 'معرف غير صالح'
    }).optional(),
    isGlobal: Joi.bool()
});

module.exports = { broadcastPushSchema };
