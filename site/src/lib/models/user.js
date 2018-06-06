const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');
const crypto = require('crypto');
const License = require('./license');

const UserSchema = new mongoose.Schema({
  name: { 
    type: String, 
    lowercase: true, 
    unique: true, 
    required: [true, 'can not be blank'], 
    match: [/^[a-zA-Z0-9]{5,25}$/, 'is invalid'], 
    index: true 
  },
  email: { 
    type: String, 
    lowercase: true, 
    unique: true, 
    required: [true, 'can not be blank'],
    match: [/^[a-zA-Z0-9.!#$%&’*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/, 'is invalid'],
    index: true 
  },
  hash: String,
  salt: String
}, {timestamps: true});

UserSchema.plugin(uniqueValidator, { message: 'is already taken.' });

UserSchema.methods.setPassword = function(password)   {
  this.salt = crypto.randomBytes(16).toString('hex');
  this.hash = crypto.pbkdf2Sync(password, this.salt, 10000, 512, 'sha512').toString('hex');
};

UserSchema.methods.validPassword = function(password) {
  const hash = crypto.pbkdf2Sync(password, this.salt, 10000, 512, 'sha512').toString('hex');
  return this.hash === hash;
};

UserSchema.methods.getLicenses = function(callback) {
  License.find({ 'userId': this._id })
    .sort({ "date_time" : -1 })
    .exec((err, licenses) => {
      if(err) throw err;
      callback(licenses);
    })
}

UserSchema.methods.getCurrLicense = function(callback) {
  License.findOne({ 'userId': this._id })
    .sort({ "date_time" : -1 })
    .exec((err, license) => {
      if(err) callback(err, null);
      if(!license || license.isExpired()) {
        callback(null, null);
      } else {
        callback(null, license);
      }
    })
}

UserSchema.methods.newLicense = function() {
  const license = new License({ userId: this._id });
  license.setExpirationTime();
  return license;
}

UserSchema.methods.toJSON = function(){
  return {
    _id: this._id,
    name: this.name,
    email: this.email
  };
};
  
module.exports = mongoose.model('User', UserSchema);