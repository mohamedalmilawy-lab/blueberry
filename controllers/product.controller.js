const asyncHandler = require('express-async-handler');
const Product = require('../models/product.model');
const Category = require('../models/category.model');
const AppError = require('../utils/AppError');
const { getPaginationFromQuery } = require('../utils/pagination');

const productPopulate = { path: 'category', select: 'name image isActive parent' };

function buildProductFilter(query, { admin = false } = {}) {
    const filter = {};
    if (!admin) {
        filter.isActive = true;
    } else if (query.isActive !== undefined) {
        filter.isActive = query.isActive;
    }
    if (query.category) {
        filter.category = query.category;
    }
    if (query.isMostRequested !== undefined && admin) {
        filter.isMostRequested = query.isMostRequested;
    }
    if (query.priceMin !== undefined || query.priceMax !== undefined) {
        filter.price = {};
        if (query.priceMin !== undefined) filter.price.$gte = query.priceMin;
        if (query.priceMax !== undefined) filter.price.$lte = query.priceMax;
    }
    const search = (query.search || query.name || '').trim();
    if (search) {
        filter.$or = [
            { name: { $regex: search, $options: 'i' } },
            { details: { $regex: search, $options: 'i' } }
        ];
    }
    return filter;
}

function sortFromQuery(sortKey) {
    switch (sortKey) {
        case 'priceAsc':
            return { price: 1 };
        case 'priceDesc':
            return { price: -1 };
        case 'name':
            return { name: 1 };
        case 'newest':
        default:
            return { createdAt: -1 };
    }
}

/**
 * @route   GET /api/products
 * @access  Public
 */
exports.listProducts = asyncHandler(async (req, res) => {
    const { page, limit, skip } = getPaginationFromQuery(req.query);
    const filter = buildProductFilter(req.query, { admin: false });
    const sort = sortFromQuery(req.query.sort);

    const [items, total] = await Promise.all([
        Product.find(filter).sort(sort).skip(skip).limit(limit).populate(productPopulate),
        Product.countDocuments(filter)
    ]);

    res.json({
        success: true,
        data: items,
        meta: { page, limit, total, pages: Math.ceil(total / limit) || 1 }
    });
});

/**
 * @route   GET /api/products/:id
 * @access  Public
 */
exports.getProduct = asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.id).populate(productPopulate);
    if (!product || !product.isActive) {
        throw new AppError('المنتج غير موجود', 404);
    }
    res.json({ success: true, data: product });
});

/**
 * @route   GET /api/admin/products/:id
 * @access  Private / أدمن
 */
exports.adminGetProduct = asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.id).populate(productPopulate);
    if (!product) {
        throw new AppError('المنتج غير موجود', 404);
    }
    res.json({ success: true, data: product });
});

/**
 * @route   GET /api/admin/products
 * @access  Private / أدمن
 */
exports.adminListProducts = asyncHandler(async (req, res) => {
    const { page, limit, skip } = getPaginationFromQuery(req.query);
    const filter = buildProductFilter(req.query, { admin: true });
    const sort = sortFromQuery(req.query.sort);

    const [items, total] = await Promise.all([
        Product.find(filter).sort(sort).skip(skip).limit(limit).populate(productPopulate),
        Product.countDocuments(filter)
    ]);

    res.json({
        success: true,
        data: items,
        meta: { page, limit, total, pages: Math.ceil(total / limit) || 1 }
    });
});

/**
 * @route   POST /api/admin/products
 * @access  Private / أدمن
 */
exports.adminCreateProduct = asyncHandler(async (req, res) => {
    const category = await Category.findById(req.body.category);
    if (!category) {
        throw new AppError('التصنيف غير موجود', 400);
    }
    const product = await Product.create(req.body);
    const populated = await Product.findById(product._id).populate(productPopulate);
    res.status(201).json({ success: true, data: populated });
});

/**
 * @route   PATCH /api/admin/products/:id
 * @access  Private / أدمن
 */
exports.adminUpdateProduct = asyncHandler(async (req, res) => {
    if (req.body.category) {
        const category = await Category.findById(req.body.category);
        if (!category) {
            throw new AppError('التصنيف غير موجود', 400);
        }
    }
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true
    }).populate(productPopulate);

    if (!product) {
        throw new AppError('المنتج غير موجود', 404);
    }

    res.json({ success: true, data: product });
});

/**
 * @route   PATCH /api/admin/products/:id/featured
 * @access  Private / أدمن
 */
exports.adminToggleFeatured = asyncHandler(async (req, res) => {
    const product = await Product.findByIdAndUpdate(
        req.params.id,
        { isMostRequested: req.body.isMostRequested },
        { new: true, runValidators: true }
    ).populate(productPopulate);

    if (!product) {
        throw new AppError('المنتج غير موجود', 404);
    }

    res.json({ success: true, data: product });
});

/**
 * @route   DELETE /api/admin/products/:id
 * @access  Private / أدمن
 */
exports.adminDeleteProduct = asyncHandler(async (req, res) => {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
        throw new AppError('المنتج غير موجود', 404);
    }
    res.json({ success: true, message: 'تم حذف المنتج' });
});
