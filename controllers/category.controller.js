const asyncHandler = require('express-async-handler');
const Category = require('../models/category.model');
const Product = require('../models/product.model');
const Banner = require('../models/banner.model');
const AppError = require('../utils/AppError');
const ApiResponse = require('../utils/ApiResponse');
const { deleteFromCloudinary } = require('../config/cloudinary');

// 1. إعداد الـ Populate الخاص بالمستخدم العادي (يجلب البانرات والأقسام النشطة فقط)
const publicCategoryPopulate = [
    { path: 'parent', select: 'name image isActive' },
    {
        path: 'banner',
        match: { isActive: true },
        select: 'imageUrl title linkType link isActive'
    },
    {
        path: 'products',
        match: { isActive: true },
        select: '-customerNotes'
    }
];

// 2. إعداد الـ Populate الخاص بالأدمن (يجلب كل شيء ليتمكن من الإدارة)
const adminCategoryPopulate = [
    { path: 'parent', select: 'name image isActive' },
    { path: 'banner', select: 'imageUrl title linkType link isActive' },
    {
        path: 'products',
        select: '-customerNotes'
    }
];

/**
 * @route   GET /api/categories
 * @access  Public
 */
exports.listCategories = asyncHandler(async (req, res) => {
    const filter = { isActive: true };

    if (req.query.search) {
        filter.name = { $regex: req.query.search, $options: 'i' };
    }

    // استخدمنا publicCategoryPopulate
    const categories = await Category.find(filter).sort({ name: 1 }).populate(publicCategoryPopulate);
    return ApiResponse.ok(res, 'تم جلب الأقسام بنجاح', categories);
});

/**
 * @route   GET /api/categories/:id
 * @access  Public
 */
exports.getCategory = asyncHandler(async (req, res) => {
    const category = await Category.findById(req.params.id).populate(publicCategoryPopulate);
    if (!category || !category.isActive) {
        throw new AppError('التصنيف غير موجود', 404);
    }

    return ApiResponse.ok(res, 'تم جلب القسم بنجاح', category);
});

/**
 * @route   GET /api/admin/categories/:id
 * @access  Private / أدمن
 */
exports.adminGetCategory = asyncHandler(async (req, res) => {
    const category = await Category.findById(req.params.id).populate(adminCategoryPopulate);
    if (!category) {
        throw new AppError('التصنيف غير موجود', 404);
    }

    return ApiResponse.ok(res, 'تم جلب القسم بنجاح', category);
});

/**
 * @route   GET /api/admin/categories
 * @access  Private / أدمن
 */
exports.adminListCategories = asyncHandler(async (req, res) => {
    const filter = {};

    if (req.query.search) {
        filter.name = { $regex: req.query.search, $options: 'i' };
    }

    // استخدمنا adminCategoryPopulate
    const categories = await Category.find(filter).sort({ createdAt: -1 }).populate(adminCategoryPopulate);
    return ApiResponse.ok(res, 'تم جلب الأقسام بنجاح', categories);
});

/**
 * @route   POST /api/admin/categories
 * @access  Private / أدمن
 */
exports.adminCreateCategory = asyncHandler(async (req, res) => {
    // Cloudinary يُعيد الـ URL الآمن عبر req.file.path
    if (req.file) {
        req.body.image = req.file.path;
    }

    const category = await Category.create(req.body);
    return ApiResponse.created(res, 'تم إنشاء القسم بنجاح', category);
});

/**
 * @route   PATCH /api/admin/categories/:id
 * @access  Private / أدمن
 */
exports.adminUpdateCategory = asyncHandler(async (req, res) => {
    // إذا تم رفع صورة جديدة، نحذف الصورة القديمة من Cloudinary
    if (req.file) {
        const oldCategory = await Category.findById(req.params.id);
        if (oldCategory?.image) {
            await deleteFromCloudinary(oldCategory.image);
        }
        req.body.image = req.file.path;
    }

    const category = await Category.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true
    }).populate(adminCategoryPopulate);

    if (!category) {
        throw new AppError('التصنيف غير موجود', 404);
    }

    return ApiResponse.ok(res, 'تم تحديث القسم بنجاح', category);
});

/**
 * @route   DELETE /api/admin/categories/:id
 * @access  Private / أدمن
 */
exports.adminDeleteCategory = asyncHandler(async (req, res) => {
    const productsCount = await Product.countDocuments({ category: req.params.id });

    if (productsCount > 0) {
        throw new AppError('لا يمكن حذف تصنيف مرتبط بمنتجات. قم بإعادة تعيين المنتجات أولاً.', 400);
    }

    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) {
        throw new AppError('التصنيف غير موجود', 404);
    }

    // حذف الصورة من Cloudinary
    if (category.image) {
        await deleteFromCloudinary(category.image);
    }

    // التنظيف: إزالة هذا القسم من أي بانرات كانت تشير إليه
    await Banner.updateMany(
        { link: req.params.id, linkType: 'Category' },
        { $pull: { link: req.params.id } }
    );

    return ApiResponse.ok(res, 'تم حذف التصنيف بنجاح');
});