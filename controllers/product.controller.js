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

//get latest product
exports.latest = asyncHandler(async (req, res) => {
    const latestProducts = await Product.find().sort({ createdAt: -1 }) .limit(10);
    res.json(latestProducts); 
});

// @desc    جلب المنتجات الأكثر طلبًا
// @route   GET /api/products/most-requested  (تم تعديل المسار ليكون أوضح)
exports.getMostRequested = asyncHandler(async (req, res) => {
    // 1. ابحث عن المنتجات التي تكون "الأكثر طلباً" و "فعالة"
    const mostRequestedProducts = await Product.find({ 
        isMostRequested: true, 
        isActive: true 
    })
    .sort({ createdAt: -1 }) // 2. رتبها من الأحدث إلى الأقدم
    .limit(15) // 3. حدد عدد النتائج (مثلاً 10 منتجات)
    .populate(productPopulate); // 4. أضف بيانات التصنيف

    // 5. أرسل النتائج كاستجابة
    res.json({ success: true, data: mostRequestedProducts });
});

// @desc    جلب جميع المنتجات التي عليها عروض سارية
// @route   GET /api/products/offers
// @access  Public
exports.getOfferProducts = asyncHandler(async (req, res) => {
    // الحصول على تاريخ ووقت الآن
    const now = new Date();

    // بناء شروط البحث
    const filter = {
        isActive: true, // 1. يجب أن يكون المنتج فعالاً
        offerPrice: { $exists: true, $ne: null }, // 2. يجب أن يوجد سعر للعرض
        offerEndDate: { $exists: true, $gte: now } // 3. تاريخ انتهاء العرض يجب أن يكون أكبر من أو يساوي تاريخ اليوم
    };

    // البحث في قاعدة البيانات مع تطبيق الشروط والترتيب
    const offerProducts = await Product.find(filter)
        .sort({ offerEndDate: 1 }) // ترتيب المنتجات حسب تاريخ انتهاء العرض (العروض التي ستنتهي قريباً تظهر أولاً)
        .populate(productPopulate); // جلب بيانات التصنيف

    // إرسال الرد
    res.json({ success: true, data: offerProducts });
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
