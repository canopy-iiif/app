const React = require('react');

let PageContext = null;

function getPageContext() {
  if (!PageContext) {
    PageContext = React.createContext({ navigation: null, page: null });
  }
  return PageContext;
}

module.exports = {
  getPageContext,
};
