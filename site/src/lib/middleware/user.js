module.exports = function(req, res, next) {
  const uid = req.session.uid;
  if(!uid) return next();
  getUserById(uid, (err, user) => {
    if(err) return next(err);
    req.user = res.locals.user = user;
    next();
  })

}

function getUserById(id, callback) {
  if(id === 1) {
    return callback(null,{name: 'szymon'});
  }
  callback(null,null);
}