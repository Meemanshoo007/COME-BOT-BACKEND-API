const express = require('express');
const { login, getMe } = require('../controllers/auth.controller');
const { authLimiter } = require('../middleware/rateLimiter');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

router.post('/login', authLimiter, login);
router.get('/me', authMiddleware, getMe);

module.exports = router;
