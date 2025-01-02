const path = require('path');
const home = require('homedir-polyfill')();

export const storagePath = path.join(home, '.nvu');
