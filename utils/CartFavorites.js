/**
 * حقن حقلي inCart و inFavorites ديناميكياً على منتج واحد.
 * لا يُحفظ في قاعدة البيانات — يُحسب لحظة الاستجابة فقط.
 *
 * @param {object} productDoc - مستند Mongoose أو كائن عادي
 * @param {object|null} user  - req.user (أو null إذا كان الزائر غير مسجل)
 * @returns {object} كائن عادي (plain object) يحتوي على:
 *   - inCart {boolean}   - هل المنتج موجود في السلة؟
 *   - inFavorites {boolean}
 */
function injectCartFavoritesStatus(productDoc, user) {
    // تحويل مستند Mongoose إلى كائن JS عادي قابل للتعديل
    const product = productDoc.toObject ? productDoc.toObject() : { ...productDoc };

    if (!user) {
        product.inCart = false;
        product.inFavorites = false;
        return product;
    }

    const productId = product._id.toString();

    // هل المنتج موجود في السلة؟ (بغض النظر عن الحجم
    product.inCart = (user.cart || []).some(
        (item) => item.product?.toString() === productId
    );

    // favorites هي مصفوفة من ObjectId مباشرةً
    product.inFavorites = (user.favorites || []).some(
        (favId) => favId.toString() === productId
    );

    return product;
}

module.exports = { injectCartFavoritesStatus };
