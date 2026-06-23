const asyncHandler = require('express-async-handler');
const Banner = require('../models/banner.model');
const AppError = require('../utils/AppError');
const ApiResponse = require('../utils/ApiResponse');
const Product = require('../models/product.model');
const Category = require('../models/category.model');
const fs = require('fs');
const path = require('path');

/**
 * @route   GET /api/banners
 * @access  Public
 */
exports.listActiveBanners = asyncHandler(async (req, res) => {
    const data = await Banner.find({ isActive: true }).sort({ createdAt: -1 });
    return ApiResponse.ok(res, 'تم جلب اللافتات الإعلانية بنجاح', data);
});

/**
 * @route   GET /api/banners/:id
 * @access  Public
 * @desc    جلب تفاصيل البنر وما يرتبط به من منتجات أو فئات تلقائياً
 */
exports.getBanner = asyncHandler(async (req, res) => {
    const banner = await Banner.findById(req.params.id);
    if (!banner || !banner.isActive) {
        throw new AppError('الإعلان غير موجود', 404);
    }

    const { linkType, link } = banner; 
    let relatedData = [];

    // التحقق من النوع وجلب البيانات المرتبطة
    if (linkType === 'Product' && link && link.length > 0) {
        relatedData = await Product.find({ _id: { $in: link } });
    } else if (linkType === 'Category' && link && link.length > 0) {
        relatedData = await Category.find({ _id: { $in: link } });
    }

    return ApiResponse.ok(res, 'تم جلب اللافتة الإعلانية بنجاح', {
        banner,
        relatedData
    });
});

/**
 * @route   GET /api/admin/banners
 * @access  Private / أدمن
 */
exports.adminListBanners = asyncHandler(async (req, res) => {
    const data = await Banner.find().sort({ createdAt: -1 });
    return ApiResponse.ok(res, 'تم جلب اللافتات الإعلانية بنجاح', data);
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

    // التحقق من النوع وجلب البيانات المرتبطة
    if (linkType === 'Product' && link && link.length > 0) {
        relatedData = await Product.find({ _id: { $in: link } });
    } else if (linkType === 'Category' && link && link.length > 0) {
        relatedData = await Category.find({ _id: { $in: link } });
    }

    return ApiResponse.ok(res, 'تم جلب اللافتة الإعلانية بنجاح', {
        banner,
        relatedData
    });
});

/**
 * @route   POST /api/admin/banners
 * @access  Private / أدمن
 */
exports.adminCreateBanner = asyncHandler(async (req, res) => {
    // إذا تم رفع صورة، نضيف المسار إلى req.body
    if (req.file) {
        req.body.imageUrl = `/uploads/${req.file.filename}`;
    }

    const banner = await Banner.create(req.body);

    // إضافة البانر للمصفوفة باستخدام $addToSet (لتجنب تكرار الإعلان لنفس المنتج/القسم)
    if (banner.link && banner.link.length > 0) {
        if (banner.linkType === 'Category') {
            await Category.updateMany(
                { _id: { $in: banner.link } },
                { $addToSet: { banner: banner._id } }
            );
        } else if (banner.linkType === 'Product') {
            await Product.updateMany(
                { _id: { $in: banner.link } },
                { $addToSet: { banner: banner._id } }
            );
        }
    }

    return ApiResponse.created(res, 'تم إنشاء اللافتة الإعلانية بنجاح', banner);
});

/**
 * @route   PATCH /api/admin/banners/:id
 * @access  Private / أدمن
 */
exports.adminUpdateBanner = asyncHandler(async (req, res) => {
    // إذا تم رفع صورة جديدة، نحذف الصورة القديمة من القرص
    if (req.file) {
        const oldBanner = await Banner.findById(req.params.id);
        if (oldBanner && oldBanner.imageUrl) {
            const oldPath = path.join(__dirname, '..', oldBanner.imageUrl);
            fs.unlink(oldPath, (err) => {
                if (err && err.code !== 'ENOENT') {
                    console.error('فشل حذف الصورة القديمة:', err.message);
                }
            });
        }
        req.body.imageUrl = `/uploads/${req.file.filename}`;
    }

    // 1. إزالة هذا البانر من كل مصفوفات الفئات أو المنتجات القديمة باستخدام $pull (تنظيف البقايا)
    await Category.updateMany(
        { banner: req.params.id }, 
        { $pull: { banner: req.params.id } }
    );
    await Product.updateMany(
        { banner: req.params.id }, 
        { $pull: { banner: req.params.id } }
    );

    // 2. تحديث بيانات البانر نفسه
    const banner = await Banner.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true
    });

    if (!banner) {
        throw new AppError('الإعلان غير موجود', 404);
    }

    // 3. إضافة البانر للمصفوفات الجديدة باستخدام $addToSet
    if (banner.link && banner.link.length > 0) {
        if (banner.linkType === 'Category') {
            await Category.updateMany(
                { _id: { $in: banner.link } },
                { $addToSet: { banner: banner._id } }
            );
        } else if (banner.linkType === 'Product') {
            await Product.updateMany(
                { _id: { $in: banner.link } },
                { $addToSet: { banner: banner._id } }
            );
        }
    }

    return ApiResponse.ok(res, 'تم تحديث اللافتة الإعلانية بنجاح', banner);
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

    if (banner.imageUrl) {
        const oldPath = path.join(__dirname, '..', banner.imageUrl);
        fs.unlink(oldPath, (err) => {
            if (err && err.code !== 'ENOENT') console.error('فشل حذف الصورة:', err.message);
        });
    }

    // سحب البانر المحذوف من كافة مصفوفات الأقسام والمنتجات باستخدام $pull (التنظيف النهائي)
    await Category.updateMany(
        { banner: banner._id }, 
        { $pull: { banner: banner._id } }
    );
    await Product.updateMany(
        { banner: banner._id }, 
        { $pull: { banner: banner._id } }
    );

    return ApiResponse.ok(res, 'تم حذف الإعلان بنجاح');
});