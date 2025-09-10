// controllers/moderationController.js
const Comment = require('../models/Comment');
const ModerationLog = require('../models/ModerationLog');

exports.hardDeleteComment = async (req, res) => {
  try {
    const { id } = req.params;
    const comment = await Comment.findById(id);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });

    // Save metadata for log (body, author, post, ancestors)
    const metadata = {
      body: comment.body,
      author: comment.author,
      post: comment.post,
      parentComment: comment.parentComment,
      ancestors: comment.ancestors,
      createdAt: comment.createdAt,
    };

    await Comment.deleteOne({ _id: id });

    await ModerationLog.create({
      moderator: req.user.id,
      action: 'hard_delete',
      targetType: 'comment',
      targetId: id,
      reason: req.body.reason || '',
      metadata,
    });

    return res.json({ message: 'Comment permanently deleted' });
  } catch (err) {
    console.error('Hard delete error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.restoreComment = async (req, res) => {
  try {
    const { id } = req.params;
    // If comment was hard-deleted it won't exist; this restores only soft-deleted
    const comment = await Comment.findById(id);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });

    if (!comment.isDeleted) return res.status(400).json({ message: 'Comment is not soft-deleted' });

    // restore (we replaced body with "[deleted]" earlier; metadata stored in logs could help but here we just allow moderator to supply original body)
    const newBody = req.body.body || '[restored]';
    comment.body = newBody;
    comment.isDeleted = false;
    await comment.save();

    await ModerationLog.create({
      moderator: req.user.id,
      action: 'restore',
      targetType: 'comment',
      targetId: id,
      reason: req.body.reason || '',
      metadata: { restoredBody: newBody },
    });

    return res.json({ message: 'Comment restored', comment });
  } catch (err) {
    console.error('Restore comment error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// list moderation logs (paginated)
exports.listLogs = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '20', 10)));
    const skip = (page - 1) * limit;

    const total = await ModerationLog.countDocuments({});
    const pages = Math.max(1, Math.ceil(total / limit));
    const logs = await ModerationLog.find({})
      .populate('moderator', 'username email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    res.json({ total, page, pages, limit, logs });
  } catch (err) {
    console.error('List logs error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
