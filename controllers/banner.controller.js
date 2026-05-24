const asyncHandler = require('express-async-handler');
const Banner = require('../models/banner.model');
const AppError = require('../utils/AppError');
const Product = require('../models/product.model');
const Category = require('../models/category.model');

/**
 * @route   GET /api/banners
 * @access  Public
 */
exports.listActiveBanners = asyncHandler(async (req, res) => {
    const data = await Banner.find({ status: 'Active' }).sort({ createdAt: -1 });
    res.json({ success: true, data });
});


/*
 * جلب تفاصيل البنر وما يتربط به من منتجات أو فئات تلقائياً
 * @route   GET /api/banners/:id
 */
exports.getBanner = asyncHandler(async (req, res, next) => {
    const banner = await Banner.findById(req.params.id);
    if (!banner) {
        throw new AppError('الإعلان غير موجود', 404);
    }

    const { linkType, link } = banner; 
    let relatedData = [];

    // 3. التحقق من النوع وجلب البيانات المرتبطة
    if (linkType === 'Product' && link.length > 0) {
        relatedData = await Product.find({ _id: { $in: link } });
    } 
    
    else if (linkType === 'Category' && link.length > 0) {
        relatedData = await Product.find({ category: { $in: link } }).populate('category');
    }

    res.json({ 
        success: true, 
        data: {
            banner,
            relatedData // هنا ستجد المنتجات أو الفئات التي طلبناها
        } 
    });
});


/**
 * @route   GET /api/admin/banners
 * @access  Private / أدمن
 */
exports.adminListBanners = asyncHandler(async (req, res) => {
    const data = await Banner.find().sort({ createdAt: -1 });
    res.json({ success: true, data });
});

/**
 * @route   GET /api/admin/banners/:id
 * @access  Private / أدمن
 */
exports.adminGetBanner = asyncHandler(async (req, res) => {
    const banner = await Banner.findById(req.params.id);
    if (!banner) {
        throw new AppError('الإعلان غير موجود', 404);
    }

    const { linkType, link } = banner; 
    let relatedData = [];

    // 3. التحقق من النوع وجلب البيانات المرتبطة
    if (linkType === 'Product' && link.length > 0) {
        relatedData = await Product.find({ _id: { $in: link } });
    } 
    
    else if (linkType === 'Category' && link.length > 0) {
        relatedData = await Product.find({ category: { $in: link } }).populate('category');
    }

    res.json({ 
        success: true, 
        data: {
            banner,
            relatedData // هنا ستجد المنتجات أو الفئات التي طلبناها
        } 
    });
});

/**
 * @route   POST /api/admin/banners
 * @access  Private / أدمن
 */
exports.adminCreateBanner = asyncHandler(async (req, res) => {
    const banner = await Banner.create(req.body);
    res.status(201).json({ success: true, data: banner });
});

/**
 * @route   PATCH /api/admin/banners/:id
 * @access  Private / أدمن
 */
exports.adminUpdateBanner = asyncHandler(async (req, res) => {
    const banner = await Banner.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true
    });
    if (!banner) {
        throw new AppError('الإعلان غير موجود', 404);
    }
    res.json({ success: true, data: banner });
});

/**
 * @route   DELETE /api/admin/banners/:id
 * @access  Private / أدمن
 */
exports.adminDeleteBanner = asyncHandler(async (req, res) => {
    const banner = await Banner.findByIdAndDelete(req.params.id);
    if (!banner) {
        throw new AppError('الإعلان غير موجود', 404);
    }
    res.json({ success: true, message: 'تم حذف الإعلان' });
});
