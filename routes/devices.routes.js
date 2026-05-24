const express = require('express');
const router = express.Router();
const optionalAuth = require('../middlewares/optionalAuth');
const validate = require('../middlewares/validate');
const { registerPushToken } = require('../controllers/device.controller');
const { registerPushTokenSchema } = require('../validators/device.validator');

router.post('/push-token', optionalAuth, validate(registerPushTokenSchema), registerPushToken);

module.exports = router;
