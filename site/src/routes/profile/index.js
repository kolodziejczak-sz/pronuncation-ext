const template = require('./template.marko');
const User = require('../../lib/models/user');
const License = require('../../lib/models/license');
const Session = require('../../lib/models/session');

exports.site = function(req, res) {
  const user = (res.locals.user || req.user);
  if(!user) {
    res.redirect('/');
    return;
  }
  const viewBag = {
    link: '/profile',
    user: user
  }
  template.render(viewBag, res);
};

// JSON API
exports.session = function(req, res) {
  const user = req.body.user;
  const licenseId = user.license;
  if(!licenseId) {
    return res.status(401).send({ msg:"No license key found." });
  } 
  License.findById(licenseId, (license) => {
    if(!license || (license.userId !== user._id)) {
      return res.status(401).send({ msg:"You are not owner of this license." });
    }
    if(license.isExpired()) {
      return res.status(401).send({ msg:"License is expired." });
    }
    const session = new Session(req.session);
    session.save((err) => {
      if(err) {
        return res.status(500).send({ msg:"Saving session failed due to internal server error." });
      }
      return res.status(200).send({ msg:"Saving session succeed.", data: { id: session._id } })
    });
  });
};