const cr = require('cr');
const isVersion = require('is-version');

module.exports = function versionLines(_stdout) {
  return cr(res.stdout)
    .split('\n')
    .filter((line) => {
      if (!line.length) return false;
      if (line[0] === 'v') return isVersion(line.slice(1));
      return isVersion(line);
    });
};
