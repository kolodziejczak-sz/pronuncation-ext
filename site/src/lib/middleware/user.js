const User = require('../models/user');

module.exports = function(req, res, next) {
  const id = "5ae1c6a477a6a619e49598c9" //req.session.uid;
  if(!id) return next();

  User.findById(id, (err, user) => {
    if(err) return next(err);
    req.user = res.locals.user = user;
    next();
  })
}
