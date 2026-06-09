const ApiResponse = require('../utils/ApiResponse');

/**
 * Validates req.query with Joi (coercion enabled).
 */
const validateQuery = (schema) => (req, res, next) => {
    const { error, value } = schema.validate(req.query, {
        abortEarly: false,
        stripUnknown: true,
        convert: true
    });

    if (error) {
        const errors = error.details.map((detail) => ({
            field: detail.path.join('.'),
            message: detail.message.replace(/['"]/g, '')
        }));
        return ApiResponse.badRequest(res, 'فشل التحقق من صحة البيانات', errors);
    }
    req.query = value;
    next();
};

module.exports = validateQuery;
