const template = require('./template.marko');

module.exports = function(req,res) {
  const user = res.locals.user || req.user;
  user.getCurrLicense((err, license) => {
    const viewBag = {
      link: '/pricing',
      user,
      license
    }
    template.render(viewBag, res);
  })
};