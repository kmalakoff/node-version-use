import homedir from 'homedir-polyfill';
import path from 'path';

const home = homedir();
export const storagePath = path.join(home, '.nvu') as string;
