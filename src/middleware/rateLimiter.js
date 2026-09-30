const rateLimit = require('express-rate-limit');

/**
 * Strict rate limiter for the auth login endpoint.
 * Prevents brute-force attacks on the admin login.
 */
const authLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 20,                  // 20 attempts per window
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Too many login attempts. Please try again after 1 minute.',
    },
});

/**
 * General API rate limiter for all routes.
 */
const apiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 120,                 // 120 requests per minute per IP
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Too many requests. Please slow down.',
    },
});

module.exports = { authLimiter, apiLimiter };
