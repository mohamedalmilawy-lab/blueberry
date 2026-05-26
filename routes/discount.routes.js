const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const { applyDiscountSchema } = require('../validators/discount.validator');
const { applyDiscountCode } = require('../controllers/discount.controller');

// All discount routes require authentication
router.use(auth);

/**
 * @route   POST /api/discounts/apply
 * @desc    Authenticated user applies a discount code
 * @access  Private
 */
router.post('/apply', validate(applyDiscountSchema), applyDiscountCode);

module.exports = router;
