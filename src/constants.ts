import path from 'path';
import { homedir } from './compat.ts';

export const storagePath = path.join(homedir(), '.nvu') as string;
