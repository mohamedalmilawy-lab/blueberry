const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const Order = require('../models/order.model');
const Product = require('../models/product.model');
const User = require('../models/user.model');
const Discount = require('../models/discount.model');
const AppError = require('../utils/AppError');
const ApiResponse = require('../utils/ApiResponse');
const { getEffectiveUnitPrice } = require('../utils/productPrice');
const { getPaginationFromQuery } = require('../utils/pagination');
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
    { path: 'items.product', select: 'name images price offerPrice offerEndDate isActive sizes' }
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

        const unit = getEffectiveUnitPrice(product, line.size);
        if (Math.abs(unit - line.priceAtOrder) > 1) {
            throw new AppError('أسعار المنتجات غير متطابقة مع المتجر. يرجى تحديث السلة والمحاولة مجدداً.', 400);
        }

        total += unit * line.quantity;
        normalized.push({
            product: product._id,
            quantity: line.quantity,
            priceAtOrder: unit,
            size: line.size
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
 * @access  Public (زائر) | Private (زبون مسجّل — optionalAuth)
 *
 * ── للمستخدمين المسجّلين ──────────────────────────────────────────────────
 *   يُجاهَل أي `items` مُرسَل في الـ body تماماً.
 *   يُجلب الـ cart مباشرةً من قاعدة البيانات لمنع التلاعب بالأسعار.
 *   بعد إنشاء الطلب تُفرَّغ السلة تلقائياً.
 *
 * ── للزوار ───────────────────────────────────────────────────────────────
 *   يجب إرسال: items[], phone, guestDetails.fullName, address, deliveryMethod
 *
 * ── مشترك بين الحالتين ───────────────────────────────────────────────────
 *   الأسعار تُحسب فقط من قاعدة البيانات (getEffectiveUnitPrice).
 *   منطق الخصم (discountCode) — خاص بالمستخدمين المسجّلين فقط.
 */
exports.createOrder = asyncHandler(async (req, res) => {
    const { deliveryMethod, discountCode, note } = req.body;

    // ══════════════════════════════════════════════════════════════════════════
    // 1. التحقق من طريقة الاستلام (مشترك)
    // ══════════════════════════════════════════════════════════════════════════
    const VALID_DELIVERY_METHODS = ['استلام من الفرع', 'توصيل الى المنزل'];
    if (!deliveryMethod || !VALID_DELIVERY_METHODS.includes(deliveryMethod)) {
        return ApiResponse.badRequest(
            res,
            'يجب تحديد طريقة الاستلام: "استلام من الفرع" أو "توصيل الى المنزل"'
        );
    }

    // ══════════════════════════════════════════════════════════════════════════
    // 2. جمع بيانات المصدر (مختلف بين مسجّل وزائر)
    // ══════════════════════════════════════════════════════════════════════════
    let rawItems;           // العناصر الخام قبل التحقق من الأسعار
    let resolvedPhone;      // رقم الهاتف النهائي
    let resolvedAddress;    // عنوان التوصيل النهائي (null = استلام من الفرع)
    let orderOwnerField;    // { user: id } أو { guestDetails: {...} }
    let userDoc = null;     // وثيقة المستخدم — محتاجها لاحقاً لتفريغ السلة

    if (req.user) {
        // ── مسار المستخدم المسجّل ─────────────────────────────────────────

        // جلب المستخدم مع السلة والعناوين والهاتف
        userDoc = await User.findById(req.user.id).select('cart phone addresses');
        if (!userDoc) throw new AppError('المستخدم غير موجود', 404);

        // التحقق من أن السلة غير فارغة
        if (!userDoc.cart || userDoc.cart.length === 0) {
            return ApiResponse.badRequest(res, 'سلة المشتريات فارغة، أضف منتجات قبل إتمام الطلب');
        }

        // استخراج العناصر من قاعدة البيانات — يُتجاهل body.items كلياً
        rawItems = userDoc.cart.map((line) => ({
            product: line.product.toString(),
            quantity: line.quantity,
            size:     line.size
        }));

        // حل رقم الهاتف: من الـ body أولاً ثم من الملف الشخصي
        resolvedPhone = (req.body.phone && String(req.body.phone).trim()) || userDoc.phone;
        if (!resolvedPhone) {
            return ApiResponse.badRequest(res, 'رقم الهاتف مطلوب لإتمام الطلب');
        }

        // حل العنوان
        if (deliveryMethod === 'توصيل الى المنزل') {
            const rawAddressInput = req.body.address;
            const savedAddressIdRaw =
                req.body.addressId !== undefined && req.body.addressId !== null
                    ? String(req.body.addressId).trim()
                    : '';

            const fromBody    = pickAddressFromBody(req.body);
            const fromSaved   = savedAddressIdRaw
                ? shippingFromSavedAddressId(userDoc, savedAddressIdRaw)
                : null;
            const fromProfile = firstSavedAddressAsShipping(userDoc);

            // التحقق من صحة addressId إن أُرسل
            if (savedAddressIdRaw && !fromSaved) {
                return ApiResponse.badRequest(res, 'معرف العنوان المحفوظ غير صالح أو غير موجود');
            }

            resolvedAddress = fromBody || fromSaved || fromProfile;
            if (!resolvedAddress) {
                return ApiResponse.badRequest(
                    res,
                    'يرجى تقديم عنوان التوصيل، أو اختيار عنوان محفوظ (addressId)، أو إضافة عناوين من إعدادات الحساب'
                );
            }

            // حفظ عنوان جديد في الملف الشخصي للمستخدم إن كان { label, street }
            if (fromBody && rawAddressInput && typeof rawAddressInput === 'object' && !Array.isArray(rawAddressInput)) {
                const label = typeof rawAddressInput.label === 'string' ? rawAddressInput.label.trim() : '';
                const street = typeof rawAddressInput.street === 'string' ? rawAddressInput.street.trim() : '';
                if (label && street) {
                    if (!userDoc.addresses) userDoc.addresses = [];
                    const idx = userDoc.addresses.findIndex((a) => a.label === label);
                    if (idx >= 0) userDoc.addresses[idx] = { label, street };
                    else userDoc.addresses.push({ label, street });
                }
            }
        }
        // استلام من الفرع → لا يحتاج عنوان

        orderOwnerField = { user: req.user.id };

    } else {
        // ── مسار الزائر ──────────────────────────────────────────────────────

        // التحقق من وجود عناصر في الـ body
        if (!req.body.items || !Array.isArray(req.body.items) || req.body.items.length === 0) {
            return ApiResponse.badRequest(res, 'يجب إرسال قائمة المنتجات (items) لإتمام الطلب');
        }
        rawItems = req.body.items;

        // التحقق من الهاتف
        resolvedPhone = req.body.phone && String(req.body.phone).trim();
        if (!resolvedPhone) {
            return ApiResponse.badRequest(res, 'رقم الهاتف مطلوب لإتمام الطلب');
        }

        // التحقق من بيانات الزائر
        const guestName =
            req.body.guestDetails?.fullName?.trim() ||
            req.body.guestName?.trim();
        if (!guestName) {
            return ApiResponse.badRequest(res, 'يجب إرسال اسم الزائر (guestDetails.fullName)');
        }

        // التحقق من العنوان للتوصيل للمنزل
        if (deliveryMethod === 'توصيل الى المنزل') {
            if (!req.body.address) {
                return ApiResponse.badRequest(res, 'يرجى تزويدنا بعنوان التوصيل');
            }
            const rawGuestAddress = req.body.address;
            if (typeof rawGuestAddress === 'string') {
                const street = rawGuestAddress.trim();
                if (!street) return ApiResponse.badRequest(res, 'يرجى تزويدنا بعنوان التوصيل');
                resolvedAddress = labeledAddressToShipping({ label: 'عنوان التوصيل', street });
            } else if (typeof rawGuestAddress === 'object') {
                resolvedAddress = labeledAddressToShipping(rawGuestAddress);
            }
            if (!resolvedAddress) {
                return ApiResponse.badRequest(res, 'يرجى تزويدنا بعنوان توصيل صالح');
            }
        }

        orderOwnerField = { guestDetails: { fullName: guestName } };
    }

    // ══════════════════════════════════════════════════════════════════════════
    // 3. حساب الأسعار من قاعدة البيانات (مشترك — يمنع التلاعب من العميل)
    // ══════════════════════════════════════════════════════════════════════════
    const productIds  = rawItems.map((line) => line.product);
    const products    = await Product.find({ _id: { $in: productIds } });
    const productsMap = new Map(products.map((p) => [p._id.toString(), p]));

    let computedTotal   = 0;
    const normalizedItems = [];

    for (const line of rawItems) {
        const product = productsMap.get(line.product.toString());

        // التحقق من أن المنتج موجود ومفعّل
        if (!product || !product.isActive) {
            return ApiResponse.badRequest(
                res,
                'أحد المنتجات غير متوفر أو غير مفعّل، يرجى مراجعة الطلب والمحاولة مجدداً'
            );
        }

        // السعر الفعلي من قاعدة البيانات — يتجاهل أي سعر مُرسَل من العميل
        const unitPrice  = getEffectiveUnitPrice(product, line.size);
        computedTotal   += unitPrice * line.quantity;

        normalizedItems.push({
            product:      product._id,
            quantity:     line.quantity,
            priceAtOrder: unitPrice,
            size:         line.size
        });
    }

    computedTotal = Math.round(computedTotal * 100) / 100;

    // ══════════════════════════════════════════════════════════════════════════
    // 4. معالجة كود الخصم (خاص بالمستخدمين المسجّلين فقط)
    // ══════════════════════════════════════════════════════════════════════════
    let discountCodeId  = null;
    let discountPct     = 0;
    let finalPrice      = computedTotal;
    let discountDoc     = null;

    if (discountCode) {
        // كود الخصم يتطلب تسجيل الدخول
        if (!req.user) {
            throw new AppError('يجب تسجيل الدخول لاستخدام كود الخصم', 401);
        }

        // 1. البحث عن الكود
        discountDoc = await Discount.findOne({ code: discountCode.trim().toUpperCase() });
        if (!discountDoc) throw new AppError('كود الخصم غير موجود', 404);

        // 2. هل الكود فعّال؟
        if (!discountDoc.isActive) throw new AppError('كود الخصم غير فعال', 400);

        // 3. هل الكود مخصص لهذا المستخدم؟
        if (discountDoc.assignedUser.toString() !== req.user.id) {
            throw new AppError('هذا الكود لا ينتمي إليك', 403);
        }

        // 4. هل تم تجاوز حد الاستخدام؟
        if (discountDoc.currentUsageCount >= discountDoc.maxUsageLimit) {
            throw new AppError('تم تجاوز حد الاستخدام لهذا الكود', 400);
        }

        // 5. تطبيق الخصم
        discountPct    = discountDoc.discountPercentage;
        finalPrice     = Math.round(computedTotal * (1 - discountPct / 100) * 100) / 100;
        discountCodeId = discountDoc._id;
    }

    // ══════════════════════════════════════════════════════════════════════════
    // 5. إنشاء الطلب
    // ══════════════════════════════════════════════════════════════════════════
    const order = await Order.create({
        ...orderOwnerField,
        items:              normalizedItems,
        totalPrice:         computedTotal,
        discountCode:       discountCodeId,
        discountPercentage: discountPct,
        finalPrice,
        deliveryMethod,
        phone:              resolvedPhone,
        payment:            { method: 'الدفع عند التسليم' },
        status:             'تم الطلب',
        ...(resolvedAddress && { addresses: [resolvedAddress] }),
        ...(note            && { note: String(note).trim() })
    });

    // ══════════════════════════════════════════════════════════════════════════
    // 6. تحديثات ما بعد الإنشاء
    // ══════════════════════════════════════════════════════════════════════════

    // زيادة عداد استخدام كود الخصم (بعد نجاح إنشاء الطلب)
    if (discountDoc) {
        await Discount.updateOne(
            { _id: discountDoc._id },
            { $inc: { currentUsageCount: 1 } }
        );
    }

    // تفريغ سلة المستخدم المسجّل وتحديث هاتفه إن تغيّر
    if (userDoc) {
        userDoc.cart = [];
        const newPhone = req.body.phone && String(req.body.phone).trim();
        if (newPhone && newPhone !== userDoc.phone) userDoc.phone = newPhone;
        await userDoc.save();
    }

    // إشعار الأدمن (best-effort — لا يُوقف الطلب عند الفشل)
    try {
        await notifyAdminNewOrder(order);
    } catch (err) {
        console.error('createOrder → notifyAdminNewOrder failed:', err);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // 7. إرجاع الطلب المُنشأ مع populate
    // ══════════════════════════════════════════════════════════════════════════
    const populated = await Order.findById(order._id).populate(orderPopulate);
    return ApiResponse.created(res, 'تم إنشاء الطلب بنجاح', populated);
});

/**
 * @route   GET /api/orders
 * @access  Private(زبون, موظف توصيل)
 */
exports.listOrders = asyncHandler(async (req, res) => {
    const { role, id: uid } = req.user;
    const { tab = 'current', page, limit } = req.query;
    const { page: currentPage, limit: currentLimit, skip } = getPaginationFromQuery(req.query);
    
    const filter = {};

    if (role === 'زبون') {
        filter.user = uid;
    } else if (role === 'موظف توصيل') {
        filter.driver = uid;

        // Apply tab filtering for delivery staff
        if (tab === 'current') {
            filter.status = { $nin: ['تم التوصيل', 'ملغى'] };
        } else if (tab === 'past') {
            filter.status = 'تم التوصيل';
        } else if (tab === 'cancelled') {
            filter.status = 'ملغى';
        }
    }

    // Get orders with pagination
    const [orders, totalCount] = await Promise.all([
        Order.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(currentLimit)
            .populate(orderPopulate),
        Order.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(totalCount / currentLimit);

    return ApiResponse.ok(res, 'تم جلب الطلبات بنجاح', {
        items: orders,
        meta: {
            page: currentPage,
            limit: currentLimit,
            total: totalCount,
            pages: totalPages
        }
    });
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
    return ApiResponse.ok(res, 'تم جلب الطلب بنجاح', order);
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
            return ApiResponse.badRequest(res, 'فشل التحقق من صحة البيانات', joiToErrors(error));
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
        return ApiResponse.ok(res, 'تم تحديث الطلب بنجاح', populated);
    }

    if (role === 'مشرف') {
        const { error, value } = updateOrderBySupervisorSchema.validate(req.body, {
            abortEarly: false,
            stripUnknown: true
        });
        if (error) {
            return ApiResponse.badRequest(res, 'فشل التحقق من صحة البيانات', joiToErrors(error));
        }
        order.status = value.status;
        await order.save();
        const populated = await Order.findById(order._id).populate(orderPopulate);
        return ApiResponse.ok(res, 'تم تحديث الطلب بنجاح', populated);
    }

    if (role === 'موظف توصيل') {
        if (!order.driver || order.driver.toString() !== uid) {
            throw new AppError('هذا الطلب غير مخصص لك', 403);
        }

        const { error, value } = updateOrderByDriverSchema.validate(req.body, {
            abortEarly: false,
            stripUnknown: true
        });
        if (error) {
            return ApiResponse.badRequest(res, 'فشل التحقق من صحة البيانات', joiToErrors(error));
        }

        if (value.status === 'تم التوصيل' && order.payment.method === 'الدفع عند التسليم') {
            // If payment status is provided, use it; default to 'تم الدفع' if not
            order.payment.status = value.payment?.status || 'تم الدفع';
        } else if (value.payment?.status) {
            // If delivery driver wants to update payment status for other cases
            order.payment.status = value.payment.status;
        }

        order.status = value.status;
        await order.save();
        const populated = await Order.findById(order._id).populate(orderPopulate);
        return ApiResponse.ok(res, 'تم تحديث الطلب بنجاح', populated);
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
                return ApiResponse.badRequest(res, 'فشل التحقق من صحة البيانات', joiToErrors(error));
            }
            if (value.items) {
                const { items, totalPrice } = await normalizeOrderItems(value.items);
                order.items = items;
                order.totalPrice = totalPrice;

                // 🛡️ الأمان المالي عند تعديل المنتجات:
                if (order.discountCode) {
                    // بما أن الخصم من الأدمن "على كيفه" وليس بناءً على قيمة الطلب، 
                    // فنحن نكتفي فقط بالتأكد من أن الأدمن لم يقم بـ "إيقاف" الكوبون (isActive) في هذه الأثناء.
                    const currentDiscount = await Discount.findById(order.discountCode);

                    if (!currentDiscount || !currentDiscount.isActive) {
                        // لو الأدمن ألغى تفعيل الكوبون تماماً، يتم إلغاء الخصم من الطلب المعدل
                        order.discountPercentage = 0; 
                        order.finalPrice = totalPrice;
                    } else {
                        // إذا كان الكوبون ما زال فعالاً، نطبق نفس النسبة المئوية على المجموع الجديد
                        order.discountPercentage = currentDiscount.discountPercentage;
                        const calculatedFinal = totalPrice * (1 - (order.discountPercentage / 100));
                        order.finalPrice = Math.round(calculatedFinal * 100) / 100; // تقريب الفلس
                    }
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
            return ApiResponse.ok(res, 'تم تحديث الطلب بنجاح', populated);
        }

        if (order.status === 'قيد التحضير' || order.status === 'تم التحضير') {
            const { error, value } = updateOrderByUserPreparingSchema.validate(bodyForJoi, {
                abortEarly: false,
                stripUnknown: true
            });
            if (error) {
                return ApiResponse.badRequest(res, 'فشل التحقق من صحة البيانات', joiToErrors(error));
            }
            if (value.addresses) {
                order.addresses = value.addresses;
            }
            if (value.phone) order.phone = value.phone;
            if (value.note !== undefined) order.note = value.note;
            await order.save();
            const populated = await Order.findById(order._id).populate(orderPopulate);
            return ApiResponse.ok(res, 'تم تحديث الطلب بنجاح', populated);
        }

        throw new AppError('لا يمكن تعديل الطلب في هذه المرحلة', 400);
    }

    throw new AppError('لا يمكنك تعديل هذا الطلب', 403);
});
