const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const Order = require('../models/order.model');
const Product = require('../models/product.model');
const User = require('../models/user.model');
const Discount = require('../models/discount.model');
const AppError = require('../utils/AppError');
const { getEffectiveUnitPrice } = require('../utils/productPrice');
const {
    createOrderSchema,
    updateOrderByUserPlacedSchema,
    updateOrderByUserPreparingSchema,
    updateOrderByAdminSchema,
    updateOrderByDriverSchema,
    updateOrderBySupervisorSchema
} = require('../validators/order.validator');
const { guestOrderVerifySchema } = require('../validators/staff.validator');
const { notifyAdminNewOrder } = require('../services/adminOrderNotification.service');

const orderPopulate = [
    { path: 'user', select: 'fullName email phone' },
    { path: 'driver', select: 'fullName phone role' },
    { path: 'items.product', select: 'name images price offerPrice offerEndDate isActive' }
];

function joiToErrors(error) {
    return error.details.map((d) => ({
        field: d.path.join('.'),
        message: d.message.replace(/['"]/g, '')
    }));
}

function labeledAddressToShipping(obj) {
    if (!obj || typeof obj !== 'object') return null;
    const label = typeof obj.label === 'string' ? obj.label.trim() : '';
    const street = typeof obj.street === 'string' ? obj.street.trim() : '';
    if (!label || !street) return null;
    return { label, street };
}

function firstSavedAddressAsShipping(user) {
    const first = user?.addresses?.[0];
    return labeledAddressToShipping(first);
}

/** يختار عنواناً محفوظاً من الملف عبر `_id` الفرعي لعنصر في `addresses` */
function shippingFromSavedAddressId(user, addressId) {
    if (!addressId || !mongoose.Types.ObjectId.isValid(String(addressId))) {
        return null;
    }
    const sub = user.addresses?.id?.(addressId);
    if (!sub) return null;
    return labeledAddressToShipping({ label: sub.label, street: sub.street });
}

/** يحلّ عنوان التوصيل من `req.body.address` (نص أو `{ label, street }`). */
function pickAddressFromBody(body) {
    const { address } = body;
    if (address === undefined || address === null) return null;
    if (typeof address === 'string') {
        const street = address.trim();
        if (!street) return null;
        return labeledAddressToShipping({ label: 'عنوان التوصيل', street });
    }
    if (typeof address === 'object' && !Array.isArray(address)) {
        return labeledAddressToShipping(address);
    }
    return null;
}

async function normalizeOrderItems(itemsInput) {
    let total = 0;
    const normalized = [];
    
    // جلب جميع المنتجات دفعة واحدة
    const productIds = itemsInput.map(item => item.product);
    const products = await Product.find({ _id: { $in: productIds } });
    
    // إنشاء Map لسهولة الوصول
    const productsMap = new Map(products.map(p => [p._id.toString(), p]));

    for (const line of itemsInput) {
        const product = productsMap.get(line.product.toString());
        
        if (!product || !product.isActive) {
            throw new AppError('أحد المنتجات غير متوفر أو غير مفعّل', 400);
        }
        
        const unit = getEffectiveUnitPrice(product);
        if (Math.abs(unit - line.priceAtOrder) > 1) {
            throw new AppError('أسعار المنتجات غير متطابقة مع المتجر. يرجى تحديث السلة والمحاولة مجدداً.', 400);
        }
        
        total += unit * line.quantity;
        normalized.push({
            product: product._id,
            quantity: line.quantity,
            priceAtOrder: unit
        });
    }
    return { items: normalized, totalPrice: total };
}

function toPlainDoc(sub) {
    if (!sub) return {};
    return typeof sub.toObject === 'function' ? sub.toObject() : { ...sub };
}

function assertCanViewOrder(order, req) {
    const role = req.user?.role;
    const uid = req.user?.id;

    if (role === 'أدمن' || role === 'مشرف') {
        return;
    }
    if (role === 'موظف توصيل') {
        if (order.driver && order.driver.id.toString() === uid) {
            return; // مسموح له فقط إذا كان هو السائق المسؤول عن هذا الطلب
        }
        throw new AppError('لا يمكنك عرض هذا الطلب', 403);
    }
    if (order.user) {
        if (!req.user) {
            throw new AppError('يجب تسجيل الدخول لعرض هذا الطلب', 401);
        }
        if (role === 'زبون' && order.user.id.toString() === uid) {
            return; // مسموح له إذا كان هو صاحب الطلب
        }
        throw new AppError('لا يمكنك عرض هذا الطلب', 403);
    }
    const phone = req.query.phone;
    if (phone && phone === order.phone) {
        return;
    }
    throw new AppError('يجب إرسال رقم الهاتف المطابق للطلب (?phone=)', 403);
}

function assertGuestVerification(order, body) {
    const { error, value } = guestOrderVerifySchema.validate(body, { abortEarly: false });
    if (error) {
        throw new AppError('تحقق من رقم الهاتف مطلوب لطلبات الزوار', 400);
    }
    if (value.verifyPhone !== order.phone) {
        throw new AppError('رقم التحقق غير مطابق لهذا الطلب', 403);
    }
}

/**
 * @route   POST /api/orders
 * @access  Public (زائر) أو خاص (زبون مسجّل)
 */
exports.createOrder = asyncHandler(async (req, res) => {
    let payload = { ...req.body };
    const rawAddressInput = req.body.address;
    const savedAddressIdRaw =
        req.body.addressId !== undefined && req.body.addressId !== null
            ? String(req.body.addressId).trim()
            : '';

    if (req.user) {
        const user = await User.findById(req.user.id).select('phone addresses');
        delete payload.guestDetails;
        payload.user = req.user.id;
        if (!payload.phone && user?.phone) {
            payload.phone = user.phone;
        }

        const fromBody = pickAddressFromBody(payload);
        let fromSaved = null;
        if (savedAddressIdRaw) {
            fromSaved = shippingFromSavedAddressId(user, savedAddressIdRaw);
            if (!fromSaved) {
                throw new AppError('معرف العنوان المحفوظ غير صالح أو غير موجود.', 400);
            }
        }
        const fromProfile = firstSavedAddressAsShipping(user);
        const resolved = fromBody || fromSaved || fromProfile;
        if (!resolved) {
            throw new AppError(
                'يرجى تقديم عنوان التوصيل، أو اختيار عنوان محفوظ (addressId)، أو إضافة عناوين من إعدادات الحساب.',
                400
            );
        }

        // عنوان جديد في الطلب: إن وُجد { label, street } نحدّث قائمة العناوين المحفوظة (بدون حقل address القديم)
        if (fromBody) {
            if (rawAddressInput && typeof rawAddressInput === 'object' && !Array.isArray(rawAddressInput)) {
                const label =
                    typeof rawAddressInput.label === 'string' ? rawAddressInput.label.trim() : '';
                const street =
                    typeof rawAddressInput.street === 'string' ? rawAddressInput.street.trim() : '';
                if (label && street) {
                    if (!user.addresses) user.addresses = [];
                    const idx = user.addresses.findIndex((a) => a.label === label);
                    const entry = { label, street };
                    if (idx >= 0) user.addresses[idx] = entry;
                    else user.addresses.push(entry);
                }
            }
            if (payload.phone) user.phone = payload.phone;

            await user.save();
        } else if (payload.phone && String(payload.phone) !== String(user.phone)) {
            user.phone = payload.phone;
            await user.save();
        }

        payload.addresses = [resolved];
    } else {
        delete payload.user;

        const rawGuestAddress = req.body.address;
        if (rawGuestAddress === undefined || rawGuestAddress === null) {
            throw new AppError('يرجى تزويدنا بعنوان التوصيل.', 400);
        }
        let guestResolved = null;
        if (typeof rawGuestAddress === 'string') {
            const street = rawGuestAddress.trim();
            if (street) {
                guestResolved = labeledAddressToShipping({ label: 'عنوان التوصيل', street });
            }
        } else if (typeof rawGuestAddress === 'object') {
            guestResolved = labeledAddressToShipping(rawGuestAddress);
        }
        if (!guestResolved) {
            throw new AppError('يرجى تزويدنا بعنوان التوصيل.', 400);
        }
        payload.addresses = [guestResolved];
    }

    delete payload.address;
    delete payload.addressId;

    const { error, value } = createOrderSchema.validate(payload, {
        abortEarly: false,
        stripUnknown: true
    });
    if (error) {
        return res.status(400).json({ errors: joiToErrors(error) });
    }
    
    const { items, totalPrice } = await normalizeOrderItems(value.items);

    // ─── معالجة كود الخصم إن وُجد ───
    let discountCodeId = null;
    let discountPct = 0;
    let finalPrice = totalPrice;
    let discountDoc = null; // أضفنا هذا المتغير للاحتفاظ ببيانات الخصم لتحديثه لاحقاً

    if (value.discountCode) {
        // 1. البحث عن الكود
        discountDoc = await Discount.findOne({ code: value.discountCode.toUpperCase() });
        if (!discountDoc) {
            throw new AppError('كود الخصم غير موجود', 404);
        }

        // 2. هل الكود فعّال؟
        if (!discountDoc.isActive) {
            throw new AppError('كود الخصم غير فعال', 400);
        }

        // 3. هل الكود مخصص لهذا المستخدم؟ (يجب أن يكون مسجّل دخول)
        if (!req.user) {
            throw new AppError('يجب تسجيل الدخول لاستخدام كود الخصم', 401);
        }
        if (discountDoc.assignedUser.toString() !== req.user.id) {
            throw new AppError('هذا الكود لا ينتمي إليك', 403);
        }

        // 4. هل تم تجاوز حد الاستخدام؟
        if (discountDoc.currentUsageCount >= discountDoc.maxUsageLimit) {
            throw new AppError('تم تجاوز حد الاستخدام لهذا الكود', 400);
        }

        // 5. حساب السعر النهائي بعد الخصم
        discountPct = discountDoc.discountPercentage;
        finalPrice = totalPrice * (1 - (discountPct / 100));
        finalPrice = Math.round(finalPrice * 100) / 100; // تقريب لأقرب فلس
        discountCodeId = discountDoc._id;
    }

    // حذف discountCode من payload لأنه ليس حقلاً نصياً في الـ Schema
    delete value.discountCode;

    const order = await Order.create({
        ...value,
        items,
        totalPrice,
        discountCode: discountCodeId,
        discountPercentage: discountPct,
        finalPrice
    });

    // ✅ زيادة عداد الاستخدام بعد التأكد من نجاح إنشاء الطلب
    if (discountDoc) {
        await Discount.updateOne(
            { _id: discountDoc._id },
            { $inc: { currentUsageCount: 1 } }
        );
    }

    try {
        await notifyAdminNewOrder(order);
    } catch (err) {
        console.error('notifyAdminNewOrder failed', err);
    }

    const populated = await Order.findById(order._id).populate(orderPopulate);
    res.status(201).json({ success: true, data: populated });
});

/**
 * @route   GET /api/orders
 * @access  Private(زبون, موظف توصيل)
 */
exports.listOrders = asyncHandler(async (req, res) => {
    const role = req.user.role;
    const filter = {};
    if (role === 'زبون') {
        filter.user = req.user.id;
    } else if (role === 'موظف توصيل') {
        filter.driver = req.user.id;
    }

    const orders = await Order.find(filter).sort({ createdAt: -1 }).populate(orderPopulate);
    res.json({ success: true, data: orders });
});

/**
 * @route   GET /api/orders/:id
 * @access  Public للزائر (مع ?phone=) أو خاص
 */
exports.getOrderById = asyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id).populate(orderPopulate);
    if (!order) {
        throw new AppError('الطلب غير موجود', 404);
    }
    assertCanViewOrder(order, req);
    res.json({ success: true, data: order });
});

