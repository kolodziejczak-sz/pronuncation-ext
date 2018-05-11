const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const LicenseSchema = new Schema({
  userId: Schema.Types.ObjectId,
  duration: Number,
}, { timestamps: true });

module.exports = mongoose.model('License', LicenseSchema);