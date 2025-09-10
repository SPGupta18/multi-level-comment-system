// models/ModerationLog.js
const mongoose = require('mongoose');

const moderationLogSchema = new mongoose.Schema({
  moderator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action: { type: String, enum: ['hard_delete', 'restore'], required: true },
  targetType: { type: String, enum: ['comment', 'post', 'user'], required: true },
  targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
  reason: { type: String, default: '' },
  metadata: { type: Object, default: {} }, // store previous body, author, etc.
}, { timestamps: true });

module.exports = mongoose.model('ModerationLog', moderationLogSchema);
