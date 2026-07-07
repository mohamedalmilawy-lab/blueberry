const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const { restrictTo } = require('../middlewares/role');
const validate = require('../middlewares/validate');
const validateQuery = require('../middlewares/validateQuery');
const { uploadBanner, uploadCategory, uploadProduct, handleMulterError } = require('../middlewares/upload.middleware');
const parseJsonFields = require('../middlewares/parseJsonFields');

const adminController = require('../controllers/admin.controller');
const categoryController = require('../controllers/category.controller');
const productController = require('../controllers/product.controller');
const adminNotificationController = require('../controllers/adminNotification.controller');
const bannerController = require('../controllers/banner.controller');
const discountController = require('../controllers/discount.controller');

const { createCategorySchema, updateCategorySchema } = require('../validators/category.validator');
const {
    createProductSchema,
    updateProductSchema,
    toggleFeaturedSchema
} = require('../validators/product.validator');
const { createBannerSchema, updateBannerSchema } = require('../validators/banner.validator');
const { createDiscountSchema } = require('../validators/discount.validator');
const { broadcastPushSchema } = require('../validators/push.validator');

const { adminProductsQuery } = require('../validators/query.validator');
const { createStaffUserSchema, listAdminUsersQuerySchema } = require('../validators/staff.validator');
const { updateUserByAdminSchema } = require('../validators/user.validator');

router.use(auth);
router.use(restrictTo('أدمن'));
const { isValidObjectId } = require('../middlewares/isValidObjectId');
router.param('id', isValidObjectId);

router.get('/stats', adminController.getDashboardStats);

//الاشعارات التي تصل الى الادمن حين يتم انشاء طلب جديد
router.get('/order-notifications', adminNotificationController.listAdminNotifications);
router.patch('/order-notifications/:id/read',adminNotificationController.markNotificationRead);

//الاشعارات التي يرسلها الادمن الى الزبائن
router.post('/push/broadcast', validate(broadcastPushSchema), adminController.broadcastPush);

router.get('/banners', bannerController.adminListBanners);
router.get('/banners/:id', bannerController.adminGetBanner);
router.post('/banners', uploadBanner.single('image'), handleMulterError, validate(createBannerSchema), bannerController.adminCreateBanner);
router.patch('/banners/:id', uploadBanner.single('image'), handleMulterError, validate(updateBannerSchema), bannerController.adminUpdateBanner);
router.delete('/banners/:id', bannerController.adminDeleteBanner);

router.get('/users', validateQuery(listAdminUsersQuerySchema), adminController.listUsers);
router.get('/users/:id', adminController.getUserById);
router.post('/users', validate(createStaffUserSchema), adminController.createUser);
router.patch('/users/:id', validate(updateUserByAdminSchema), adminController.updateUser);
router.delete('/users/:id', adminController.deleteUser);

router.get('/categories', categoryController.adminListCategories);
router.get('/categories/:id', categoryController.adminGetCategory);
router.post('/categories', uploadCategory.single('image'), handleMulterError, validate(createCategorySchema), categoryController.adminCreateCategory);
router.patch('/categories/:id', uploadCategory.single('image'), handleMulterError, validate(updateCategorySchema), categoryController.adminUpdateCategory);
router.delete('/categories/:id', categoryController.adminDeleteCategory);

router.get('/products', validateQuery(adminProductsQuery), productController.adminListProducts);
router.get('/products/notes', productController.adminGetAllNotes);   //  ملاحظات الزبائن
router.get('/products/:id', productController.adminGetProduct);
router.post('/products', uploadProduct.array('images', 10), handleMulterError, parseJsonFields(['sizes', 'banner']), validate(createProductSchema), productController.adminCreateProduct);
router.patch('/products/:id', uploadProduct.array('images', 10), handleMulterError, parseJsonFields(['sizes', 'banner', 'imagesToKeep']), validate(updateProductSchema), productController.adminUpdateProduct);
router.patch('/products/:id/featured', validate(toggleFeaturedSchema), productController.adminToggleFeatured);
router.delete('/products/:id', productController.adminDeleteProduct);

router.get('/discounts', discountController.listDiscountCodes);
router.get('/discounts/:id', discountController.getDiscountCode);
router.post('/discounts', validate(createDiscountSchema), discountController.createDiscountCode);
router.delete('/discounts/:id', discountController.deleteDiscountCode);

module.exports = router;