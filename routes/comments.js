// routes/comments.js
const express = require('express');
const router = express.Router();
const commentController = require('../controllers/commentController');
const auth = require('../middlewares/auth');
const { createRateLimiter } = require('../middlewares/rateLimit');
const { ensureCommentOwner } = require('../middlewares/ownership');

// Limit for creating comments (already in place)
const commentLimiter = createRateLimiter({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10),
  max: parseInt(process.env.RATE_LIMIT_COMMENTS_MAX, 10) || 20,
  message: 'Too many comments, please try again later',
});

// create comment / reply (protected)
router.post('/', auth, commentLimiter, commentController.createComment);

// edit a comment (owner only)
router.patch('/:id', auth, ensureCommentOwner, commentController.editComment);

// soft-delete a comment (owner only)
router.delete('/:id', auth, ensureCommentOwner, commentController.softDeleteComment);

// get replies and get top-level (existing)
router.get('/replies/:commentId', commentController.getRepliesForComment);
router.get('/:postId', commentController.getCommentsForPost);

module.exports = router;
