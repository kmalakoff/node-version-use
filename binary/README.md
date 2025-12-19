# nvu Binary Shim

This directory contains the Go source code for the nvu binary shim. The shim is a single binary that gets copied with different names (node, npm, npx, corepack, etc.) and determines what to proxy based on its own filename.

## Architecture

### Directory Structure

```
~/.nvu/
├── bin/                    # Go binary shims
│   ├── node(.exe)          # Shim - proxies to nvu-managed node
│   ├── npm(.exe)           # Shim - proxies to nvu-managed npm
│   ├── npx(.exe)           # Shim - proxies to nvu-managed npx
│   ├── corepack(.exe)      # Shim - proxies to nvu-managed corepack
│   ├── tsc(.exe)           # Shim - created after npm install -g typescript
│   └── nvu(.exe)           # Shim - special handling, runs nvu CLI
├── installed/
│   ├── v18.20.8/
│   │   ├── bin/            # Unix: actual binaries
│   │   │   ├── node
│   │   │   ├── npm
│   │   │   └── tsc         # Created by npm install -g typescript
│   │   ├── node.exe        # Windows: node binary at root
│   │   ├── npm.cmd         # Windows: npm wrapper at root
│   │   └── lib/
│   │       └── node_modules/
│   │           └── node-version-use/
│   │               └── bin/
│   │                   └── cli.js    # The actual nvu CLI script
│   └── v24.12.0/
│       └── ...
└── default                 # File containing default version (e.g., "24")
```

### How the Shim Works

The shim is a single Go binary. When executed, it:

1. **Determines its role** from its own filename (`os.Args[0]`):
   ```go
   execName := filepath.Base(os.Args[0])  // "node", "npm", "nvu", etc.
   ```

2. **Special case for `nvu`**: If `execName == "nvu"`, calls `runNvuCli()` which finds and executes the nvu CLI script via node.

3. **Resolves Node version** by checking (in order):
   - `.nvurc` in current directory or parents
   - `.nvmrc` in current directory or parents
   - `~/.nvu/default` file

4. **Finds the real binary** at `~/.nvu/installed/<version>/bin/<execName>`

5. **Execs the real binary**, replacing the shim process

### Global Package Shim Creation

When `npm install -g <package>` runs through the npm shim:

1. The shim proxies to the real npm
2. npm installs the package and creates binaries in the Node version's bin directory
3. After npm exits, `runNpmAndCreateShims()` runs
4. It detects new binaries and copies the Go shim to `~/.nvu/bin/<name>`
5. Now the globally installed package is accessible via shim

