const express = require('express');
const {  overviewStats } = require('../controllers/analytics.controller');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);
router.get('/overview', overviewStats);

module.exports = router;
