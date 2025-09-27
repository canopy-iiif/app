const { stylesheetHref, Stylesheet } = require('./head');

module.exports = {
  build: require('./build/build').build,
  dev: require('./build/dev').dev,
  stylesheetHref,
  Stylesheet,
};
