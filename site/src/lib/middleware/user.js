const User = require('../models/user');

module.exports = function(req, res, next) {
  
  const id = req.session.uid;
  if(!id) return next();

  User.findById(id, (err, user) => {
    
    if(err) return next(err);
    
    req.user = res.locals.user = user;
    next();
  })
}
