const asyncHandler = require('express-async-handler');
const Product = require('../models/product.model');
const Category = require('../models/category.model');
const Banner = require('../models/banner.model');
const AppError = require('../utils/AppError');
const ApiResponse = require('../utils/ApiResponse');
const { getPaginationFromQuery } = require('../utils/pagination');
const { deleteFromCloudinary } = require('../config/cloudinary');

// دالة مساعدة لحذف صورة من Cloudinary
async function deleteProductImage(imageUrl) {
    if (imageUrl) {
        await deleteFromCloudinary(imageUrl);
    }
}

// فصلنا الـ Populate للمستخدم العام والأدمن لتشمل البانر
const publicProductPopulate = [
    { path: 'category', select: 'name image isActive parent' },
    { path: 'banner', match: { isActive: true }, select: 'imageUrl title linkType link isActive' }
];

const adminProductPopulate = [
    { path: 'category', select: 'name image isActive parent' },
    { path: 'banner', select: 'imageUrl title linkType link isActive' }
];

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
        Product.find(filter).sort(sort).skip(skip).limit(limit).populate(publicProductPopulate),
        Product.countDocuments(filter)
    ]);

    return ApiResponse.ok(res, 'تم جلب المنتجات بنجاح', {
        items,
        meta: { page, limit, total, pages: Math.ceil(total / limit) || 1 }
    });
});

/**
 * @route   GET /api/products/:id
 * @access  Public
 */
exports.getProduct = asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.id).populate(publicProductPopulate);

    if (!product || !product.isActive) {
        throw new AppError('المنتج غير موجود', 404);
    }

    return ApiResponse.ok(res, 'تم جلب المنتج بنجاح', product);
});

// @desc    جلب أحدث المنتجات
exports.latest = asyncHandler(async (req, res) => {
    const latestProducts = await Product.find({ isActive: true })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate(publicProductPopulate);
    return ApiResponse.ok(res, 'تم جلب أحدث المنتجات بنجاح', latestProducts);
});

// @desc    جلب المنتجات الأكثر طلبًا
// @route   GET /api/products/most-requested
exports.getMostRequested = asyncHandler(async (req, res) => {
    const mostRequestedProducts = await Product.find({
        isMostRequested: true,
        isActive: true
    })
        .sort({ createdAt: -1 })
        .limit(15)
        .populate(publicProductPopulate);

    return ApiResponse.ok(res, 'تم جلب المنتجات الأكثر طلباً بنجاح', mostRequestedProducts);
});

// @desc    جلب جميع المنتجات التي عليها عروض سارية
// @route   GET /api/products/offers
// @access  Public
exports.getOfferProducts = asyncHandler(async (req, res) => {
    const now = new Date();

    const filter = {
        isActive: true,
        offerPrice: { $exists: true, $ne: null },
        offerEndDate: { $exists: true, $gte: now }
    };

    const offerProducts = await Product.find(filter)
        .sort({ offerEndDate: 1 })
        .populate(publicProductPopulate);

    return ApiResponse.ok(res, 'تم جلب منتجات العروض بنجاح', offerProducts);
});

/**
 * @route   GET /api/admin/products/:id
 * @access  Private / أدمن
 */
