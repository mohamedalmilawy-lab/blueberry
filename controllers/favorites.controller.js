const asyncHandler = require('express-async-handler');
const User = require('../models/user.model');
const Product = require('../models/product.model');
const AppError = require('../utils/AppError');

const favPopulate = { path: 'favorites', select: 'name price images category isActive isMostRequested offerPrice offerEndDate' };

/**
 * @route   GET /api/favorites
 * @access  Private
 */
exports.listFavorites = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id).select('favorites').populate(favPopulate);
    if (!user) {
        throw new AppError('المستخدم غير موجود', 404);
    }
    res.json({ success: true, data: user.favorites });
});

/**
 * @route   POST /api/favorites/:productId
 * @access  Private
 */
exports.addFavorite = asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.productId);
    if (!product || !product.isActive) {
        throw new AppError('المنتج غير متوفر', 400);
    }

    const user = await User.findById(req.user.id);
    if (!user) {
        throw new AppError('المستخدم غير موجود', 404);
    }

    const exists = user.favorites.some((id) => id.toString() === req.params.productId);
    if (exists) {
        return res.status(200).json({ success: true, message: 'المنتج موجود بالفعل في المفضلة' });
    }

    user.favorites.push(product._id);
    await user.save();

    const refreshed = await User.findById(user._id).select('favorites').populate(favPopulate);
    res.status(201).json({ success: true, data: refreshed.favorites });
});

/**
 * @route   DELETE /api/favorites/:productId
 * @access  Private
 */
exports.removeFavorite = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id);
    if (!user) {
        throw new AppError('المستخدم غير موجود', 404);
    }
    const before = user.favorites.length;
    user.favorites = user.favorites.filter((id) => id.toString() !== req.params.productId);
    if (user.favorites.length === before) {
        throw new AppError('المنتج غير موجود في المفضلة', 404);
    }
    await user.save();
    const refreshed = await User.findById(user._id).select('favorites').populate(favPopulate);
    
    res.json({ 
        success: true, 
        message: 'تمت إزالة المنتج من المفضلة',
        data: refreshed.favorites 
    });
});
