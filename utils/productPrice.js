/**
 *سعر البيع الفعلي لمنتج ما (العرض عندما يكون نشطاً وغير منتهي الصلاحية).
 */
function getEffectiveUnitPrice(product, selectedSize) {
    if (!product) return 0;
    
    // Step 1: Determine base price (check if selected size exists)
    let basePrice = product.price ?? 0;
    if (selectedSize !== undefined && selectedSize !== null) {
        // Find size in product.sizes
        const sizeOption = (product.sizes || []).find(s => s.size === selectedSize);
        if (sizeOption && sizeOption.price !== undefined && sizeOption.price !== null) {
            basePrice = sizeOption.price;
        }
    }
    
    // Step 2: Apply offer if valid
    const now = Date.now();
    const hasOffer =
        product.offerPrice != null &&
        product.offerPrice >= 0 &&
        (!product.offerEndDate || new Date(product.offerEndDate).getTime() >= now);
    
    if (hasOffer) 
        return product.offerPrice;
    
    return basePrice;
}

module.exports = { getEffectiveUnitPrice };
