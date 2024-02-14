const path = require('path');
const home = require('osenv').home();

module.exports = {
  cacheDirectory: path.join(home, '.nvu', 'cache'),
  installDirectory: path.join(home, '.nvu', 'installed'),
};
