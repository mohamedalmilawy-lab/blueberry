const express = require('express');
const router = express.Router();
const validateQuery = require('../middlewares/validateQuery');
const { publicProductsQuery } = require('../validators/query.validator');
const { listProducts, getProduct, latest, getMostRequested ,getOfferProducts} = require('../controllers/product.controller');
const { isValidObjectId } = require('../middlewares/isValidObjectId');
router.param('id', isValidObjectId);

router.get('/', validateQuery(publicProductsQuery), listProducts);
router.get('/latest', latest);
router.get('/most-requested', getMostRequested);
router.get('/offers', getOfferProducts);
router.get('/:id', getProduct);

module.exports = router;
