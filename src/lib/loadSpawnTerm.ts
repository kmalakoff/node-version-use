import installModule from 'install-module-linked';
import path from 'path';
import url from 'url';

const _dirname = path.dirname(typeof __dirname !== 'undefined' ? __dirname : url.fileURLToPath(import.meta.url));
const nodeModules = path.join(_dirname, '..', '..', '..', 'node_modules');
const moduleName = 'spawn-term';

type CreateSessionFn =
  | ((options?: { header?: string; showStatusBar?: boolean; interactive?: boolean }) => {
      spawn: (command: string, args: string[], options: unknown, termOptions: unknown, callback: (err?: Error, res?: unknown) => void) => void;
      close: () => void;
      waitAndClose: (callback?: () => void) => void;
    })
  | undefined;

interface SpawnTermModule {
  createSession: CreateSessionFn;
  figures: { tick: string; cross: string };
  formatArguments: (args: string[]) => string[];
}

let cached: SpawnTermModule | undefined;

function loadModule(moduleName, callback) {
  if (typeof require === 'undefined') {
    import(moduleName)
      .then((mod) => {
        callback(null, {
          createSession: mod?.createSession ?? undefined,
          figures: mod?.figures ?? { tick: '✓', cross: '✗' },
          formatArguments: mod?.formatArguments ?? ((args: string[]) => args),
        });
      })
      .catch(callback);
  } else {
    try {
      callback(null, require(moduleName));
    } catch (err) {
      callback(err, null);
    }
  }
}

export default function loadSpawnTerm(callback: (err: Error | null, result: SpawnTermModule) => void): void {
  if (cached !== undefined) {
    callback(null, cached);
    return;
  }
  installModule(moduleName, nodeModules, {}, (err) => {
    if (err) return callback(err, null);
    loadModule(moduleName, (err, _cached: SpawnTermModule) => {
      if (err) return callback(err, null);
      cached = _cached;
      callback(null, cached);
    });
  });
}
