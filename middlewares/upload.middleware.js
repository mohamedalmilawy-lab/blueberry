const multer = require('multer');
const { makeCloudinaryStorage } = require('../config/cloudinary');

// أنواع الملفات المسموح بها
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

const fileFilter = (req, file, cb) => {
    if (ALLOWED_TYPES.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE',
            `نوع الملف غير مسموح. الأنواع المسموح بها: jpg, jpeg, png, webp, gif`
        ));
    }
};

// الحد الأقصى لحجم الملف: 3 ميجابايت
const MAX_SIZE = 3 * 1024 * 1024; // 3MB

/**
 * أنشئ multer instance يرفع الصور مباشرةً إلى Cloudinary.
 *
 * @param {string} [folder='general']  مجلد الوجهة داخل حساب Cloudinary
 */
function createUploader(folder = 'general') {
    const storage = makeCloudinaryStorage(folder);

    return multer({
        storage,
        fileFilter,
        limits: { fileSize: MAX_SIZE },
    });
}

// Uploaders مُجهَّزة مسبقاً لكل نوع أصول
const upload = createUploader('general');             // مستخدَم كـ fallback أو عند الحاجة
const uploadBanner = createUploader('banners');
const uploadCategory = createUploader('categories');
const uploadProduct = createUploader('products');

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

module.exports = { upload, uploadBanner, uploadCategory, uploadProduct, handleMulterError };
