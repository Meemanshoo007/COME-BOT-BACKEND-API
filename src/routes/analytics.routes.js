const express = require('express');
const { overviewStats, userJoinStats } = require('../controllers/analytics.controller');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);
router.get('/overview', overviewStats);
router.get('/user-joins', userJoinStats);

module.exports = router;
