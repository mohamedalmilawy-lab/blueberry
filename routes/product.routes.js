const express = require('express');
const router = express.Router();
const validateQuery = require('../middlewares/validateQuery');
const { publicProductsQuery } = require('../validators/query.validator');
const {
    listProducts,
    getProduct,
    latest,
    getMostRequested,
    getOfferProducts,
    submitCustomerNote
} = require('../controllers/product.controller');
const { isValidObjectId } = require('../middlewares/isValidObjectId');
const optionalAuth = require('../middlewares/optionalAuth');
const validate = require('../middlewares/validate');
const { submitNoteSchema } = require('../validators/product.validator');

// تطبيق المصادقة الاختيارية على جميع المسارات العامة
// حتى يتمكن الكنترولر من حساب inCart و inFavorites للمستخدمين المسجلين
router.use(optionalAuth);

router.param('id', isValidObjectId);

router.get('/', validateQuery(publicProductsQuery), listProducts);
router.get('/latest', latest);
router.get('/most-requested', getMostRequested);
router.get('/offers', getOfferProducts);
router.get('/:id', getProduct);

// ─── إرسال ملاحظة زبون على منتج ─────────────────────────────────────────────
router.post('/:id/notes', validate(submitNoteSchema), submitCustomerNote);

module.exports = router;
