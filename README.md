## node-version-use

Cross-platform solution for using multiple versions of Node.js. Transparent version switching via command interception.

### Installation

```bash
npm install -g node-version-use
nvu setup
```

`nvu setup` prints the PATH change for your shell. On macOS and Linux, add `export PATH="$HOME/.nvu/bin:$PATH"` to your shell profile. On Windows PowerShell, add `$env:PATH = "$HOME\\.nvu\\bin;$env:APPDATA\\npm;$env:PATH"` to `$PROFILE`, then restart the shell.

You need Node.js and npm to install nvu. The package installs the platform-specific nvu binary selected by npm; it does not download a Node version during package installation.

The Go binary ships in a per-platform package (`nvu-darwin-arm64`, `nvu-linux-x64`, ...) that npm
selects by `os` and `cpu` and installs as an optional dependency. Nothing is downloaded and no
install script runs, so consumers need no `allowScripts` entry for this package.

### Quick Start

```bash
nvu install 20           # Download and install Node 20
nvu install 18           # Download and install Node 18
nvu default 20           # Set the global default
nvu local 18             # Write this project's .nvmrc
node --version           # Uses v20 (or v18 in project)
```

### Commands

```
nvu default 20           # Global default
nvu default system       # Use system Node
nvu local 18             # Project version (.nvmrc)
nvu install 22           # Install Node
nvu uninstall 22         # Uninstall Node
nvu list                 # List installed
nvu setup                # Install/refresh the ~/.nvu/bin shims
nvu 22 npm run test      # Run with specific version
```

### How It Works

```
~/.nvu/bin/              # Go binary shims (node, npm, npx, nvu, ...)
  ↓
~/.nvu/default          # Contains "22", "20", or "system"
  ↓
~/.nvu/installed/v22/   # Real Node.js installation
  └── bin/node          # Actual Node binary
```

**Key design decisions:**

1. **Strict routing** - Each command routes to exactly one version (the default)
2. **npm compatibility** - Uses `npm_config_prefix` so npm behaves normally
3. **System escape hatch** - `nvu system npm ...` bypasses version routing
4. **Version-specific packages** - Global npm packages live in the version's directory

### Frequently Asked Questions

#### How do I reinstall nvu if it's missing?

```bash
nvu system npm install -g node-version-use
```

This bypasses version routing entirely.

#### Are global npm packages shared across versions?

No. Each Node version has its own `lib/node_modules/`. Install separately:

```bash
nvu 22 npm install -g some-package
nvu 20 npm install -g some-package
```

#### Can I use system Node?

```bash
nvu default system
```

Routes all commands to system binaries via PATH.

#### Why not search all installed versions for binaries?

Explicit is better than implicit. You know exactly which version runs. Use `nvu <version> <command>` for specific versions.

### How nvu Differs from Other Version Managers

| Feature | nvu | nvm | Volta |
|---------|-----|-----|-------|
| Command routing | Go binary shim | Shell function | npm shim |
| Default version | Global or per-project | Global | Per-project (package.json) |
| Global packages | Version-specific | Shared (via symlinks) | Pin to version |
| System Node | `nvu default system` | `nvm use system` | `volta off` |
| Recovery when broken | `nvu system npm ...` | Reinstall nvm | Reinstall volta |

**nvu** uses a single Go binary that intercepts commands. Simple, predictable routing.

**nvm** is a shell function that changes `$NODE_HOME` environment variable.

**Volta** pins packages to specific Node versions in package.json and uses npm shims.

### JavaScript API

```javascript
const nvu = require('node-version-use');

(async () => {
  const results = await nvu('>=0.8', 'node', ['--version'], { stdio: 'inherit' });
  console.log(results);
})().catch(console.error);
```

### Uninstall

```bash
nvu teardown           # Remove ~/.nvu/bin
rm -rf ~/.nvu          # macOS/Linux: remove nvu-managed versions and settings
# PowerShell: Remove-Item -Recurse -Force "$HOME\\.nvu"
```

`teardown` removes nvu's shims. Removing `~/.nvu` also removes every Node version and setting managed by nvu; it does not remove system Node installations.

### Compatibility

- macOS (arm64, x64)
- Linux (arm64, x64)
- Windows (arm64, x64)

Compatible with `.nvmrc` files from nvm, fnm, and other tools.
