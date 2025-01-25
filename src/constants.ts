import path from 'path';
import homedir from 'homedir-polyfill';

const home = homedir();
export const storagePath = path.join(home, '.nvu');
