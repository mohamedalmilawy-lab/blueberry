const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const mongoose = require('mongoose');
const AppError = require('../utils/AppError');
const { listFavorites, addFavorite, removeFavorite } = require('../controllers/favorites.controller');

function validateProductIdParam(req, res, next) {
    if (!mongoose.isValidObjectId(req.params.productId)) {
        return next(new AppError('معرف المنتج غير صالح', 400));
    }
    next();
}

router.use(auth);

router.get('/', listFavorites);
router.post('/:productId', validateProductIdParam, addFavorite);
router.delete('/:productId', validateProductIdParam, removeFavorite);

module.exports = router;
