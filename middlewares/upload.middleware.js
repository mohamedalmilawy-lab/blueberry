const multer = require('multer');
const path = require('path');
const fs = require('fs');

// التأكد من وجود مجلد الرفع
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// إعداد التخزين
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const uniqueName = `${Date.now()}${ext}`;
        cb(null, uniqueName);
    }
});

// فلترة أنواع الملفات المسموح بها
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

const fileFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_TYPES.includes(file.mimetype) && ALLOWED_EXTENSIONS.includes(ext)) {
        cb(null, true);
    } else {
        cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 
            `نوع الملف غير مسموح. الأنواع المسموح بها: ${ALLOWED_EXTENSIONS.join(', ')}`
        ));
    }
};

// الحد الأقصى لحجم الملف: 3 ميجابايت
const MAX_SIZE = 3 * 1024 * 1024; // 3MB

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: MAX_SIZE }
});

/**
 * Middleware لمعالجة أخطاء multer وتحويلها لرسائل واضحة
 */
const handleMulterError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        const messages = {
            LIMIT_FILE_SIZE: `حجم الملف كبير جداً. الحد الأقصى هو ${MAX_SIZE / (1024 * 1024)} ميجابايت`,
            LIMIT_UNEXPECTED_FILE: err.field || 'حقل الملف غير متوقع'
        };
        return res.status(400).json({
            StatusCode: 400,
            Message: messages[err.code] || err.message,
            Data: null
        });
    }
    if (err) {
        return res.status(400).json({
            StatusCode: 400,
            Message: err.message || 'خطأ في رفع الملف',
            Data: null
        });
    }
    next();
};

module.exports = { upload, handleMulterError };
