## node-version-use

Cross-platform solution for using multiple versions of Node.js. Useful for compatibility testing and transparent version switching.

### Installation

```bash
npm install -g node-version-use
```

On install, nvu automatically downloads platform-specific binaries to `~/.nvu/bin/`. To enable transparent Node version switching, add to your shell profile:

```bash
# For bash (~/.bashrc) or zsh (~/.zshrc):
export PATH="$HOME/.nvu/bin:$PATH"

# For fish (~/.config/fish/config.fish):
set -gx PATH $HOME/.nvu/bin $PATH
```

### Quick Start

```bash
# Set a global default Node version
nvu default 20

# Or set a project-specific version (creates .nvmrc)
nvu local 18

# Now 'node' and 'npm' use the configured version automatically
node --version  # v20.x.x (or v18.x.x in project directory)
```

### Commands

#### Version Management

```bash
# Set global default version
nvu default 20

# Set local version for current directory (creates .nvmrc)
nvu local 18

# Install a Node version
nvu install 22

# Uninstall a Node version
nvu uninstall 22

# List installed versions
nvu list

# Show which version would be used
nvu which
```

#### Binary Management

```bash
# Install/reinstall binaries
nvu setup

# Remove binaries
nvu teardown
```

#### Run Commands with Specific Versions

```bash
# Run with a specific version
nvu 14.4.0 npm run test

# Run with highest matching major version
nvu 12 npm run test

# Run with LTS version
nvu lts npm run test

# Run with multiple versions (comma-delimited)
nvu 0.8,4,8,14 npm run test

# Run with version expression
nvu >=0.8 node --version

# Use engines.node from package.json
nvu engines node --version
```

### How It Works

nvu uses lightweight binaries that intercept `node`, `npm`, and `npx` commands. When you run `node`, the binary:

1. Checks for `.nvurc` in current/parent directories
2. Checks for `.nvmrc` in current/parent directories
3. Falls back to `~/.nvu/default`
4. Executes the matching installed Node version

This works in all contexts: terminals, IDEs, CI, scripts - without shell integration.

### Version Resolution

The binary resolves partial versions to installed versions:
- `20` matches `v20.19.6`
- `18.19` matches `v18.19.0`
- `v22` matches `v22.0.0`

### JavaScript API

```javascript
const nvu = require('node-version-use');

// Run with callback
nvu('>=0.8', 'node', ['--version'], { versions: '12', stdio: 'inherit' }, (err, results) => {
  // results is an array per-version of form {version, error, result}
});

// Run with async/await
const results = await nvu('engines', 'node', ['--version'], { stdio: 'inherit' });
```

### Uninstalling

```bash
# Remove binaries
nvu teardown

# Optionally remove all nvu data
rm -rf ~/.nvu
```

Then remove the PATH line from your shell profile.

### Compatibility

- macOS (arm64, x64)
- Linux (arm64, x64)
- Windows (arm64, x64)

Compatible with `.nvmrc` files from nvm, fnm, and other version managers.
