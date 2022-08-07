var cr = require('cr');
var isVersion = require('is-version');

module.exports = function versionLines(stdout) {
  return cr(stdout)
    .split('\n')
    .filter(function (line) {
      if (!line.length) return false;
      if (line[0] === 'v') return isVersion(line.slice(1));
      return isVersion(line);
    });
};
