const Joi = require('joi');

const registerPushTokenSchema = Joi.object({
    token: Joi.string().min(10).max(4096).trim().required()
});

module.exports = { registerPushTokenSchema };
