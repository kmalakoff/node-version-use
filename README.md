## node-version-use

Cross-platform solution for using multiple versions of Node.js. Transparent version switching via command interception.

### Installation

```bash
npm install -g node-version-use
export PATH="$HOME/.nvu/bin:$PATH"  # Add to shell profile
```

### Quick Start

```bash
nvu default 20           # Set global default
nvu local 18             # Set project version (.nvmrc)
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
const results = await nvu('>=0.8', 'node', ['--version'], { stdio: 'inherit' });
```

### Uninstall

```bash
nvu teardown           # Remove ~/.nvu/bin
rm -rf ~/.nvu          # Remove all data
```

### Compatibility

- macOS (arm64, x64)
- Linux (arm64, x64)
- Windows (arm64, x64)

Compatible with `.nvmrc` files from nvm, fnm, and other tools.
