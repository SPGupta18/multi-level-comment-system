// server.js
require('dotenv').config();
const express = require('express');
const connectDB = require('./config/db');

const app = express();
const PORT = process.env.PORT || 4000;

// --------- middleware (must come BEFORE routes)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --------- routes
const authRoutes = require('./routes/auth');
const postRoutes = require('./routes/posts');

app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);

// health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', ts: new Date().toISOString() });
});

// --------- start server
const start = async () => {
  await connectDB(process.env.MONGO_URI);
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
};

if (require.main === module) {
  start();
}

module.exports = app;
