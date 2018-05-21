const User = require('../models/user');

module.exports = function(req, res, next) {
  
  const id = req.session.uid;
  if(!id) return next();

  User.findById(id, (err, user) => {

    if(err) return next(err);
    user.getCurrLicense((err, license) => {
      if(err) return next(err);
      user.license = license;
    })
    req.user = res.locals.user = user;
    next();
  })
}
