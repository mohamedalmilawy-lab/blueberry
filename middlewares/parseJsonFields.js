const ApiResponse = require('../utils/ApiResponse');

/**
 * يحوّل حقول multipart/form-data المرسلة كسلسلة JSON إلى كائنات/مصفوفات
 * قبل تشغيل Joi validation.
 */
const parseJsonFields = (fields) => (req, res, next) => {
    for (const field of fields) {
        const value = req.body[field];
        if (typeof value !== 'string' || !value.trim()) {
            continue;
        }
        try {
            req.body[field] = JSON.parse(value);
        } catch {
            return ApiResponse.badRequest(res, `صيغة الحقل "${field}" غير صالحة`, null);
        }
    }
    next();
};

module.exports = parseJsonFields;
