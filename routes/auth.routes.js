const express = require('express');
const router = express.Router();
const validate = require('../middlewares/validate');
const auth = require('../middlewares/auth');

const {
    registerUserSchema,
    loginUserSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
} = require('../validators/user.validator');
const {
    register,
    login,
    forgotPassword,
    resetPassword,
    logout
} = require('../controllers/auth.controller');

router.post('/register', validate(registerUserSchema), register);
router.post('/login', validate(loginUserSchema), login);
router.post('/forgot-password', validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password/:token', validate(resetPasswordSchema), resetPassword);
router.post('/logout', auth, logout);

module.exports = router;
