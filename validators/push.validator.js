const Joi = require('joi');

const broadcastPushSchema = Joi.object({
    title: Joi.string().min(1).max(200).trim().required(),
    message: Joi.string().min(1).max(2000).trim().required()
});

module.exports = { broadcastPushSchema };
