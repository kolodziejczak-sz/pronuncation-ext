const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const SessionSchema = new Schema({
  userId: Schema.Types.ObjectId,
  pageURL: String,
  startTime: Number,
  synthesis: Array,
  interimResults: Array,
  finalResults: Array,
  innerHTML: String,
}, { timestamps: true });

module.exports = mongoose.model('Session', SessionSchema);