/**
 * utils/productPrice.js
 * ─────────────────────────────────────────────────────────────────────────────
 * حساب سعر البيع الفعلي لمنتج.
 *
 * offerPrice الآن يُمثّل نسبة خصم مئوية (مثال: 20 = خصم 20%).
 * يُطبَّق الخصم على السعر الأساسي للمنتج (أو سعر المقاس المطلوب إن وُجد).
 * إذا انتهت صلاحية العرض (offerEndDate) يُعاد السعر الأساسي بدون خصم.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * يحسب السعر الفعلي لوحدة واحدة من المنتج مع مراعاة:
 *   1. المقاس المطلوب (selectedSize) → يستخدم سعر المقاس إن وُجد.
 *   2. نسبة الخصم (offerPrice) إن كانت نشطة وغير منتهية الصلاحية.
 *
 * @param {object}         product      - وثيقة المنتج من قاعدة البيانات
 * @param {number|null}    selectedSize - المقاس المطلوب (1 | 2 | 3 | null)
 * @returns {number} السعر الفعلي مقرَّباً لأقرب فلسَين
 */
function getEffectiveUnitPrice(product, selectedSize) {
    if (!product) return 0;

    // ── 1. تحديد السعر الأساسي (مع مراعاة المقاس) ────────────────────────────
    let basePrice = product.price ?? 0;

    if (selectedSize !== undefined && selectedSize !== null) {
        const sizeOption = (product.sizes || []).find((s) => s.size === selectedSize);
        if (sizeOption?.price != null) {
            basePrice = sizeOption.price;
        }
    }

    // ── 2. التحقق من صلاحية نسبة الخصم ──────────────────────────────────────
    //  offerPrice = نسبة مئوية بين 0 و 100
    const now = Date.now();
    const discountPct = product.offerPrice;

    const isOfferActive =
        discountPct != null &&
        discountPct > 0 &&
        discountPct <= 100 &&
        (!product.offerEndDate || new Date(product.offerEndDate).getTime() >= now);

    // ── 3. حساب السعر النهائي ─────────────────────────────────────────────────
    if (isOfferActive) {
        const discounted = basePrice * (1 - discountPct / 100);
        return Math.round(discounted * 100) / 100;
    }

    return Math.round(basePrice * 100) / 100;
}

/**
 * يتحقق هل يوجد عرض نشط على المنتج الآن.
 * مفيد لعرض شارة "عرض" على الواجهة.
 *
 * @param {object} product
 * @returns {boolean}
 */
function isOfferActive(product) {
    if (!product) return false;
    const now = Date.now();
    return (
        product.offerPrice != null &&
        product.offerPrice > 0 &&
        product.offerPrice <= 100 &&
        (!product.offerEndDate || new Date(product.offerEndDate).getTime() >= now)
    );
}

module.exports = { getEffectiveUnitPrice, isOfferActive };
