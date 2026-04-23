const express = require('express');
const router = express.Router();
const { listCategories, getCategory } = require('../controllers/category.controller');
const { isValidObjectId } = require('../middlewares/isValidObjectId');
router.param('id', isValidObjectId);

router.get('/', listCategories);
router.get('/:id', getCategory);

module.exports = router;