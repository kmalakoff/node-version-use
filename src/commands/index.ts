// deferred: each subcommand's own dependencies must not load for a subcommand that isn't invoked.
// require() cannot load these ESM siblings below Node 20.19 (require(esm)), so the ESM half needs
// a real dynamic import per command; the CJS half's siblings are genuine CommonJS, so a plain
// synchronous require avoids depending on Promise, which isn't global before Node 0.12.
const commandModules: Record<string, string> = {
  default: './default.js',
  local: './local.js',
  list: './list.js',
  which: './which.js',
  install: './install.js',
  uninstall: './uninstall.js',
  setup: './setup.js',
  teardown: './teardown.js',
};

type CommandFn = (args: string[]) => void;

function loadCommand(specifier: string, callback: (err: Error | null, cmd?: CommandFn) => void): void {
  if (typeof require === 'undefined') {
    import(specifier).then((mod) => callback(null, mod.default || mod)).catch((err) => callback(err instanceof Error ? err : new Error(String(err))));
  } else {
    try {
      const mod = require(specifier);
      callback(null, mod.default || mod);
    } catch (err) {
      callback(err instanceof Error ? err : new Error(String(err)));
    }
  }
}

export function isCommand(name: string): boolean {
  return name in commandModules;
}

export function runCommand(name: string, args: string[]): void {
  const specifier = commandModules[name];
  if (!specifier) {
    console.error(`Unknown command: ${name}`);
    return;
  }
  loadCommand(specifier, (err, cmd) => {
    if (err || !cmd) {
      console.error(err ? err.message : `Unknown command: ${name}`);
      return;
    }
    cmd(args);
  });
}
