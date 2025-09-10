// routes/posts.js
const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');
const auth = require('../middlewares/auth');

// Create a post (only logged-in users)
router.post('/', auth, postController.createPost);

// List all posts (anyone can view)
router.get('/', postController.listPosts);

module.exports = router;
