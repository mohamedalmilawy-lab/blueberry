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
        return res.status(400).json({ errors });
    }
    req.query = value;
    next();
};

module.exports = validateQuery;
