const path = require('path');
const home = require('homedir-polyfill')();

module.exports = {
  cacheDirectory: path.join(home, '.nvu', 'cache'),
  installDirectory: path.join(home, '.nvu', 'installed'),
};
