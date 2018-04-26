const template = require('./template.marko');

module.exports = function(req,res) {
  const viewBag = {
    link: '/',
    user: res.locals.user || req.user
  }
  template.render(viewBag, res);
};