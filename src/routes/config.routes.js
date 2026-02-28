const express = require('express');
const { getConfig, patchConfig } = require('../controllers/config.controller');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);
router.get('/', getConfig);
router.patch('/', patchConfig);

module.exports = router;
