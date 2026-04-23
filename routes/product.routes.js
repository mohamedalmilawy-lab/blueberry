const express = require('express');
const router = express.Router();
const validateQuery = require('../middlewares/validateQuery');
const { publicProductsQuery } = require('../validators/query.validator');
const { listProducts, getProduct } = require('../controllers/product.controller');
const { isValidObjectId } = require('../middlewares/isValidObjectId');
router.param('id', isValidObjectId);

router.get('/', validateQuery(publicProductsQuery), listProducts);
router.get('/:id', getProduct);

module.exports = router;
