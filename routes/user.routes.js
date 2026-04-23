const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const { updateUserByUserSchema,changePasswordSchema } = require('../validators/user.validator');
const { getMe, updateMe,changePassword } = require('../controllers/user.controller');

router.use(auth);

router.get('/me', getMe);
router.patch('/me', validate(updateUserByUserSchema), updateMe);
router.post('/change-password', validate(changePasswordSchema), changePassword);

module.exports = router;