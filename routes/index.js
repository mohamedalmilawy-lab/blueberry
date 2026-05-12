const express = require('express');
const router = express.Router();

router.use('/auth', require('./auth.routes'));
router.use('/users', require('./user.routes'));
router.use('/categories', require('./category.routes'));
router.use('/products', require('./product.routes'));
router.use('/orders', require('./order.routes'));
router.use('/cart', require('./cart.routes'));
router.use('/favorites', require('./favorites.routes'));
router.use('/admin', require('./admin.routes'));
router.use("/chat", require("./chat.routes"));
router.use('/contact', require('./contact.routes'));

module.exports = router;