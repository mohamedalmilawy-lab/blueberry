const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const { addCartItemSchema } = require('../validators/cart.validator');
const {
    getCart,
    addCartItem,
    removeCartItem,
    decrementCartItem,
    incrementCartItem
} = require('../controllers/cart.controller');

router.use(auth);

router.get('/', getCart);
router.post('/items', validate(addCartItemSchema), addCartItem);
router.delete('/items/:productId', removeCartItem);
router.patch('/items/:productId/decrement', decrementCartItem);
router.patch('/items/:productId/increment', incrementCartItem);

module.exports = router;