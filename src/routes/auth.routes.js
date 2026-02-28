const express = require('express');
const { login } = require('../controllers/auth.controller');
const { authLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Admin Login
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [telegram_id, password]
 *             properties:
 *               telegram_id:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Unauthorized
 */
router.post('/login', authLimiter, login);

module.exports = router;
