const template = require('./template.marko');

exports.form = function(req,res) {
  const viewBag = {
    link: '/login'
  }
  template.render(viewBag, res);
};

exports.submit = function(req,res) {
  if(req.body.username==="szymon" && req.body.password==="123") {
    req.session.uid = 1;
    res.redirect('/');
  } else {
    const viewBag = {
      link: '/login',
      msg: 'Incorrect username or password',
      username: req.body.username
    }
    template.render(viewBag, res);
  }
};

exports.logout = function(req,res) {
  req.session.destroy((err) => {
    if(err) throw err;
    res.redirect('/');
  })
}