var execSync = require('child_process').execSync;

var os = process.platform;
var arch = process.arch === 'x86' ? require('arch')() : process.arch;

if (os !== 'win32') {
  try {
    var stdout = execSync('uname -a').toString('utf8');
    if (stdout.indexOf('Linux') === 0) os = 'linux';
    else if (stdout.indexOf('Darwin') === 0) os = 'darwin';
    else if (stdout.indexOf('SunOS') === 0) os = 'sunos';

    if (~stdout.indexOf('x86_64')) arch = 'x64';
    else if (~stdout.indexOf('i386')) arch = 'x86';
    else if (~stdout.indexOf('i486')) arch = 'x86';
    else if (~stdout.indexOf('i586')) arch = 'x86';
    else if (~stdout.indexOf('i686')) arch = 'x86';
    else if (~stdout.indexOf('raspberrypi')) arch = 'arm-pi';
  } catch (err) {}
}

if (os === 'win32') os = 'win';
else if (os === 'darwin') os = 'osx';

module.exports = { os: os, arch: arch };
