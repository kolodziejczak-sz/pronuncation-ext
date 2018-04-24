const template = require('./template.marko');

module.exports = function(req,res) {
  const viewBag = {
    name: 'Szymek'
  }
  template.render(viewBag, res);
};