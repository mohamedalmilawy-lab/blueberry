const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const User = require('../models/user.model');
const Product = require('../models/product.model');
const AppError = require('../utils/AppError');
const { getEffectiveUnitPrice } = require('../utils/productPrice');

const cartPopulate = { path: 'cart.product', select: 'name price images category isActive offerPrice offerEndDate' };

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

function computeCartTotals(cart, productsById) {
    let subtotal = 0;
    const lines = (cart || []).map((line) => {
        const id = cartLineProductId(line);
        const p = id ? productsById.get(id) : undefined;
        if (!p || !p.isActive) {
            return { product: line.product, quantity: line.quantity, unitPrice: 0, lineTotal: 0, unavailable: true };
        }
        const unit = getEffectiveUnitPrice(p);
        const lineTotal = unit * line.quantity;
        subtotal += lineTotal;
        return { product: line.product, quantity: line.quantity, unitPrice: unit, lineTotal, unavailable: false };
    });
    return { lines, subtotal };
}

/**
 * @route   GET /api/cart
 * @access  Private
 */
exports.getCart = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id).select('cart').populate(cartPopulate);
    if (!user) {
        throw new AppError('المستخدم غير موجود', 404);
    }

    const ids = user.cart
        .map((c) => (c.product && c.product._id ? c.product._id : c.product))
        .filter(Boolean)
        .map((id) => id.toString());
    const products = await Product.find({ _id: { $in: ids } }).select(
        'name price images category isActive offerPrice offerEndDate'
    );
    const map = new Map(products.map((p) => [p._id.toString(), p]));

    const { lines, subtotal } = computeCartTotals(user.cart, map);

    res.json({
        success: true,
        data: {
            items: lines,
            subtotal
        }
    });
});

/**
 * @route   POST /api/cart/items
 * @access  Private
 */
exports.addCartItem = asyncHandler(async (req, res) => {
    const { product } = req.body;
    const quantity = Number(req.body.quantity) || 1;
    if (quantity <= 0) throw new AppError('الكمية يجب أن تكون 1 على الأقل', 400);
    const p = await Product.findById(product);
    if (!p || !p.isActive) {
        throw new AppError('المنتج غير متوفر', 400);
    }

    const user = await User.findById(req.user.id);
    if (!user) {
        throw new AppError('المستخدم غير موجود', 404);
    }

    const idx = user.cart.findIndex((c) => c.product.toString() === product);
    if (idx >= 0) {
        user.cart[idx].quantity += quantity;
    } else {
        user.cart.push({ product, quantity });
    }
    await user.save();

    const refreshed = await User.findById(user._id).select('cart').populate(cartPopulate);
    const map = new Map(
        (await Product.find({ _id: { $in: refreshed.cart.map((c) => c.product._id) } })).map((x) => [
            x._id.toString(),
            x
        ])
    );
    const { lines, subtotal } = computeCartTotals(refreshed.cart, map);

    res.status(201).json({
        success: true,
        data: { items: lines, subtotal }
    });
});

/**
 * @route   DELETE /api/cart/items/:productId
 * @access  Private
 */
exports.removeCartItem = asyncHandler(async (req, res) => {
    assertObjectId(req.params.productId);
    const user = await User.findById(req.user.id);
    if (!user) {
        throw new AppError('المستخدم غير موجود', 404);
    }
    const before = user.cart.length;
    user.cart = user.cart.filter((c) => c.product.toString() !== req.params.productId);
    if (user.cart.length === before) {
        throw new AppError('العنصر غير موجود في السلة', 404);
    }
    await user.save();
  // جلب السلة المحدثة مع بيانات المنتجات وحساب المجموع كما في الدوال الأخرى
  const refreshed = await User.findById(user._id).select('cart').populate(cartPopulate);
  const map = new Map(
      (await Product.find({ _id: { $in: refreshed.cart.map((c) => c.product._id) } })).map((x) => [
          x._id.toString(),
          x
      ])
  );
  const { lines, subtotal } = computeCartTotals(refreshed.cart, map);

  res.json({ 
      success: true, 
      message: 'تمت إزالة المنتج من السلة',
      data: { 
          items: lines, 
          subtotal 
      } 
  });
});

/**
 * @route   PATCH /api/cart/items/:productId/decrement
 * @access  Private
 */
exports.decrementCartItem = asyncHandler(async (req, res) => {
    assertObjectId(req.params.productId);
    const user = await User.findById(req.user.id);
    if (!user) {
        throw new AppError('المستخدم غير موجود', 404);
    }
    const idx = user.cart.findIndex((c) => c.product.toString() === req.params.productId);
    if (idx < 0) {
        throw new AppError('العنصر غير موجود في السلة', 404);
    }
    if (user.cart[idx].quantity <= 1) {
        user.cart.splice(idx, 1);
    } else {
        user.cart[idx].quantity -= 1;
    }
    await user.save();

    const refreshed = await User.findById(user._id).select('cart').populate(cartPopulate);
    const map = new Map(
        (await Product.find({ _id: { $in: refreshed.cart.map((c) => c.product._id) } })).map((x) => [
            x._id.toString(),
            x
        ])
    );
    const { lines, subtotal } = computeCartTotals(refreshed.cart, map);

    res.json({ success: true, data: { items: lines, subtotal } });
});