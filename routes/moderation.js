// routes/moderation.js
const express = require('express');
const router = express.Router();
const moderationController = require('../controllers/moderationController');
const auth = require('../middlewares/auth');
const authorizeRole = require('../middlewares/authorizeRole');

// Only moderators and admins
const modOnly = [auth, authorizeRole('moderator','admin')];

// Permanently delete a comment
router.delete('/comment/:id', ...modOnly, moderationController.hardDeleteComment);

// Restore a soft-deleted comment
router.post('/comment/:id/restore', ...modOnly, moderationController.restoreComment);

// List moderation logs (moderator/admin)
router.get('/logs', ...modOnly, moderationController.listLogs);

module.exports = router;
