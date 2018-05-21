const template = require('./template.marko');
const User = require('../../lib/models/user');

exports.form = function(req, res) {
  if(req.user) {
    res.redirect('/');
  }
  else {
    User.find({}, (err, users) => {
      if(err) throw err;
      const viewBag = {
        link: '/login',
        user: null
      }
      template.render(viewBag, res);
    })
  }
};

exports.submit = function(req, res) {
  const credentials = req.body;
  exports.login(credentials, (err, user) => {
    if(err) throw err;
    if(user) {
      exports.signInUser(user, req, res);
    } else {
      tryAgainForm(credentials, res);
    }
  }) 
};

exports.apiLogin = function(req, res) {
  console.log(req.body);
  const credentials = req.body;
  exports.login(credentials, (err, user) => {
    if(err) internalServerApiError(res);
    if(user) {
      user.getLicense((err, license) => {
        if(err) internalServerApiError(res);
        user = user.toJSON();
        if(license && !license.isExpired()) {
          user.license = license._id;
          user.expirationTime = addHoursFromNow(12);
        }
        res.status(200).send({ code:'OK', msg:'Login succeed', data: user })
      })
    } else {
      res.status(200).send({ code:'OK', msg:'Incorrect login or password' })
    }
  });
}

exports.login = function(credentials, callbackFn) {
  User.findOne({ name: credentials.username }, (err, user) => {
    if(err) callbackFn(err);
    if(user && user.validPassword(credentials.password)) {
      callbackFn(null,user);
    }
    else {
      callbackFn(null,null);
    }
  })
};

exports.signInUser = function(user, req, res) {
  req.session.uid = user._id;
  res.redirect('/');
};

exports.logout = function(req, res) {
  req.session.destroy((err) => {
    if(err) throw err;
    res.redirect('/');
  })
};

function tryAgainForm(form, res) {
  const viewBag = {
    link: '/login',
    msg: 'Incorrect username or password',
    username: form.username
  }
  template.render(viewBag, res);
};

function addHoursFromNow(hoursCount) {
  return new Date().getTime() + hoursToMs(hoursCount);
}

function hoursToMs(hoursCount) {
  return hoursCount * 60 * 60 * 1000;
};

function internalServerApiError(res) {
  res.status(500).send({ code: 'ERROR', msg:'Login failed due to server problem.' });
};