/**
 * @route   PATCH /api/orders/:id
 * @access  حسب الدور / تحقق الزائر بالهاتف
 */
exports.updateOrder = asyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id);
    if (!order) {
        throw new AppError('الطلب غير موجود', 404);
    }

    const role = req.user?.role;
    const uid = req.user?.id;

    if (role === 'أدمن') {
        const { error, value } = updateOrderByAdminSchema.validate(req.body, {
            abortEarly: false,
            stripUnknown: true
        });
        if (error) {
            return res.status(400).json({ errors: joiToErrors(error) });
        }
        if (value.user !== undefined) order.user = value.user;
        if (value.guestDetails !== undefined) order.guestDetails = value.guestDetails;
        if (value.addresses) {
            order.addresses = value.addresses;
        }
        if (value.phone !== undefined) order.phone = value.phone;
        if (value.status !== undefined) order.status = value.status;
        if (value.payment) {
            order.payment = { ...toPlainDoc(order.payment), ...value.payment };
        }
        if (value.driver !== undefined) order.driver = value.driver;
        if (value.note !== undefined) order.note = value.note;
        if (value.items) {
            const { items, totalPrice } = await normalizeOrderItems(value.items);
            order.items = items;
            order.totalPrice = totalPrice;
            // يجب إعادة حساب السعر النهائي إذا كان هناك خصم مطبق مسبقاً
            if (order.discountPercentage) {
                const calculatedFinal = totalPrice * (1 - (order.discountPercentage / 100));
                order.finalPrice = Math.round(calculatedFinal * 100) / 100;
            } else {
                order.finalPrice = totalPrice;
            }
        }
        else if (value.totalPrice !== undefined) {
            order.finalPrice = value.totalPrice;
            order.totalPrice = value.totalPrice;
        }
        await order.save();
        const populated = await Order.findById(order._id).populate(orderPopulate);
        return res.json({ success: true, data: populated });
    }

    if (role === 'مشرف') {
        const { error, value } = updateOrderBySupervisorSchema.validate(req.body, {
            abortEarly: false,
            stripUnknown: true
        });
        if (error) {
            return res.status(400).json({ errors: joiToErrors(error) });
        }
        order.status = value.status;
        await order.save();
        const populated = await Order.findById(order._id).populate(orderPopulate);
        return res.json({ success: true, data: populated });
    }

    if (role === 'موظف توصيل') {
        if (!order.driver || order.driver.toString() !== uid) {
            throw new AppError('هذا الطلب غير مخصص لك', 403);
        }
        const allowedFrom = ['تم التحضير', 'قيد التوصيل'];
        if (!allowedFrom.includes(order.status)) {
            throw new AppError('لا يمكن تحديث حالة هذا الطلب في وضعه الحالي', 400);
        }

        const { error, value } = updateOrderByDriverSchema.validate(req.body, {
            abortEarly: false,
            stripUnknown: true
        });
        if (error) {
            return res.status(400).json({ errors: joiToErrors(error) });
        }

        if (value.status === 'تم التوصيل' && order.payment.method === 'الدفع عند التسليم') {
            const ps = value.payment?.status;
            if (!ps) {
                throw new AppError('يجب تحديد حالة الدفع عند التسليم عند إتمام التوصيل', 400);
            }
            order.payment.status = ps;
        }

        order.status = value.status;
        await order.save();
        const populated = await Order.findById(order._id).populate(orderPopulate);
        return res.json({ success: true, data: populated });
    }

    const isOwnerCustomer = role === 'زبون' && order.user && order.user.toString() === uid;
    const isGuestOrder = !order.user;

    if (isOwnerCustomer || isGuestOrder) {
        if (isGuestOrder) {
            assertGuestVerification(order, req.body);
        }

        const bodyForJoi = { ...req.body };
        delete bodyForJoi.verifyPhone;

        if (order.status === 'تم الطلب') {
            const { error, value } = updateOrderByUserPlacedSchema.validate(bodyForJoi, {
                abortEarly: false,
                stripUnknown: true
            });
            if (error) {
                return res.status(400).json({ errors: joiToErrors(error) });
            }
            if (value.items) {
                const { items, totalPrice } = await normalizeOrderItems(value.items);
                order.items = items;
                order.totalPrice = totalPrice;
                
                // إعادة حساب السعر النهائي للزبون أيضاً
                if (order.discountPercentage) {
                    const calculatedFinal = totalPrice * (1 - (order.discountPercentage / 100));
                    order.finalPrice = Math.round(calculatedFinal * 100) / 100;
                } else {
                    order.finalPrice = totalPrice;
                }
            }
            if (value.addresses) {
                order.addresses = value.addresses;
            }
            if (value.phone) order.phone = value.phone;
            if (value.note !== undefined) order.note = value.note;
            await order.save();
            const populated = await Order.findById(order._id).populate(orderPopulate);
            return res.json({ success: true, data: populated });
        }

        if (order.status === 'قيد التحضير' || order.status === 'تم التحضير') {
            const { error, value } = updateOrderByUserPreparingSchema.validate(bodyForJoi, {
                abortEarly: false,
                stripUnknown: true
            });
            if (error) {
                return res.status(400).json({ errors: joiToErrors(error) });
            }
            if (value.addresses) {
                order.addresses = value.addresses;
            }
            if (value.phone) order.phone = value.phone;
            if (value.note !== undefined) order.note = value.note;
            await order.save();
            const populated = await Order.findById(order._id).populate(orderPopulate);
            return res.json({ success: true, data: populated });
        }

        throw new AppError('لا يمكن تعديل الطلب في هذه المرحلة', 400);
    }

    throw new AppError('لا يمكنك تعديل هذا الطلب', 403);
});
