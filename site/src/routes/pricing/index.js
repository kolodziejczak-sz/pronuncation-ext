const template = require('./template.marko');

module.exports = function(req,res) {
  const user = res.locals.user || req.user;
  const viewBag = {
    link: '/pricing',
    user
  }
  if(user) {
    user.getCurrLicense((err, license) => {
      viewBag.license = license;
      template.render(viewBag, res);
    })
  } else {
    template.render(viewBag, res);
  }
};