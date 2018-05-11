const template = require('./template.marko');
const account = require('../login/index');
const User = require('../../lib/models/user');

exports.form = function(req, res) {
  if(req.user) {
    res.redirect('/');
    return;
  }
  const viewBag = {
    link: '/register'
  }
  template.render(viewBag, res);
};

exports.submit = function(req, res) {
  const form = req.body;
  const newUser = new User({
    name: form.name,
    email: form.email
  });
  newUser.setPassword(form.password1);
  newUser.save((err) => {
    if(err) {
      tryAgainForm(form, err._message, res);
      return;
    }
    account.signInUser(newUser, req, res)
  })
}

function tryAgainForm(form, msg, res) {
  const viewBag = {
    link: '/register',
    form: form,
    msg: msg
  }
  template.render(viewBag, res);
}