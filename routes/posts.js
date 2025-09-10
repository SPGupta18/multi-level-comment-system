// routes/posts.js
const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');
const auth = require('../middlewares/auth');
const { createRateLimiter } = require('../middlewares/rateLimit');

// Limit: max posts per user/IP in the time window
const postLimiter = createRateLimiter({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10),
  max: parseInt(process.env.RATE_LIMIT_POSTS_MAX, 10) || 5,
  message: 'Too many posts created, please try again later',
});

router.post('/', auth, postLimiter, postController.createPost);
router.get('/', postController.listPosts);

module.exports = router;
