const mongoose = require('mongoose');

const SessionSchema = new mongoose.Schema({
  phone:     { type: String, required: true, unique: true, index: true },
  data:      { type: Object, default: {} },
  updatedAt: { type: Date, default: Date.now, expires: 86400 }, // TTL 24h auto-nettoyage
});

module.exports = mongoose.model('Session', SessionSchema);
