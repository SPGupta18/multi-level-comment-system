// controllers/commentController.js
const mongoose = require('mongoose');
const Comment = require('../models/Comment');
const Post = require('../models/Post');

const ObjectId = mongoose.Types.ObjectId;

exports.createComment = async (req, res) => {
  try {
    const { postId, body, parentCommentId } = req.body;
    if (!postId || !body) return res.status(400).json({ message: 'postId and body are required' });

    if (!ObjectId.isValid(postId)) return res.status(400).json({ message: 'Invalid postId' });

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    let ancestors = [];
    let parentComment = null;

    if (parentCommentId) {
      if (!ObjectId.isValid(parentCommentId)) return res.status(400).json({ message: 'Invalid parentCommentId' });
      parentComment = await Comment.findById(parentCommentId);
      if (!parentComment) return res.status(404).json({ message: 'Parent comment not found' });
      ancestors = [...(parentComment.ancestors || []), parentComment._id];
    }

    const comment = await Comment.create({
      body,
      author: req.user.id,
      post: postId,
      parentComment: parentCommentId || null,
      ancestors,
    });

    post.commentCount = (post.commentCount || 0) + 1;
    await post.save();

    res.status(201).json(comment);
  } catch (err) {
    console.error('Comment create error:', err && err.stack ? err.stack : err);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * GET paginated top-level comments for a post
 */
exports.getCommentsForPost = async (req, res) => {
  try {
    const { postId } = req.params;
    if (!ObjectId.isValid(postId)) return res.status(400).json({ message: 'Invalid postId' });

    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '10', 10)));

    const totalTopLevel = await Comment.countDocuments({ post: postId, parentComment: null });
    const pages = Math.max(1, Math.ceil(totalTopLevel / limit));

    const topComments = await Comment.find({ post: postId, parentComment: null })
      .populate('author', 'username email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const topIds = topComments.map(c => new ObjectId(c._id));

    let replyCounts = [];
    if (topIds.length) {
      replyCounts = await Comment.aggregate([
        { $match: { post: new ObjectId(postId), parentComment: { $in: topIds } } },
        { $group: { _id: '$parentComment', count: { $sum: 1 } } }
      ]);
    }

    const replyCountMap = {};
    replyCounts.forEach(rc => { replyCountMap[rc._id.toString()] = rc.count; });

    const results = topComments.map(c => ({
      comment: c,
      replyCount: replyCountMap[c._id.toString()] || 0,
    }));

    res.json({ totalTopLevel, page, pages, limit, results });
  } catch (err) {
    console.error('Get comments error:', err && err.stack ? err.stack : err);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * GET paginated immediate replies for a given comment
 */
exports.getRepliesForComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    if (!ObjectId.isValid(commentId)) return res.status(400).json({ message: 'Invalid commentId' });

    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '5', 10)));

    const totalReplies = await Comment.countDocuments({ parentComment: commentId });
    const pages = Math.max(1, Math.ceil(totalReplies / limit));

    const replies = await Comment.find({ parentComment: commentId })
      .populate('author', 'username email')
      .sort({ createdAt: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const replyIds = replies.map(r => new ObjectId(r._id));
    let childCounts = [];
    if (replyIds.length) {
      childCounts = await Comment.aggregate([
        { $match: { parentComment: { $in: replyIds } } },
        { $group: { _id: '$parentComment', count: { $sum: 1 } } }
      ]);
    }

    const childCountMap = {};
    childCounts.forEach(cc => { childCountMap[cc._id.toString()] = cc.count; });

    const items = replies.map(r => ({
      comment: r,
      replyCount: childCountMap[r._id.toString()] || 0,
    }));

    res.json({ totalReplies, page, pages, limit, replies: items });
  } catch (err) {
    console.error('Get replies error:', err && err.stack ? err.stack : err);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Edit a comment (owner-only route should run auth + ownership middleware before this)
 */
exports.editComment = async (req, res) => {
  try {
    const commentId = req.params.id;
    const { body } = req.body;
    if (!body) return res.status(400).json({ message: 'body is required' });

    // req.comment may be attached by ensureCommentOwner middleware; otherwise fetch
    const comment = req.comment || await Comment.findById(commentId);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });

    comment.body = body;
    comment.isEdited = true;
    await comment.save();

    res.json(comment);
  } catch (err) {
    console.error('Edit comment error:', err && err.stack ? err.stack : err);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Soft-delete a comment (owner-only route should run auth + ownership middleware before this)
 */
exports.softDeleteComment = async (req, res) => {
  try {
    const commentId = req.params.id;
    const comment = req.comment || await Comment.findById(commentId);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });

    // Soft delete: mark flag and replace body with placeholder
    comment.isDeleted = true;
    comment.body = '[deleted]';
    await comment.save();

    res.json({ message: 'Comment soft-deleted' });
  } catch (err) {
    console.error('Soft delete comment error:', err && err.stack ? err.stack : err);
    res.status(500).json({ message: 'Server error' });
  }
};
