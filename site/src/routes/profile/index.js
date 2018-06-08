const template = require('./template.marko');
const User = require('../../lib/models/user');
const License = require('../../lib/models/license');
const Session = require('../../lib/models/session');
const moment = require('moment');

exports.site = function(req, res) {
  const user = (res.locals.user || req.user);
  const msg = (res.locals.msg || null);
  const form = (res.locals.form || null);
  exports.clearLocals(res);
  if(!user) {
    res.redirect('/');
    return;
  }

  Promise
  .all([user.getLicenses(), user.getSessions()])
  .then((values) => {
    const licenses = values[0] || [];
    const sessions = (values[1] || []);
    const viewBag = { 
      link: '/profile',
      view: req.params.viewId || 0,
      user, licenses, sessions,
      msg,
      form
    };
    template.render(viewBag, res);
  })
  .catch((err) => {
    console.log(err);
    res.redirect('/');
  })
};

exports.clearLocals = function(res) {
  res.locals.msg = null;
  res.locals.form = null;
};

exports.deleteSession = function(req, res) {
  const id = req.body.id;
  Session.findByIdAndRemove(id, (err) => {
    if(err) {
      return res.status(500).send({
        msg: "Deleting session failed due to internal server error." 
      });
    }
    res.redirect('/profile/1');
  })
} 


// JSON API
exports.session = function(req, res) {
  const user = req.body.user;
  const licenseId = user.license;
  if(!licenseId) {
    return res.status(401).send({ msg:"No license key found." });
  } 
  License.findById(licenseId, (err, license) => {
    if(err) {
      return res.status(500).send({ msg:"Saving session failed due to internal server error." });
    }
    if(!license) {
      return res.status(401).send({ msg:"License doesn't exists." });
    }
    if(String(license.userId) !== String(user._id)) {
      return res.status(401).send({ msg:"You are not owner of this license." });
    }
    if(license.isExpired()) {
      return res.status(401).send({ msg:"License is expired." });
    }
    const reqSession = req.body.session;
    User.findById(user._id, (err, user) => {
      if(err) {
        return res.status(500).send({ msg:"Saving session failed due to internal server error." });
      }
      Session.findOneAndUpdate({ startTime: reqSession.startTime }, { $set: { 
        synthesis: reqSession.synthesis,
        interimResults: reqSession.interimResults,
        finalResults: reqSession.finalResults,
        innerHTML: reqSession.innerHTML
      } }, (err, session) => {
        if(err) {
          return res.status(500).send({ msg:"Saving session failed due to internal server error." });
        }
        if(!session){
          session = user.newSession(reqSession);
          session.save((err) => {
            if(err) {
              return res.status(500).send({ msg:"Saving session failed due to internal server error." });
            }
            return res.status(200).send({ msg:"Saving session succeed.", data: { id: session._id } })
          });
        } else {
          return res.status(200).send({ msg:"Changes saved.", data: { id: session._id } })
        }
      })
    });
  });
};