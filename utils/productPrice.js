/**
 *سعر البيع الفعلي لمنتج ما (العرض عندما يكون نشطاً وغير منتهي الصلاحية).
 */
function getEffectiveUnitPrice(product) {
    if (!product) return 0;
    const now = Date.now();
    const hasOffer =
        product.offerPrice != null &&
        product.offerPrice >= 0 &&
        (!product.offerEndDate || new Date(product.offerEndDate).getTime() >= now);
    if (hasOffer) 
        return product.offerPrice;
    return product.price ?? 0;
}

module.exports = { getEffectiveUnitPrice };
