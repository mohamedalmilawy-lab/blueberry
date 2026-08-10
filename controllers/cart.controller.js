const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const User = require('../models/user.model');
const Product = require('../models/product.model');
const AppError = require('../utils/AppError');
const ApiResponse = require('../utils/ApiResponse');
const { getEffectiveUnitPrice } = require('../utils/productPrice');

const cartPopulate = {
    path: 'cart.product',
    select: 'name price images category isActive offerPrice offerEndDate sizes'
};

function assertObjectId(id, message = 'معرف غير صالح') {
    if (!mongoose.isValidObjectId(id)) {
        throw new AppError(message, 400);
    }
}

/** ObjectId string for a cart line (handles lean-populated plain objects). */
function cartLineProductId(line) {
    const ref = line?.product;
    if (ref == null) return null;
    if (typeof ref === 'object' && ref._id != null) return ref._id.toString();
    return ref.toString();
}

/**
 * تطبيع قيمة المقاس لتوحيد المقارنة في كل العمليات (إضافة/حذف/زيادة/نقصان).
 * undefined أو null أو '' تُعامل كقيمة واحدة موحّدة "بدون مقاس".
 */
function normalizeSize(size) {
    if (size === undefined || size === null) return undefined;
    const trimmed = String(size).trim();
    return trimmed === '' ? undefined : trimmed;
}

/** دالة لحساب الإجماليات بدقة */
function computeCartTotals(cart, productsById) {
    let subtotal = 0;
    const lines = (cart || []).map((line) => {
        const id = cartLineProductId(line);
        const p = id ? productsById.get(id) : undefined;

        if (!p || !p.isActive) {
            return { product: line.product, quantity: line.quantity, size: line.size, unitPrice: 0, lineTotal: 0, unavailable: true };
        }

        const unit = getEffectiveUnitPrice(p, line.size);
        const lineTotal = unit * line.quantity;
        subtotal += lineTotal;

        return { product: line.product, quantity: line.quantity, size: line.size, unitPrice: unit, lineTotal, unavailable: false };
    });

    // تقريب السعر لمنع أخطاء الجافاسكريبت العشرية (مثل 0.300000004)
    subtotal = Math.round(subtotal * 100) / 100;
    return { lines, subtotal };
}

/**
 * 🌟 دالة مساعدة (Helper) لجلب السلة المحدثة، منعاً لتكرار الكود
 * توفر استعلاماً إضافياً لقاعدة البيانات باستغلال البيانات القادمة من الـ populate
 */
async function getCartResponse(userId) {
    const user = await User.findById(userId).select('cart').populate(cartPopulate);
    if (!user) throw new AppError('المستخدم غير موجود', 404);

    const map = new Map();
    // بناء الخريطة مباشرة من البيانات المجلوبة مسبقاً (بدون استعلام Product.find جديد)
    user.cart.forEach((c) => {
        if (c.product && c.product._id) {
            map.set(c.product._id.toString(), c.product);
        }
    });

    const { lines, subtotal } = computeCartTotals(user.cart, map);
    return { items: lines, subtotal };
}


/**
 * @route   GET /api/cart
 * @access  Private
 */
exports.getCart = asyncHandler(async (req, res) => {
    const cartData = await getCartResponse(req.user.id);
    return ApiResponse.ok(res, 'تم جلب سلة المشتريات بنجاح', cartData);
});

/**
 * @route   POST /api/cart/items
 * @access  Private
 */
exports.addCartItem = asyncHandler(async (req, res) => {
    const { product } = req.body;
    const size = normalizeSize(req.body.size);
    const quantity = Number(req.body.quantity) || 1;

    if (quantity <= 0) throw new AppError('الكمية يجب أن تكون 1 على الأقل', 400);

    const p = await Product.findById(product);
    if (!p || !p.isActive) {
        throw new AppError('المنتج غير متوفر', 400);
    }

    const user = await User.findById(req.user.id);
    if (!user) throw new AppError('المستخدم غير موجود', 404);

    // البحث عن المنتج بنفس الـ ID والمقاس
    const idx = user.cart.findIndex((c) =>
        c.product.toString() === product && normalizeSize(c.size) === size
    );

    if (idx >= 0) {
        user.cart[idx].quantity += quantity;
    } else {
        user.cart.push({ product, quantity, size });
    }

    await user.save();

    const cartData = await getCartResponse(user._id);
    return ApiResponse.created(res, 'تمت إضافة العنصر إلى السلة', cartData);
});

/**
 * @route   DELETE /api/cart/items/:productId
 * @access  Private
 */
exports.removeCartItem = asyncHandler(async (req, res) => {
    assertObjectId(req.params.productId);
    // جلب المقاس وتطبيعه بنفس منطق الإضافة (undefined/null/'' => بدون مقاس)
    const sizeToMatch = normalizeSize(req.query.size);

    const user = await User.findById(req.user.id);
    if (!user) throw new AppError('المستخدم غير موجود', 404);

    const beforeLength = user.cart.length;

    user.cart = user.cart.filter((c) => {
        const productMatch = c.product.toString() === req.params.productId;
        const sizeMatch = normalizeSize(c.size) === sizeToMatch;
        return !(productMatch && sizeMatch); // احذف إذا تطابق المنتج والمقاس فقط
    });

    if (user.cart.length === beforeLength) {
        throw new AppError('العنصر غير موجود في السلة', 404);
    }

    await user.save();

    const cartData = await getCartResponse(user._id);
    return ApiResponse.ok(res, 'تمت إزالة المنتج من السلة', cartData);
});

/**
 * @route   PATCH /api/cart/items/:productId/decrement
 * @access  Private
 */
exports.decrementCartItem = asyncHandler(async (req, res) => {
    assertObjectId(req.params.productId);
    const sizeToMatch = normalizeSize(req.query.size);

    const user = await User.findById(req.user.id);
    if (!user) throw new AppError('المستخدم غير موجود', 404);

    const idx = user.cart.findIndex((c) => {
        const productMatch = c.product.toString() === req.params.productId;
        const sizeMatch = normalizeSize(c.size) === sizeToMatch;
        return productMatch && sizeMatch;
    });

    if (idx < 0) throw new AppError('العنصر غير موجود في السلة', 404);

    if (user.cart[idx].quantity <= 1) {
        user.cart.splice(idx, 1); // إذا كانت الكمية 1، احذف المنتج
    } else {
        user.cart[idx].quantity -= 1;
    }

    await user.save();

    const cartData = await getCartResponse(user._id);
    return ApiResponse.ok(res, 'تم تقليل الكمية بنجاح', cartData);
});

/**
 * @route   PATCH /api/cart/items/:productId/increment
 * @access  Private
 */
exports.incrementCartItem = asyncHandler(async (req, res) => {
    assertObjectId(req.params.productId);
    const sizeToMatch = normalizeSize(req.query.size);

    const user = await User.findById(req.user.id);
    if (!user) throw new AppError('المستخدم غير موجود', 404);

    const idx = user.cart.findIndex((c) => {
        const productMatch = c.product.toString() === req.params.productId;
        const sizeMatch = normalizeSize(c.size) === sizeToMatch;
        return productMatch && sizeMatch;
    });

    if (idx < 0) throw new AppError('العنصر غير موجود في السلة', 404);

    user.cart[idx].quantity += 1;

    await user.save();

    const cartData = await getCartResponse(user._id);
    return ApiResponse.ok(res, 'تم زيادة الكمية بنجاح', cartData);
});