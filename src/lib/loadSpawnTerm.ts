import { loadModule } from 'install-module-linked';
import path from 'path';
import url from 'url';

const _dirname = path.dirname(typeof __dirname !== 'undefined' ? __dirname : url.fileURLToPath(import.meta.url));
const nodeModules = path.join(_dirname, '..', '..', 'node_modules');

// biome-ignore lint/suspicious/noExplicitAny: module type varies by Node version
type SpawnTermFn = ((command: string, args: string[], options: any, termOptions: any, callback: (err?: Error, res?: any) => void) => void) | null;

interface SpawnTermModule {
  spawnTerm: SpawnTermFn;
  figures: { tick: string; cross: string };
  formatArguments: (args: string[]) => string[];
}

let cached: SpawnTermModule | undefined;

export default function loadSpawnTerm(callback: (err: Error | null, result: SpawnTermModule) => void): void {
  if (cached !== undefined) {
    callback(null, cached);
    return;
  }

  loadModule('spawn-term', nodeModules, (_err, mod) => {
    // spawn-term returns undefined on CJS or Node <= 18
    cached = {
      spawnTerm: mod?.default ?? null,
      figures: mod?.figures ?? { tick: '✓', cross: '✗' },
      formatArguments: mod?.formatArguments ?? ((args: string[]) => args),
    };
    callback(null, cached);
  });
}
