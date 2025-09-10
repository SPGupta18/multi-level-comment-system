// middlewares/ownership.js
const Comment = require('../models/Comment');

/**
 * Ensure req.user exists (auth middleware must run before this)
 * and the current user is the author of the comment.
 *
 * Usage: put this after `auth` in routes for owner-only actions.
 */
async function ensureCommentOwner(req, res, next) {
  try {
    const commentId = req.params.id;
    const comment = await Comment.findById(commentId).select('author');
    if (!comment) return res.status(404).json({ message: 'Comment not found' });

    if (comment.author.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden: not the comment owner' });
    }
    // attach comment if route wants it
    req.comment = comment;
    next();
  } catch (err) {
    console.error('Ownership middleware error:', err);
    res.status(500).json({ message: 'Server error' });
  }
}

module.exports = {
  ensureCommentOwner,
};
