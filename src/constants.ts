import path from 'path';
import { homedir } from './compat.ts';

// Allow NVU_HOME override for testing
export const storagePath = (process.env.NVU_HOME || path.join(homedir(), '.nvu')) as string;
