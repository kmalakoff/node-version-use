const path = require('path');
const home = require('homedir-polyfill')();

module.exports = {
  installPath: path.join(home, '.nvu'),
};
