var PLATFORM_IDENTIFIERS = {
  win32: 'win',
};
var IDENTIFIER = PLATFORM_IDENTIFIERS[process.platform] || process.platform;

module.exports = function fileToPath(file, version) {
  var parts = file.split('-');
  var identifier = IDENTIFIER;
  var arch = parts[1];
  var extension = parts.length < 3 ? '.tar.gz' : '.' + parts[2];
  if (extension === '.tar') extension += '.gz';
  return version.version + '/' + 'node-' + version.version + '-' + identifier + '-' + arch + extension;
};
