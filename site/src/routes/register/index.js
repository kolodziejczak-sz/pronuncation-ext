const template = require('./template.marko');
const profile = require('../profile/index');
const account = require('../login/index');
const User = require('../../lib/models/user');

exports.form = function(req, res) {
  if(req.user) {
    res.redirect('/');
    return;
  }
  const viewBag = {
    link: '/register',
    user: null
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

exports.edit = function(req, res) {
  const user = res.locals.user || req.user;
  if(!user) {
    res.redirect('/');
    return;
  }
  const form = req.body;
  console.log("edit form", form)
  User.findByIdAndUpdate(user._id, { $set: { 
    name: form.name,
    email: form.email
  }},{new: true}, (err, updatedUser) => {
    if(err) {
      editForm(req, res, form, 'Name and email have to be unique.');
    }
    req.user = res.locals.user = updatedUser;
    if(form.password3) {
      updatedUser.setPassword(form.password3);
      updatedUser.save((err) => {
        if(err) {
          editForm(req, res, form, 'Name and email have to be unique.');
          return;
        }
        editForm(req, res, null, 'Profile has been edited.');
        return;
      });
    }
    editForm(req, res, null, 'Profile has been edited.');
  });
}

function tryAgainForm(form, msg, res) {
  const viewBag = {
    link: '/register',
    form: form,
    msg: msg
  }
  template.render(viewBag, res);
}

function editForm(req, res, form, msg) {
  profile.editAccount(req, res, form, msg);
}