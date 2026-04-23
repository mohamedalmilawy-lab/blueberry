const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const { restrictTo } = require('../middlewares/role');
const validate = require('../middlewares/validate');
const validateQuery = require('../middlewares/validateQuery');

const adminController = require('../controllers/admin.controller');
const categoryController = require('../controllers/category.controller');
const productController = require('../controllers/product.controller');

const { createCategorySchema, updateCategorySchema } = require('../validators/category.validator');
const {
    createProductSchema,
    updateProductSchema,
    toggleFeaturedSchema
} = require('../validators/product.validator');

const { adminProductsQuery } = require('../validators/query.validator');
const { createStaffUserSchema, listAdminUsersQuerySchema } = require('../validators/staff.validator');
const { updateUserByAdminSchema } = require('../validators/user.validator');

router.use(auth);
router.use(restrictTo('أدمن'));
const { isValidObjectId } = require('../middlewares/isValidObjectId');
router.param('id', isValidObjectId);

router.get('/stats', adminController.getDashboardStats);

router.get('/users', validateQuery(listAdminUsersQuerySchema), adminController.listUsers);
router.get('/users/:id', adminController.getUserById);
router.post('/users', validate(createStaffUserSchema), adminController.createUser);
router.patch('/users/:id', validate(updateUserByAdminSchema), adminController.updateUser);
router.delete('/users/:id', adminController.deleteUser);

router.get('/categories', categoryController.adminListCategories);
router.get('/categories/:id', categoryController.adminGetCategory);
router.post('/categories', validate(createCategorySchema), categoryController.adminCreateCategory);
router.patch('/categories/:id', validate(updateCategorySchema), categoryController.adminUpdateCategory);
router.delete('/categories/:id', categoryController.adminDeleteCategory);

router.get('/products', validateQuery(adminProductsQuery), productController.adminListProducts);
router.get('/products/:id', productController.adminGetProduct);
router.post('/products', validate(createProductSchema), productController.adminCreateProduct);
router.patch('/products/:id', validate(updateProductSchema), productController.adminUpdateProduct);
router.patch('/products/:id/featured', validate(toggleFeaturedSchema), productController.adminToggleFeatured);
router.delete('/products/:id', productController.adminDeleteProduct);

module.exports = router;