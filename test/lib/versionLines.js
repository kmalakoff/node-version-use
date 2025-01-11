const cr = require('cr');
const isVersion = require('is-version');

module.exports = function versionLines(stdout) {
  return cr(stdout)
    .split('\n')
    .map((line) => (line.indexOf(':') >= 0 ? line.split(':')[1] : line))
    .filter((line) => {
      if (!line.length) return false;
      return isVersion(line, line[0] === 'v' ? 'v' : undefined);
    });
};
