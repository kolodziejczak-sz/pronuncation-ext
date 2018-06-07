const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const SessionSchema = new Schema({
  userId: Schema.Types.ObjectId,
  title: String,
  pageURL: String,
  startTime: Number,
  synthesis: Array,
  interimResults: Array,
  finalResults: Array,
  innerHTML: String
}, { timestamps: true });

SessionSchema.methods.setExpirationTime = function(days) {
  const now = new Date().getTime();
  this.expirationTime = now + daysToMs(days);
};

module.exports = mongoose.model('Session', SessionSchema);