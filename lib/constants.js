module.exports = {
  PATH_KEY: require('./pathKey')(),
  SEP: process.platform === 'win32' ? '\\' : '/',
  DELIMITER: process.platform === 'win32' ? ';' : ':',
  NODE: process.platform === 'win32' ? 'node.exe' : 'node',
};
