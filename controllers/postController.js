// controllers/postController.js
const Post = require('../models/Post');

exports.createPost = async (req, res) => {
  try {
    const { title, body } = req.body;
    if (!title || !body) {
      return res.status(400).json({ message: 'Title and body are required' });
    }

    const post = await Post.create({
      title,
      body,
      author: req.user.id, // comes from auth middleware
    });

    res.status(201).json(post);
  } catch (err) {
    console.error('Post error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Optional: list posts
exports.listPosts = async (req, res) => {
  try {
    const posts = await Post.find().populate('author', 'username email').sort({ createdAt: -1 });
    res.json(posts);
  } catch (err) {
    console.error('List posts error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
