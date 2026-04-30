const express = require('express');
const router = express.Router();
const { sendMessage } = require('../controllers/contact.controller');
const optionalAuth = require('../middlewares/optionalAuth');

router.post('/',optionalAuth, sendMessage);

module.exports = router;
