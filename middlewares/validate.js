const validate = (schema) => {
    return (req, res, next) => {
        // التحقق من البيانات القادمة في req.body
        const { error } = schema.validate(req.body, { abortEarly: false });

        if (error) {
            // تنسيق رسائل الخطأ لتكون مقروءة بشكل أفضل للـ Frontend
            const errors = error.details.map((detail) => ({
                field: detail.path.join('.'),
                message: detail.message.replace(/['"]/g, '')
            }));
            return res.status(400).json({ errors });
        }
        next();
    };
};

module.exports = validate;