**Skipped binaries**: `node`, `npm`, `npx`, `corepack` are never overwritten (they're the core shims).

## Installation Patterns

### macOS Bootstrap

```bash
# 1. Install system Node (provides initial node/npm)
brew install node

# 2. Install nvu globally
#    - Installs to /opt/homebrew/lib/node_modules/node-version-use/
#    - Creates symlink /opt/homebrew/bin/nvu -> ../lib/node_modules/.../cli.js
#    - postinstall downloads Go shims to ~/.nvu/bin/
npm install -g node-version-use

# 3. Add shims to PATH (in ~/.zshrc or ~/.bashrc)
#    MUST be before /opt/homebrew/bin so shims take precedence
export PATH="$HOME/.nvu/bin:$PATH"

# 4. Restart terminal or source profile

# 5. Install and set default Node version
nvu install 20
nvu default 20
```

**After bootstrap:**
- `which nvu` → `/opt/homebrew/bin/nvu` (npm symlink, runs via system node)
- `which node` → `~/.nvu/bin/node` (Go shim, runs nvu-managed node)

### Windows Bootstrap

```powershell
# 1. Install system Node from https://nodejs.org

# 2. Install nvu globally
#    - Installs to %APPDATA%\npm\node_modules\node-version-use\
#    - Creates %APPDATA%\npm\nvu.cmd wrapper
#    - postinstall downloads Go shims to ~/.nvu/bin/
npm install -g node-version-use

# 3. Add to PowerShell profile ($PROFILE)
#    Need BOTH paths: shims AND npm global bin
$env:PATH = "$HOME\.nvu\bin;$env:APPDATA\npm;$env:PATH"

# 4. Restart terminal

# 5. Install and set default Node version
nvu install 20
nvu default 20
```

**Why two PATH entries on Windows:**
- `~/.nvu/bin` - Go shims for node/npm/npx version switching
- `%APPDATA%\npm` - Where npm installs global package binaries (including nvu.cmd)

On macOS, `/opt/homebrew/bin` is typically already in PATH. On Windows, `%APPDATA%\npm` often isn't.

## Scenario Walkthroughs

### Running `node --version`

```
1. Shell finds ~/.nvu/bin/node (Go shim)
2. Shim: execName = "node"
3. Shim: resolveVersion() → reads ~/.nvu/default → "24"
4. Shim: findBinary("node", "24") → ~/.nvu/installed/v24.12.0/bin/node
5. Shim: execBinary() replaces process with real node
6. Output: v24.12.0
```

### Running `nvu list` (when nvu shim exists)

```
1. Shell finds ~/.nvu/bin/nvu (Go shim)
2. Shim: execName = "nvu"
3. Shim: runNvuCli() called (special case)
4. findNodeForNvu() → ~/.nvu/installed/v24.12.0/bin/node
5. findNvuScript() → ~/.nvu/installed/v24.12.0/lib/node_modules/node-version-use/bin/cli.js
6. Shim: exec node cli.js list
7. Output: list of installed versions
```

### Running `nvu list` (no shim, using npm's nvu)

```
1. Shell finds /opt/homebrew/bin/nvu (symlink to cli.js)
2. System node executes cli.js directly
3. Output: list of installed versions
```

### Running `npm install -g typescript`

```
1. Shell finds ~/.nvu/bin/npm (Go shim)
2. Shim: execName = "npm", detects global install
3. Shim: proxies to ~/.nvu/installed/v24.12.0/bin/npm
4. npm installs typescript to v24's node_modules
5. npm creates ~/.nvu/installed/v24.12.0/bin/tsc
6. Shim: runNpmAndCreateShims() runs after npm exits
7. Shim: sees new "tsc" binary, copies Go shim to ~/.nvu/bin/tsc
8. Now `tsc --version` works via shim
```

### Switching default version

```
1. User runs: nvu default 18
2. nvu writes "18" to ~/.nvu/default
3. User runs: node --version
4. Shim reads ~/.nvu/default → "18"
5. Shim finds ~/.nvu/installed/v18.20.8/bin/node
6. Output: v18.20.8
```

### Reinstalling/upgrading nvu

```
1. User runs: npm install -g node-version-use
2. Goes through ~/.nvu/bin/npm shim
3. npm updates node-version-use in current Node version
4. npm creates/updates bin/nvu in that Node version
5. runNpmAndCreateShims() copies Go shim to ~/.nvu/bin/nvu
6. User runs: nvu list
7. Go shim handles execName="nvu" via runNvuCli()
8. Works correctly (finds and runs the CLI script)
```

## Special Handling

### The `nvu` Command

The nvu shim requires special handling because:
- nvu is an npm package, not a Node core binary
- The binary in Node's bin dir is a symlink/script to cli.js
- We can't just exec it directly like we do with node/npm/npx

Solution: `runNvuCli()` finds the CLI script and runs it via node:
```go
if execName == "nvu" {
    nodePath := findNodeForNvu()      // Find any available node
    scriptPath := findNvuScript()      // Find cli.js in node_modules
    exec(nodePath, scriptPath, args)   // Run: node cli.js <args>
}
```

`findNvuScript()` searches in order:
1. `~/.nvu/installed/*/lib/node_modules/node-version-use/bin/cli.js` (nvu-managed)
2. System npm prefix locations
3. Common global npm paths (`%APPDATA%\npm`, `/usr/local/lib/node_modules`, etc.)

### Core Binary Protection

These binaries are never overwritten by shim creation:
- `node` - core Node.js binary
- `npm` - core package manager
- `npx` - core package runner
- `corepack` - core package manager manager

### Bootstrapping (No Node Installed Yet)

When running nvu CLI but no nvu-managed Node versions exist:
1. Shim falls back to system node (found via PATH, excluding ~/.nvu/bin)
2. If no system node, prints helpful error with bootstrap instructions

## Building

```bash
# Build for current platform
go build -o nvu .

# Cross-compile
GOOS=darwin GOARCH=arm64 go build -o nvu-darwin-arm64 .
GOOS=darwin GOARCH=amd64 go build -o nvu-darwin-amd64 .
GOOS=linux GOARCH=amd64 go build -o nvu-linux-amd64 .
GOOS=linux GOARCH=arm64 go build -o nvu-linux-arm64 .
GOOS=windows GOARCH=amd64 go build -o nvu-win32-x64.exe .

# Test
./nvu --version  # Should find and run nvu CLI
```

## Platform Differences

| Aspect | macOS/Linux | Windows |
|--------|-------------|---------|
| Shim extension | none | `.exe` |
| npm global location | `<prefix>/lib/node_modules` | `<prefix>/node_modules` |
| npm global bin | `<prefix>/bin` | `%APPDATA%\npm` |
| Node bin location | `<version>/bin/node` | `<version>/node.exe` |
| npm wrapper | symlink or script | `.cmd` file |
| Process replacement | `syscall.Exec` | `exec.Command` + wait |
