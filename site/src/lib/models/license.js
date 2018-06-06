const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const LicenseDuration = 30;

const LicenseSchema = new Schema({
  userId: Schema.Types.ObjectId,
  expirationTime: Number,
}, { timestamps: true });

LicenseSchema.methods.isExpired = function(){
  const now = new Date().getTime();
  return (now - this.expirationTime) > 0;
};

LicenseSchema.methods.setExpirationTime = function(days) {
  days = days || LicenseDuration;
  const now = new Date().getTime();
  this.expirationTime = now + daysToMs(days);
};

function daysToMs(days) {
  return days * 24 * 60 * 60 * 1000;
}

module.exports = mongoose.model('License', LicenseSchema);