exports.adminGetProduct = asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.id).populate(adminProductPopulate);
    if (!product) {
        throw new AppError('المنتج غير موجود', 404);
    }
    return ApiResponse.ok(res, 'تم جلب المنتج بنجاح', product);
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
        Product.find(filter).sort(sort).skip(skip).limit(limit).populate(adminProductPopulate),
        Product.countDocuments(filter)
    ]);

    return ApiResponse.ok(res, 'تم جلب المنتجات بنجاح', {
        items,
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

    // جمع الصور: الصور الموجودة في req.body.images مع الصور المرفوعة (req.files)
    let images = [];

    // إضافة الصور الموجودة في الـ body (إذا كانت موجودة)
    if (req.body.images) {
        if (Array.isArray(req.body.images)) {
            images = [...req.body.images];
        } else {
            images = [req.body.images];
        }
    }

    // إضافة الصور المرفوعة من multer — Cloudinary يُعيد الـ URL عبر file.path
    if (req.files && req.files.length > 0) {
        const uploadedImages = req.files.map(file => file.path);
        images = [...images, ...uploadedImages];
    }

    // التأكد من أن هناك على الأقل صورة واحدة
    if (images.length === 0) {
        throw new AppError('يجب إضافة على الأقل صورة واحدة للمنتج', 400);
    }

    const product = await Product.create({
        ...req.body,
        images
    });
    const populated = await Product.findById(product._id).populate(adminProductPopulate);

    return ApiResponse.created(res, 'تم إنشاء المنتج بنجاح', populated);
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

    // جلب المنتج القديم أولاً
    const oldProduct = await Product.findById(req.params.id);
    if (!oldProduct) {
        throw new AppError('المنتج غير موجود', 404);
    }

    // معالجة الصور
    let newImages = [...oldProduct.images]; // البداية بالصور القديمة
    const imagesToKeep = req.body.imagesToKeep; // مصفوفة من مسارات الصور التي نريد الاحتفاظ بها

    // إذا أرسل الأدمن قائمة الصور التي يريد الاحتفاظ بها:
    if (imagesToKeep) {
        const keepSet = new Set(Array.isArray(imagesToKeep) ? imagesToKeep : [imagesToKeep]);

        // حذف الصور القديمة التي ليست في قائمة الحفظ من Cloudinary
        const deletePromises = oldProduct.images
            .filter(img => !keepSet.has(img))
            .map(img => deleteProductImage(img));
        await Promise.all(deletePromises);

        // تحديث المصفوفة لتكون فقط الصور المطلوبة
        newImages = oldProduct.images.filter(img => keepSet.has(img));
    }

    // إضافة الصور الجديدة المرفوعة (req.files) — Cloudinary يُعيد الـ URL عبر file.path
    if (req.files && req.files.length > 0) {
        const uploadedImages = req.files.map(file => file.path);
        newImages = [...newImages, ...uploadedImages];
    }

    // إضافة الصور الموجودة في req.body.images (إذا كانت موجودة)
    if (req.body.images) {
        const bodyImages = Array.isArray(req.body.images) ? req.body.images : [req.body.images];
        // دمج مع الصور الجديدة، التأكد من عدم تكرار نفس الصورة
        bodyImages.forEach(img => {
            if (!newImages.includes(img)) {
                newImages.push(img);
            }
        });
    }

    // التأكد من أن هناك على الأقل صورة واحدة
    if (newImages.length === 0) {
        throw new AppError('لا يمكن حذف جميع صور المنتج، يجب أن يبقى على الأقل صورة واحدة', 400);
    }

    // إعداد البيانات للتحديث
    const updateData = {
        ...req.body,
        images: newImages
    };
    delete updateData.imagesToKeep; // حذف هذا الحقل لأنه ليس جزءاً من الموديل

    const product = await Product.findByIdAndUpdate(req.params.id, updateData, {
        new: true,
        runValidators: true
    }).populate(adminProductPopulate);

    return ApiResponse.ok(res, 'تم تحديث المنتج بنجاح', product);
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
    ).populate(adminProductPopulate);

    if (!product) {
        throw new AppError('المنتج غير موجود', 404);
    }

    return ApiResponse.ok(res, 'تم تحديث المنتج بنجاح', product);
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

    // حذف جميع الصور من Cloudinary
    if (product.images && product.images.length > 0) {
        await Promise.all(product.images.map(img => deleteProductImage(img)));
    }

    // التنظيف: إزالة هذا المنتج من أي بانرات إعلانية كانت تشير إليه
    await Banner.updateMany(
        { link: req.params.id, linkType: 'Product' },
        { $pull: { link: req.params.id } }
    );

    return ApiResponse.ok(res, 'تم حذف المنتج بنجاح', null);
});