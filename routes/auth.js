// routes/auth.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { createRateLimiter } = require('../middlewares/rateLimit');

// Rate limiter for auth routes
const authLimiter = createRateLimiter({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10),
  max: parseInt(process.env.RATE_LIMIT_MAX, 10),
  message: 'Too many login/register attempts, please try again later',
});

router.post('/register', authLimiter, authController.register);
router.post('/login', authLimiter, authController.login);

module.exports = router;
