const express = require('express');
const { interestStats, overviewStats } = require('../controllers/analytics.controller');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);
router.get('/interests', interestStats);
router.get('/overview', overviewStats);

module.exports = router;
