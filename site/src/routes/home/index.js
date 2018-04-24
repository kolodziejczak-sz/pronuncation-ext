const template = require('./template.marko');

module.exports = function(req,res) {
  const viewBag = {
    link: '/',
    user: null
  }
  template.render(viewBag, res);
};