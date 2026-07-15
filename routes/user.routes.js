const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const optionalAuth = require('../middlewares/optionalAuth');
const validate = require('../middlewares/validate');
const { updateUserByUserSchema,changePasswordSchema } = require('../validators/user.validator');
const { getMe, updateMe,changePassword, getUserNotifications } = require('../controllers/user.controller');

// Apply auth to these routes!
router.get('/me', auth, getMe);
router.patch('/me', auth, validate(updateUserByUserSchema), updateMe);
router.post('/change-password', auth, validate(changePasswordSchema), changePassword);

// Notifications route uses optionalAuth (for logged in users AND guests!)
router.get('/me/notifications', optionalAuth, getUserNotifications);

module.exports = router;