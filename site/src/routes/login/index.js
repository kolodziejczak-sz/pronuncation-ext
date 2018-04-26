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
        users: users
      }
      template.render(viewBag, res);
    })
  }
};

exports.submit = function(req, res) {
  const form = req.body;
  User.findOne({ name: form.username }, (err, user) => {
    if(err) throw err;
    if(user && user.validPassword(form.password)) {
      exports.login(user, req, res);
    }
    else {
      tryAgainForm(form, res);
    }
  })
};

exports.login = function(user, req, res) {
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