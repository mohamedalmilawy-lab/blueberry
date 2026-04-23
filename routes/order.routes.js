const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const optionalAuth = require('../middlewares/optionalAuth');
const {createOrder,listOrders,getOrderById,updateOrder} = require('../controllers/order.controller');
const { isValidObjectId } = require('../middlewares/isValidObjectId');
router.param('id', isValidObjectId);

router.post('/', optionalAuth, createOrder);
router.get('/', auth, listOrders);
router.get('/:id', optionalAuth, getOrderById);
router.patch('/:id', optionalAuth, updateOrder);

module.exports = router;
