const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const LicenseSchema = new Schema({
  userId: Schema.Types.ObjectId,
  expirationTime: Number,
}, { timestamps: true });

LicenseSchema.methods.isExpired = function(){
  const now = new Date().getTime();
  return (now - this.expirationTime) > 0;
};

module.exports = mongoose.model('License', LicenseSchema);