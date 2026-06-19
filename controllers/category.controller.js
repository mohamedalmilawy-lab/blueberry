const asyncHandler = require('express-async-handler');
const Category = require('../models/category.model');
const Product = require('../models/product.model');
const AppError = require('../utils/AppError');
const ApiResponse = require('../utils/ApiResponse');

const categoryPopulate = [
    { path: 'parent', select: 'name image isActive' },
    { path: 'banner', select: 'imageUrl title linkType link isActive' } //  هذا هو السطر  الخاص بالبانر
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

    const categories = await Category.find(filter).sort({ name: 1 }).populate(categoryPopulate);
    return ApiResponse.ok(res, 'تم جلب الأقسام بنجاح', categories);
});

/**
 * @route   GET /api/categories/:id
 * @access  Public
 */
exports.getCategory = asyncHandler(async (req, res) => {
    const category = await Category.findById(req.params.id).populate(categoryPopulate);
    if (!category || !category.isActive) {
        throw new AppError('التصنيف غير موجود', 404);
    }
    
    const products = await Product.find({ category: req.params.id, isActive: true });

    return ApiResponse.ok(res, 'تم جلب القسم بنجاح', { category, products });
});

/**
 * @route   GET /api/admin/categories/:id
 * @access  Private / أدمن
 */
exports.adminGetCategory = asyncHandler(async (req, res) => {
    const category = await Category.findById(req.params.id).populate(categoryPopulate);
    if (!category) {
        throw new AppError('التصنيف غير موجود', 404);
    }
    const products = await Product.find({ category: req.params.id});

    return ApiResponse.ok(res, 'تم جلب القسم بنجاح', { category, products });
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

    const categories = await Category.find(filter).sort({ createdAt: -1 }).populate(categoryPopulate);
    return ApiResponse.ok(res, 'تم جلب الأقسام بنجاح', categories);
});

/**
 * @route   POST /api/admin/categories
 * @access  Private / أدمن
 */
exports.adminCreateCategory = asyncHandler(async (req, res) => {
    const category = await Category.create(req.body);
    return ApiResponse.created(res, 'تم إنشاء القسم بنجاح', category);
});

/**
 * @route   PATCH /api/admin/categories/:id
 * @access  Private / أدمن
 */
exports.adminUpdateCategory = asyncHandler(async (req, res) => {
    const category = await Category.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true
    }).populate(categoryPopulate);

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
    return ApiResponse.ok(res, 'تم حذف التصنيف');
});
