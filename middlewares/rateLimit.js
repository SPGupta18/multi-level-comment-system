// middlewares/rateLimit.js
const rateLimit = require('express-rate-limit');

// factory function so we can create different limiters
function createRateLimiter({ windowMs, max, message }) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true, // return rate limit info in RateLimit-* headers
    legacyHeaders: false,  // disable X-RateLimit-* headers
    message: message || 'Too many requests, please try again later',
  });
}

module.exports = {
  createRateLimiter,
};
