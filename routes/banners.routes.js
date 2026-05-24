const express = require('express');
const router = express.Router();
const { listActiveBanners,getBanner } = require('../controllers/banner.controller');

router.get('/', listActiveBanners);
router.get('/:id', getBanner);

module.exports = router;
