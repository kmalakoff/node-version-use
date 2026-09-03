# Contributions

Internal documentation for maintainers.

## Publishing

The Go binary ships in six per-platform packages, `nvu-<platform>-<arch>`, listed as
`optionalDependencies` of this package. npm selects one by `os`/`cpu` and installs it with no
lifecycle script, which is why consumers need no `allowScripts` entry for node-version-use.

All seven packages share one version: the platform packages are generated with the parent's
version and the parent pins them exactly, so they are published together, every release.

### Release Process

1. Ensure all tests pass:
   ```bash
   npm test
   npm run test:engines
   ```

2. Bump the version. The `version` lifecycle re-pins `optionalDependencies` to the new version
   before npm writes the version commit, so the tag never carries stale pins:
   ```bash
   npm version patch  # or minor, major
   ```

3. Build the binaries and the platform packages:
   ```bash
   make -C binary all
   npm run build:platform-packages
   ```

4. Publish the platform packages. The bare command previews and writes nothing; `--execute`
   publishes, then confirms all six resolve on the registry and refuses to green-light the
   parent if any does not:
   ```bash
   npm run publish:platform-packages
   npm run publish:platform-packages -- --execute
   ```
   A failed publish leaves the ones before it published. Re-run to continue from where it stopped.

5. Publish the parent, last, and only if step 4 ended with "Publish the parent next". The parent
   pins the six exactly, so publishing it against a version that does not resolve - a failed
   publish, a rescinded version - gives every consumer on that platform an install with no binary:
   ```bash
   npm publish
   ```

6. Push the version tag:
   ```bash
   git push --follow-tags
   ```

## Development

### Testing

The binary and commands suites run against a locally built binary (requires Go). Without it they
skip, so build it first:

```bash
npm run build:binary   # builds the shims into .tmp/binary/bin
npm test               # runs all tests
npm run clean          # clear all temp files
```

### Test Isolation

Tests use the `NVU_HOME` environment variable for isolation and never touch your own `~/.nvu`:

- **Binaries:** `.tmp/binary/bin/` (built by `npm run build:binary`)
- **Test NVU_HOME:** `.tmp/commands/` or `.tmp/binary-test/`

### Binary Development (requires Go)

For local Go binary development:

```bash
# Build for current platform
cd binary && make local

# Build all platforms
cd binary && make all

# Install to ~/.nvu/bin
cd binary && make install
```

### Binary Development Workflow

1. Make changes to `binary/main.go`
2. Build the test shims: `npm run build:binary`
3. Run tests: `npm test`
4. The binary ships with the next release; it has no version of its own

## Pre-Release Smoke Test Checklist

Run through this checklist before every release:

### 1. TypeScript Compilation
```bash
npm run prepublishOnly
```
- [ ] Compiles without errors
- [ ] Creates `dist/` directory

### 2. Unit Tests (Current Node)
```bash
npm test
```
- [ ] All tests pass (53+ tests)
- [ ] No timeouts or hangs

### 3. Cross-Version Tests (CRITICAL)
```bash
nvu engines tsds test:node --no-timeouts
```
- [ ] Tests pass on Node 0.8
- [ ] Tests pass on Node 0.10
- [ ] Tests pass on Node 0.12
- [ ] Tests pass on Node 4+
- [ ] No `startsWith`/`includes` errors (use `indexOf` instead)

### 4. Platform Packages
```bash
make -C binary all && npm run build:platform-packages
npm run publish:platform-packages
```
- [ ] All 6 package directories written under `.tmp/npm/`
- [ ] Each pinned at the parent's version
- [ ] Preview lists exactly what is unpublished

### 5. Binary Build
```bash
make -C binary clean && make -C binary all
ls -la binary/build/
```
- [ ] All 6 platform binaries created:
  - `nvu-binary-darwin-arm64`
  - `nvu-binary-darwin-x64`
  - `nvu-binary-linux-x64`
  - `nvu-binary-linux-arm64`
  - `nvu-binary-win32-x64.exe`
  - `nvu-binary-win32-arm64.exe`

### 6. Binary Functionality
```bash
# Create test environment
mkdir -p .tmp/smoke-test/installed/v20.0.0/bin
echo '#!/bin/sh
echo "v20.0.0"' > .tmp/smoke-test/installed/v20.0.0/bin/node
chmod +x .tmp/smoke-test/installed/v20.0.0/bin/node
echo "20" > .tmp/smoke-test/.nvmrc
cp binary/build/nvu-binary-darwin-arm64 .tmp/smoke-test/node  # use your platform

# Test binary
cd .tmp/smoke-test && NVU_HOME=$(pwd) ./node --version
# Should output: v20.0.0
```
- [ ] Binary reads .nvmrc
- [ ] Binary finds installed version
- [ ] Binary proxies to correct node

### 7. CLI Commands
```bash
# Test help
nvu --help
nvu --version

# Test commands
nvu 22 node --version
nvu default 20
nvu local 18
nvu list
nvu which
```
- [ ] Help displays correctly
- [ ] Version matches package.json
- [ ] Commands work as expected

### 8. No "shim" References
```bash
grep -r "shim" --include="*.ts" --include="*.js" --include="*.cjs" --include="*.go" --include="*.md" . | grep -v node_modules | grep -v "os-shim"
```
- [ ] No stray "shim" references (except `os-shim` npm package)

### Common Issues to Watch For

1. **Node 0.8+ compatibility**: Never use `startsWith`, `includes`, `endsWith`, `padStart`, `padEnd` on strings/arrays. Use `indexOf` instead.

2. **Missing dependencies**: Run `npm run prepublishOnly` to catch missing deps.

3. **Binary naming**: Binaries in `~/.nvu/bin/` are named `node`, `npm`, `npx` (not `nvu-binary`).

4. **Version fields**: one `version` covers the parent and all six platform packages. Re-run
   `npm run build:platform-packages` after a bump so the `optionalDependencies` pins follow.
