import path from 'path';
import url from 'url';

const __dirname = path.dirname(typeof __filename !== 'undefined' ? __filename : url.fileURLToPath(import.meta.url));

// Node release archives are named by version and checksum-verified, then never change: one copy is linked into every worktree.
export const CACHE_PATH = path.join(__dirname, '..', '..', '.cache', 'shared', 'node-install-release');
