// scripts/test-db.js
require('dotenv').config();
const connectDB = require('../config/db');
const User = require('../models/User');
const Post = require('../models/Post');
const Comment = require('../models/Comment');

async function run() {
  await connectDB(process.env.MONGO_URI);

  // CLEANUP (only for local/dev testing)
  await User.deleteMany({});
  await Post.deleteMany({});
  await Comment.deleteMany({});

  const user = await User.create({ username: 'alice', email: 'alice@example.com', password: 'hashed_pw' });
  const post = await Post.create({ title: 'Hello', body: 'First post', author: user._id });
  const comment = await Comment.create({ body: 'Nice post!', author: user._id, post: post._id, parentComment: null, ancestors: [] });

  console.log('Created:', { user: user._id.toString(), post: post._id.toString(), comment: comment._id.toString() });
  process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });
